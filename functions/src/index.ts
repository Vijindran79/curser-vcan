// Firebase Functions for Vcanship Backend API Integration
// This file handles all backend API calls to Shippo and Sea Rates APIs

import * as functions from 'firebase-functions/v1';
import * as functionsV2 from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
// import { onDocumentCreated } from 'firebase-functions/v2/firestore'; // Commented out to avoid v1/v2 mixing
import {
    sendWelcomeEmail,
    sendBookingConfirmationEmail,
    sendTrackingUpdateEmail,
    sendPasswordResetEmail
} from './emailService';

// Initialize Firebase Admin - Uses Application Default Credentials (ADC) automatically
// When deployed to Firebase, credentials are automatically provided
// No manual service account key needed
try {
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }
} catch (error) {
    console.error('Firebase Admin initialization error:', error);
    // Continue even if initialization fails - will retry when functions are called
}

// Lazy initialization of Firestore to avoid blocking module load
let dbInstance: admin.firestore.Firestore | null = null;
function getDb(): admin.firestore.Firestore {
    if (!dbInstance) {
        if (admin.apps.length === 0) {
            admin.initializeApp();
        }
        dbInstance = admin.firestore();
    }
    return dbInstance;
}

// ==========================================
// SUBSCRIPTION & CACHE MANAGEMENT
// ==========================================

/**
 * Check if user has active subscription
 */
async function checkUserSubscription(userEmail: string): Promise<boolean> {
    try {
        if (userEmail === 'anonymous') return false;
        
        const userDoc = await getDb().collection('users').doc(userEmail).get();
        if (!userDoc.exists) return false;
        
        const userData = userDoc.data();
        const subscriptionTier = userData?.subscriptionTier || 'free';
        const subscriptionExpiry = userData?.subscriptionExpiry?.toDate();
        
        // Check if subscription is active (Pro tier and not expired)
        if (subscriptionTier === 'pro' && subscriptionExpiry && subscriptionExpiry > new Date()) {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}

/**
 * Get monthly Sea Rates API calls count (for free tier limit: 50/month)
 */
async function getMonthlySeaRatesCalls(): Promise<number> {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const statsDoc = await getDb().collection('api_stats').doc('sea_rates_monthly').get();
        if (!statsDoc.exists) return 0;
        
        const stats = statsDoc.data();
        if (stats?.month !== monthStart.getTime()) {
            // New month, reset count
            return 0;
        }
        
        return stats?.count || 0;
    } catch (error) {
        console.error('Error getting monthly calls:', error);
        return 0;
    }
}

/**
 * Increment monthly Sea Rates API calls count
 */
async function incrementMonthlySeaRatesCalls(): Promise<void> {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const statsRef = getDb().collection('api_stats').doc('sea_rates_monthly');
        const statsDoc = await statsRef.get();
        
        if (!statsDoc.exists || statsDoc.data()?.month !== monthStart.getTime()) {
            // New month, start fresh
            await statsRef.set({
                month: monthStart.getTime(),
                count: 1,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Increment existing count
            await statsRef.update({
                count: admin.firestore.FieldValue.increment(1),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error incrementing monthly calls:', error);
    }
}

/**
 * Cache Sea Rates API results (refresh every 4 hours to maximize 50 calls/month)
 * TODO: Implement caching in getSeaRates function when ready
 */
// async function cacheSeaRates(cacheKey: string, quotes: SeaRatesQuote[]): Promise<void> {
//     try {
//         await db.collection('sea_rates_cache').doc(cacheKey).set({
//             quotes: quotes,
//             timestamp: admin.firestore.FieldValue.serverTimestamp(),
//             expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now
//         });
//     } catch (error) {
//         console.error('Error caching Sea Rates:', error);
//     }
// }

/**
 * Get cached Sea Rates data
 */
async function getCachedSeaRates(cacheKey: string): Promise<{ quotes: SeaRatesQuote[], timestamp: Date } | null> {
    try {
        const cacheDoc = await getDb().collection('sea_rates_cache').doc(cacheKey).get();
        if (!cacheDoc.exists) return null;
        
        const cacheData = cacheDoc.data();
        return {
            quotes: cacheData?.quotes || [],
            timestamp: cacheData?.timestamp?.toDate() || new Date()
        };
    } catch (error) {
        console.error('Error getting cached Sea Rates:', error);
        return null;
    }
}

/**
 * Check if cache is expired (older than 4 hours)
 */
function isExpired(timestamp: Date, maxAge: number): boolean {
    return Date.now() - timestamp.getTime() > maxAge;
}

// ==========================================
// SHIPPO API (Parcel Service)
// ==========================================

interface ShippoQuoteRequest {
    origin: string;
    destination: string;
    weight_kg: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
    parcel_type?: string;
    currency: string;
}

interface ShippoQuote {
    carrier: string;
    service_name: string;
    service_type: string;
    rate: number;
    price: number;
    estimated_days: number;
    estimated_delivery: string;
    fuel_surcharge?: number;
    customs?: number;
}

/**
 * Fetches real parcel quotes from Shippo API
 * Function name: get-shippo-quotes
 */
export const getShippoQuotes = functions.https.onCall(async (data: ShippoQuoteRequest, context) => {
    try {
        // Get Shippo API key from environment variable ONLY
        const shippoApiKey = process.env.SHIPPO_API_KEY;
        
        if (!shippoApiKey) {
            throw new functions.https.HttpsError('failed-precondition', 'Shippo API key not configured.');
        }
        
        const { origin, destination, weight_kg, dimensions } = data;
        
        // Parse addresses using Geoapify for better accuracy
        const addressFrom = await parseAddress(origin);
        const addressTo = await parseAddress(destination);
        
        // Create shipment in Shippo
        const shipmentResponse = await fetch('https://api.goshippo.com/shipments', {
            method: 'POST',
            headers: {
                'Authorization': `ShippoToken ${shippoApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                address_from: addressFrom,
                address_to: addressTo,
                parcels: [{
                    weight: `${weight_kg}`,
                    weight_unit: 'kg',
                    length: `${dimensions?.length || 10}`,
                    width: `${dimensions?.width || 10}`,
                    height: `${dimensions?.height || 10}`,
                    distance_unit: 'cm'
                }],
                async: false
            })
        });
        
        if (!shipmentResponse.ok) {
            const errorData = await shipmentResponse.json();
            console.error('Shippo shipment error:', errorData);
            throw new functions.https.HttpsError('internal', `Shippo API error: ${errorData.detail || shipmentResponse.statusText}`);
        }
        
        const shipmentData = await shipmentResponse.json();
        
        // Get rates for the shipment
        const ratesResponse = await fetch(`https://api.goshippo.com/rates/${shipmentData.object_id}`, {
            method: 'GET',
            headers: {
                'Authorization': `ShippoToken ${shippoApiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!ratesResponse.ok) {
            const errorData = await ratesResponse.json();
            console.error('Shippo rates error:', errorData);
            throw new functions.https.HttpsError('internal', `Shippo rates API error: ${errorData.detail || ratesResponse.statusText}`);
        }
        
        const ratesData = await ratesResponse.json();
        
        // Transform Shippo rates to our Quote format
        const quotes: ShippoQuote[] = (ratesData.results || []).map((rate: any) => ({
            carrier: rate.provider || 'Unknown',
            service_name: rate.servicelevel?.name || rate.servicelevel?.token || 'Standard',
            service_type: rate.servicelevel?.token || 'standard',
            rate: parseFloat(rate.amount) || 0,
            price: parseFloat(rate.amount) || 0,
            estimated_days: rate.estimated_days || 5,
            estimated_delivery: rate.estimated_delivery || `${rate.estimated_days || 5} business days`,
            fuel_surcharge: parseFloat(rate.attributes?.fuel_surcharge) || 0,
            customs: parseFloat(rate.attributes?.customs) || 0
        }));
        
        return {
            success: true,
            quotes: quotes
        };
        
    } catch (error: any) {
        console.error('Shippo API error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to fetch Shippo quotes: ${error.message}`);
    }
});

// Helper function to parse address string to Shippo format
function parseAddress(addressString: string): any {
    // This is a simplified parser - you may need a more sophisticated address parser
    // For now, it creates a basic address structure
    // In production, you might want to use a geocoding service
    
    const parts = addressString.split(',').map(p => p.trim());
    
    return {
        name: 'Recipient',
        street1: parts[0] || addressString,
        city: parts[parts.length - 3] || '',
        state: parts[parts.length - 2] || '',
        zip: parts[parts.length - 1]?.match(/\d+/)?.[0] || '',
        country: extractCountry(addressString) || 'US',
        phone: '',
        email: ''
    };
}

function extractCountry(address: string): string {
    // Try to extract country code from address
    const countryCodes: { [key: string]: string } = {
        'usa': 'US', 'united states': 'US', 'us': 'US',
        'uk': 'GB', 'united kingdom': 'GB', 'gb': 'GB',
        'canada': 'CA', 'ca': 'CA',
        'australia': 'AU', 'au': 'AU',
        'germany': 'DE', 'de': 'DE',
        'france': 'FR', 'fr': 'FR',
        'china': 'CN', 'cn': 'CN',
        'japan': 'JP', 'jp': 'JP',
        'korea': 'KR', 'kr': 'KR',
        'india': 'IN', 'in': 'IN'
    };
    
    const lowerAddress = address.toLowerCase();
    for (const [key, code] of Object.entries(countryCodes)) {
        if (lowerAddress.includes(key)) {
            return code;
        }
    }
    
    return 'US'; // Default to US
}

// ==========================================
// SEA RATES API (FCL/LCL/Train/Air/Bulk)
// ==========================================

interface SeaRatesQuoteRequest {
    service_type: 'fcl' | 'lcl' | 'train' | 'air' | 'bulk';
    origin: string;
    destination: string;
    containers?: Array<{ type: string; quantity: number }>;
    cargo?: {
        description: string;
        weight?: number;
        volume?: number;
        hsCode?: string;
    };
    currency: string;
}

interface SeaRatesQuote {
    carrier: string;
    carrier_name: string;
    total_rate: number;
    price: number;
    ocean_freight?: number;
    base_rate?: number;
    baf?: number;
    fuel_surcharge?: number;
    customs?: number;
    duties?: number;
    service_fee?: number;
    transit_time?: string;
    estimated_days?: number;
}

/**
 * Fetches real sea freight rates from Sea Rates API
 * Function name: get-sea-rates
 */
export const getSeaRates = functions.https.onCall(async (data: SeaRatesQuoteRequest, context) => {
    try {
        // Get Sea Rates API credentials from environment variables ONLY
        const seaRatesApiKey = process.env.SEARATES_API_KEY || process.env.SEA_RATES_API_KEY;
        const seaRatesApiUrl = process.env.SEA_RATES_API_URL || 'https://api.searates.com/v1';
        
        // Check subscription status for Sea Rates API (limited to 50 calls/month)
        const userEmail = context.auth?.token?.email || 'anonymous';
        const isSubscribed = await checkUserSubscription(userEmail);
        
        if (!seaRatesApiKey) {
            throw new functions.https.HttpsError('failed-precondition', 'Sea Rates API key not configured.');
        }
        
        const { service_type, origin, destination, containers, cargo, currency } = data;
        
        // Check if we can use cached data (refresh every 4 hours to maximize 50 calls/month)
        const cacheKey = `sea_rates_${service_type}_${origin}_${destination}_${JSON.stringify(containers || [])}_${currency}`;
        const cachedData = await getCachedSeaRates(cacheKey);
        
        if (cachedData && !isExpired(cachedData.timestamp, 4 * 60 * 60 * 1000)) { // 4 hours in milliseconds
            console.log('Returning cached Sea Rates data');
            return {
                success: true,
                quotes: cachedData.quotes,
                cached: true,
                subscription_required: !isSubscribed
            };
        }
        
        // Check API call limit for non-subscribers (50 calls/month)
        if (!isSubscribed) {
            const monthlyCalls = await getMonthlySeaRatesCalls();
            if (monthlyCalls >= 50) {
                // Return cached data even if expired, or use AI estimates
                if (cachedData) {
                    console.log('API limit reached, returning expired cache');
                    return {
                        success: true,
                        quotes: cachedData.quotes,
                        cached: true,
                        expired: true,
                        subscription_required: true,
                        message: 'Free tier limit reached. Upgrade to Pro for unlimited real-time rates.'
                    };
                }
                throw new functions.https.HttpsError('resource-exhausted', 'Monthly API limit reached. Please upgrade to Pro subscription for unlimited access.');
            }
            await incrementMonthlySeaRatesCalls();
        }
        
        // Call Sea Rates API
        // Note: Sea Rates API format may need adjustment based on actual API documentation
        // This is a placeholder implementation - adjust endpoint and request format as needed
        const requestBody: any = {
            service_type, // 'fcl', 'lcl', 'train', 'air', 'bulk'
            origin_port: origin,
            destination_port: destination,
            currency: currency.toUpperCase()
        };
        
        if (containers && containers.length > 0) {
            requestBody.containers = containers.map(c => ({
                container_type: c.type,
                quantity: c.quantity
            }));
        }
        
        if (cargo) {
            requestBody.cargo = {
                description: cargo.description,
                weight_kg: cargo.weight,
                volume_cbm: cargo.volume,
                hs_code: cargo.hsCode
            };
        }
        
        const response = await fetch(`${seaRatesApiUrl}/quotes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${seaRatesApiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                console.error('Sea Rates API error response:', errorData);
                errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
                // Include full error data in console for debugging
                console.error('Full error data:', JSON.stringify(errorData, null, 2));
            } catch (e) {
                // If response isn't JSON, get text
                const errorText = await response.text().catch(() => response.statusText);
                console.error('Sea Rates API non-JSON error:', errorText);
                errorMessage = errorText || errorMessage;
            }
            throw new functions.https.HttpsError('internal', `Sea Rates API error: ${errorMessage}`);
        }
        
        let apiData: any;
        try {
            apiData = await response.json();
            console.log('Sea Rates API response received:', {
                hasQuotes: !!(apiData.quotes || apiData.data?.quotes),
                quoteCount: (apiData.quotes || apiData.data?.quotes || []).length,
                responseKeys: Object.keys(apiData)
            });
        } catch (e: any) {
            console.error('Failed to parse Sea Rates API response as JSON:', e);
            const responseText = await response.text();
            console.error('Response text:', responseText);
            throw new functions.https.HttpsError('internal', `Sea Rates API returned invalid JSON: ${e.message}`);
        }
        
        // Transform Sea Rates API response to our Quote format
        // Adjust this mapping based on your Sea Rates API response structure
        const rawQuotes = apiData.quotes || apiData.data?.quotes || apiData.results || [];
        
        if (!Array.isArray(rawQuotes) || rawQuotes.length === 0) {
            console.warn('Sea Rates API returned no quotes. Response:', JSON.stringify(apiData, null, 2));
            // Return empty array instead of error - let frontend fall back to AI
            return {
                success: true,
                quotes: [],
                message: 'No quotes available from Sea Rates API. Using AI estimates.',
                fallback_required: true
            };
        }
        
        const quotes: SeaRatesQuote[] = rawQuotes.map((quote: any) => ({
            carrier: quote.carrier_name || quote.carrier || 'Ocean Carrier',
            carrier_name: quote.carrier_name || quote.carrier || 'Ocean Carrier',
            total_rate: parseFloat(quote.total_rate || quote.price || quote.freight || 0),
            price: parseFloat(quote.total_rate || quote.price || quote.freight || 0),
            ocean_freight: parseFloat(quote.ocean_freight || quote.base_freight || 0),
            base_rate: parseFloat(quote.base_rate || quote.ocean_freight || 0),
            baf: parseFloat(quote.baf || quote.fuel_surcharge || 0),
            fuel_surcharge: parseFloat(quote.fuel_surcharge || quote.baf || 0),
            customs: parseFloat(quote.customs || quote.duties || 0),
            duties: parseFloat(quote.duties || quote.customs || 0),
            service_fee: parseFloat(quote.service_fee || 0),
            transit_time: quote.transit_time || quote.estimated_transit || `${quote.estimated_days || 20} days`,
            estimated_days: quote.estimated_days || parseInt(quote.transit_time?.match(/\d+/)?.[0] || '20')
        }));
        
        // Cache the results for 4 hours to maximize 50 API calls/month (12.5 days per call)
        try {
            await getDb().collection('sea_rates_cache').doc(cacheKey).set({
                quotes: quotes,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
                service_type: service_type,
                origin: origin,
                destination: destination
            });
            console.log('Successfully cached Sea Rates quotes');
        } catch (cacheError) {
            console.error('Failed to cache Sea Rates quotes (non-fatal):', cacheError);
            // Don't throw - caching failure shouldn't fail the request
        }
        
        return {
            success: true,
            quotes: quotes,
            cached: false,
            subscription_required: !isSubscribed
        };
        
    } catch (error: any) {
        console.error('Sea Rates API error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            name: error.name
        });
        
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        
        // Provide more detailed error message
        const errorMessage = error.message || 'Unknown error occurred';
        const errorDetails = error.code ? `Error code: ${error.code}. ` : '';
        throw new functions.https.HttpsError('internal', `Failed to fetch sea rates: ${errorDetails}${errorMessage}`);
    }
});

// ==========================================
// EMAIL INQUIRY SERVICE
// ==========================================

interface QuoteInquiryRequest {
    service_type: string;
    quotes: any[];
    customer: {
        name: string;
        email: string;
        phone?: string;
    };
    shipment: any;
    selected_quote?: any;
}

/**
 * Sends quote inquiry email and saves to Firestore
 * Function name: send-quote-inquiry
 */
export const sendQuoteInquiry = functions.https.onCall(async (data: QuoteInquiryRequest, context) => {
    try {
        const { service_type, quotes, customer, shipment, selected_quote } = data;
        
        // Save to Firestore
        await getDb().collection('quote_inquiries').add({
            service_type,
            quotes,
            customer,
            shipment,
            selected_quote,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            user_email: context.auth?.token?.email || 'anonymous'
        });
        
        // Send email notification
        // Option 1: Using Firestore triggers (recommended for production)
        // Option 2: Send email directly here (requires email service like SendGrid)
        
        // For now, we'll trigger an email via Firestore document creation
        // You can set up a Firestore trigger to send emails
        
        // Optional: Send email directly if you have SendGrid/Nodemailer configured
        // Uncomment and configure if you want immediate email sending
        
        /*
        const sgMail = require('@sendgrid/mail');
        // SendGrid API key - using environment variable only (functions.config() deprecated in v2)
        const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
        
        if (SENDGRID_API_KEY) {
            sgMail.setApiKey(SENDGRID_API_KEY);
            
            const emailContent = `
                New Quote Inquiry Received:
                
                Service Type: ${service_type.toUpperCase()}
                
                Customer Details:
                - Name: ${customer.name}
                - Email: ${customer.email}
                ${customer.phone ? `- Phone: ${customer.phone}` : ''}
                
                Shipment Details:
                ${JSON.stringify(shipment, null, 2)}
                
                Quotes Received: ${quotes.length}
                ${selected_quote ? `Selected Quote: ${selected_quote.carrierName} - $${selected_quote.totalCost}` : 'No quote selected'}
                
                ${shipment.customer_message ? `Additional Message: ${shipment.customer_message}` : ''}
            `;
            
            await sgMail.send({
                to: 'vg@vcanresources.com',
                from: 'noreply@vcanship.com',
                subject: `New ${service_type.toUpperCase()} Quote Inquiry from ${customer.name}`,
                text: emailContent,
                html: emailContent.replace(/\n/g, '<br>')
            });
        }
        */
        
        return {
            success: true,
            message: 'Inquiry sent successfully. We will contact you within 24 hours.'
        };
        
    } catch (error: any) {
        console.error('Send inquiry error:', error);
        throw new functions.https.HttpsError('internal', `Failed to send inquiry: ${error.message}`);
    }
});

// ==========================================
// HS CODE GENERATION SERVICE
// ==========================================

interface HSCodeRequest {
    description: string;
}

/**
 * Generates HS Code suggestions using AI
 * Function name: get-hs-code
 */
export const getHsCode = functions.https.onCall(async (data: HSCodeRequest, context) => {
    try {
        const { description } = data;
        
        if (!description || description.trim().length < 3) {
            throw new functions.https.HttpsError('invalid-argument', 'Item description must be at least 3 characters');
        }
        
        // Use Gemini API to generate HS code suggestions
        // You can integrate with Gemini API here or use a simpler rule-based approach
        // For now, return basic suggestions based on keywords
        
        const descriptionLower = description.toLowerCase();
        const suggestions: { code: string; description: string }[] = [];
        
        // Basic keyword matching for common items
        if (descriptionLower.includes('clothing') || descriptionLower.includes('garment') || descriptionLower.includes('apparel')) {
            suggestions.push({ code: '6203.42', description: 'Men\'s or boys\' trousers' });
            suggestions.push({ code: '6204.62', description: 'Women\'s or girls\' trousers' });
            suggestions.push({ code: '6109.10', description: 'Cotton t-shirts' });
        }
        
        if (descriptionLower.includes('electronic') || descriptionLower.includes('device') || descriptionLower.includes('phone')) {
            suggestions.push({ code: '8517.12', description: 'Telephone sets' });
            suggestions.push({ code: '8543.70', description: 'Electronic integrated circuits' });
        }
        
        if (descriptionLower.includes('cosmetic') || descriptionLower.includes('makeup') || descriptionLower.includes('perfume')) {
            suggestions.push({ code: '3303.00', description: 'Perfumes and toilet waters' });
            suggestions.push({ code: '3304.30', description: 'Beauty or make-up preparations' });
        }
        
        if (descriptionLower.includes('food') || descriptionLower.includes('beverage') || descriptionLower.includes('chocolate')) {
            suggestions.push({ code: '1806.32', description: 'Chocolate and other food preparations' });
            suggestions.push({ code: '2201.10', description: 'Waters, including natural or artificial mineral waters' });
        }
        
        // If no specific matches, return general categories
        if (suggestions.length === 0) {
            suggestions.push({ code: '9999.99', description: 'General merchandise - please specify item type for accurate HS code' });
        }
        
        return {
            success: true,
            suggestions: suggestions.slice(0, 5) // Return top 5 suggestions
        };
        
    } catch (error: any) {
        console.error('HS Code generation error:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to generate HS code: ${error.message}`);
    }
});

// ==========================================
// FIRESTORE TRIGGERS (Optional - for email notifications)
// ==========================================

/**
 * Firestore trigger to send emails when inquiry is created
 * COMMENTED OUT: Using v1 functions to avoid v1/v2 mixing deployment timeout
 */
// export const onQuoteInquiryCreated = onDocumentCreated('quote_inquiries/{inquiryId}', async (event) => {
//     const inquiry = event.data?.data();
//     const inquiryId = event.params.inquiryId;
//     
//     // Log inquiry creation
//     console.log('New quote inquiry created:', inquiryId);
//     
//     // You can add email notification here (SendGrid, AWS SES, etc.)
//     // For now, we'll just log it
//     console.log('Inquiry details:', {
//         service_type: inquiry?.service_type,
//         customer: inquiry?.customer,
//         quotes_count: inquiry?.quotes?.length || 0
//     });
// });

// Export subscription functions from subscription.ts
// COMMENTED OUT: subscription.ts uses v2, causes deployment timeout when mixed with v1
// export { createSubscriptionCheckout, cancelSubscription, stripeWebhook } from './subscription';

// ==========================================
// PAYMENT INTENT
// ==========================================

import Stripe from 'stripe';

// Use environment variable from .env file or Firebase Console
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe | null {
    if (!stripeInstance) {
        try {
            // Use environment variable - loaded from .env file or Firebase Console
            const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
            
            if (stripeSecretKey) {
                const maskedKey = stripeSecretKey.substring(0, 12) + '...' + stripeSecretKey.substring(stripeSecretKey.length - 4);
                console.log(`[getStripe] Initializing Stripe: ${maskedKey}`);
                stripeInstance = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
            } else {
                console.error('[getStripe] No Stripe key found - STRIPE_SECRET_KEY environment variable not set');
                return null;
            }
        } catch (error) {
            console.error('[getStripe] Failed to initialize Stripe:', error);
            return null;
        }
    }
    return stripeInstance;
}

/**
 * Create a Stripe Payment Intent for one-time payments (shipment bookings)
 * Function name: createPaymentIntent - V2 with Express and CORS support
 */

// Create Express app for createPaymentIntent
const createPaymentIntentApp = express();

// Configure CORS with explicit headers
createPaymentIntentApp.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
createPaymentIntentApp.use(express.json());

// Handle OPTIONS preflight requests
createPaymentIntentApp.options('*', (_, res) => {
    res.status(204).send();
});

// Health check endpoint
createPaymentIntentApp.get('/', (_, res) => {
    res.send('Vcanship Payment Service - OK');
});

// Main payment intent creation endpoint
createPaymentIntentApp.post('/', async (req, res) => {
    console.log('[createPaymentIntent] Function called with data:', JSON.stringify(req.body));
    
    try {
        const stripe = getStripe();
        if (!stripe) {
            console.error('[createPaymentIntent] Stripe instance is null - API key not found');
            return res.status(500).json({ 
                error: 'failed-precondition', 
                message: 'Stripe API key not configured. Please set STRIPE_SECRET_KEY environment variable.' 
            });
        }
        
        console.log('[createPaymentIntent] Stripe initialized successfully');
        
        const { amount, currency, description } = req.body;
        
        if (!amount || !currency) {
            console.error('[createPaymentIntent] Missing required fields:', { amount, currency });
            return res.status(400).json({ 
                error: 'invalid-argument', 
                message: 'Amount and currency are required' 
            });
        }
        
        console.log('[createPaymentIntent] Creating payment intent:', { amount, currency, description });
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency.toLowerCase(),
            description: description || 'Vcanship Shipment',
            automatic_payment_methods: {
                enabled: true,
            },
        });

        console.log('[createPaymentIntent] Payment intent created successfully:', paymentIntent.id);
        
        return res.status(200).json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error: any) {
        console.error('[createPaymentIntent] Error details:', {
            message: error.message,
            code: error.code,
            type: error.type,
            raw: error,
            stack: error.stack
        });
        
        // For Stripe errors, provide more specific error messages
        if (error.type && error.type.startsWith('Stripe')) {
            const errorMessage = error.message || 'Stripe API error occurred';
            console.error('[createPaymentIntent] Stripe API error:', errorMessage);
            return res.status(500).json({ 
                error: 'failed-precondition', 
                message: `Stripe error: ${errorMessage}` 
            });
        }
        
        // Check for Stripe error objects (they have specific structure)
        if (error.raw && error.raw.message) {
            const errorMessage = error.raw.message || error.message || 'Stripe error occurred';
            console.error('[createPaymentIntent] Stripe raw error:', errorMessage);
            return res.status(500).json({ 
                error: 'failed-precondition', 
                message: `Payment error: ${errorMessage}` 
            });
        }
        
        // Generic error - include full error message for debugging
        const errorMessage = error.message || error.toString() || 'Unknown error occurred';
        console.error('[createPaymentIntent] Generic error:', errorMessage);
        return res.status(500).json({ 
            error: 'internal', 
            message: `Failed to create payment intent: ${errorMessage}` 
        });
    }
});

// Export as V2 HTTP function
export const createPaymentIntent = functionsV2.onRequest({ 
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    invoker: 'public' // Allow all users to call this function
}, createPaymentIntentApp);


// ==========================================
// EMAIL NOTIFICATIONS
// ==========================================

/**
 * Send booking confirmation email
 * This function sends an email to the customer after successful booking
 */
const sendBookingEmailApp = express();
sendBookingEmailApp.use(cors({ origin: true }));
sendBookingEmailApp.use(express.json());

sendBookingEmailApp.post('/', async (req, res) => {
    try {
        const { 
            recipientEmail, 
            recipientName,
            trackingId, 
            service, 
            origin, 
            destination, 
            carrier,
            transitTime,
            weight,
            totalCost,
            currency
        } = req.body;

        if (!recipientEmail || !trackingId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Send actual email using AWS SES
        const emailSent = await sendBookingConfirmationEmail(
            recipientEmail,
            {
                trackingId,
                recipientName: recipientName || 'Valued Customer',
                origin: origin || '',
                destination: destination || '',
                weight: weight || 0,
                carrier: carrier || '',
                service: service || 'Standard',
                transitTime: transitTime || '3-5 business days',
                totalCost: totalCost || 0,
                currency: currency || 'USD'
            }
        );

        if (!emailSent) {
            throw new Error('Failed to send email via AWS SES');
        }

        // Also store notification record in Firestore for tracking
        await getDb().collection('emailNotifications').add({
            recipientEmail,
            recipientName: recipientName || 'Valued Customer',
            trackingId,
            service: service || 'parcel',
            origin: origin || '',
            destination: destination || '',
            carrier: carrier || '',
            totalCost: totalCost || 0,
            currency: currency || 'USD',
            emailType: 'booking_confirmation',
            status: 'sent',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Booking confirmation email sent to ${recipientEmail}, tracking: ${trackingId}`);

        return res.status(200).json({ 
            success: true,
            message: 'Booking confirmation email sent successfully'
        });

    } catch (error: any) {
        console.error('[sendBookingEmail] Error:', error);
        
        // Store failed email attempt for retry
        try {
            await getDb().collection('emailNotifications').add({
                recipientEmail: req.body.recipientEmail,
                trackingId: req.body.trackingId,
                emailType: 'booking_confirmation',
                status: 'failed',
                error: error.message,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (dbError) {
            console.error('[sendBookingEmail] Failed to log error:', dbError);
        }
        
        return res.status(500).json({ 
            error: 'internal', 
            message: error.message || 'Failed to send email' 
        });
    }
});

export const sendBookingEmail = functionsV2.onRequest({ 
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    invoker: 'public'
}, sendBookingEmailApp);


// ==========================================
// WELCOME EMAIL
// ==========================================

const sendWelcomeEmailApp = express();
sendWelcomeEmailApp.use(cors({ origin: true }));
sendWelcomeEmailApp.use(express.json());

sendWelcomeEmailApp.post('/', async (req, res) => {
    try {
        const { recipientEmail, recipientName } = req.body;

        if (!recipientEmail || !recipientName) {
            return res.status(400).json({ error: 'Missing recipientEmail or recipientName' });
        }

        const emailSent = await sendWelcomeEmail(recipientEmail, recipientName);

        if (!emailSent) {
            throw new Error('Failed to send welcome email via AWS SES');
        }

        // Log email sent
        await getDb().collection('emailNotifications').add({
            recipientEmail,
            recipientName,
            emailType: 'welcome',
            status: 'sent',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Welcome email sent to ${recipientEmail}`);

        return res.status(200).json({ 
            success: true,
            message: 'Welcome email sent successfully'
        });

    } catch (error: any) {
        console.error('[sendWelcomeEmail] Error:', error);
        return res.status(500).json({ 
            error: 'internal', 
            message: error.message || 'Failed to send welcome email' 
        });
    }
});

export const sendWelcomeEmailFunction = functionsV2.onRequest({ 
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    invoker: 'public'
}, sendWelcomeEmailApp);


// ==========================================
// TRACKING UPDATE EMAIL
// ==========================================

const sendTrackingUpdateEmailApp = express();
sendTrackingUpdateEmailApp.use(cors({ origin: true }));
sendTrackingUpdateEmailApp.use(express.json());

sendTrackingUpdateEmailApp.post('/', async (req, res) => {
    try {
        const { 
            recipientEmail, 
            recipientName, 
            trackingId, 
            status, 
            location, 
            timestamp,
            nextUpdate
        } = req.body;

        if (!recipientEmail || !trackingId || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const emailSent = await sendTrackingUpdateEmail(
            recipientEmail,
            {
                trackingId,
                recipientName: recipientName || 'Valued Customer',
                status,
                location: location || 'In transit',
                timestamp: timestamp || new Date().toLocaleString(),
                nextUpdate: nextUpdate || 'We will update you when your parcel reaches the next checkpoint.'
            }
        );

        if (!emailSent) {
            throw new Error('Failed to send tracking update email via AWS SES');
        }

        // Log email sent
        await getDb().collection('emailNotifications').add({
            recipientEmail,
            recipientName: recipientName || 'Valued Customer',
            trackingId,
            shipmentStatus: status,
            location,
            emailType: 'tracking_update',
            emailStatus: 'sent',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Tracking update email sent to ${recipientEmail}, tracking: ${trackingId}`);

        return res.status(200).json({ 
            success: true,
            message: 'Tracking update email sent successfully'
        });

    } catch (error: any) {
        console.error('[sendTrackingUpdateEmail] Error:', error);
        return res.status(500).json({ 
            error: 'internal', 
            message: error.message || 'Failed to send tracking update email' 
        });
    }
});

export const sendTrackingUpdateEmailFunction = functionsV2.onRequest({ 
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    invoker: 'public'
}, sendTrackingUpdateEmailApp);


// ==========================================
// PASSWORD RESET EMAIL
// ==========================================

const sendPasswordResetEmailApp = express();
sendPasswordResetEmailApp.use(cors({ origin: true }));
sendPasswordResetEmailApp.use(express.json());

sendPasswordResetEmailApp.post('/', async (req, res) => {
    try {
        const { recipientEmail, recipientName, resetLink } = req.body;

        if (!recipientEmail || !resetLink) {
            return res.status(400).json({ error: 'Missing recipientEmail or resetLink' });
        }

        const emailSent = await sendPasswordResetEmail(
            recipientEmail,
            recipientName || 'User',
            resetLink
        );

        if (!emailSent) {
            throw new Error('Failed to send password reset email via AWS SES');
        }

        // Log email sent
        await getDb().collection('emailNotifications').add({
            recipientEmail,
            recipientName: recipientName || 'User',
            emailType: 'password_reset',
            status: 'sent',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Password reset email sent to ${recipientEmail}`);

        return res.status(200).json({ 
            success: true,
            message: 'Password reset email sent successfully'
        });

    } catch (error: any) {
        console.error('[sendPasswordResetEmail] Error:', error);
        return res.status(500).json({ 
            error: 'internal', 
            message: error.message || 'Failed to send password reset email' 
        });
    }
});

export const sendPasswordResetEmailFunction = functionsV2.onRequest({ 
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    invoker: 'public'
}, sendPasswordResetEmailApp);

// ==========================================
// GOOGLE MAPS API PROXY (Secure)
// ==========================================

const googleMapsProxyApp = express();
googleMapsProxyApp.use(cors({ origin: true }));
googleMapsProxyApp.use(express.json());

/**
 * Proxy Google Maps Places Autocomplete API
 * Keeps API key secure on server side
 */
googleMapsProxyApp.get('/autocomplete', async (req, res) => {
    try {
        const { input, types } = req.query;
        
        if (!input || typeof input !== 'string') {
            return res.status(400).json({ error: 'Input parameter required' });
        }

        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || functions.config().google?.maps_api_key;
        
        if (!GOOGLE_MAPS_API_KEY) {
            console.error('Google Maps API key not configured');
            return res.status(503).json({ error: 'Maps service not configured' });
        }

        const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
        url.searchParams.append('input', input);
        url.searchParams.append('key', GOOGLE_MAPS_API_KEY);
        if (types) url.searchParams.append('types', types as string);

        const response = await fetch(url.toString());
        const data = await response.json();

        return res.status(200).json(data);

    } catch (error: any) {
        console.error('[googleMapsProxy] Autocomplete error:', error);
        return res.status(500).json({ error: 'Failed to fetch autocomplete results' });
    }
});

/**
 * Proxy Google Maps Place Details API
 */
googleMapsProxyApp.get('/place-details', async (req, res) => {
    try {
        const { place_id } = req.query;
        
        if (!place_id || typeof place_id !== 'string') {
            return res.status(400).json({ error: 'place_id parameter required' });
        }

        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || functions.config().google?.maps_api_key;
        
        if (!GOOGLE_MAPS_API_KEY) {
            console.error('Google Maps API key not configured');
            return res.status(503).json({ error: 'Maps service not configured' });
        }

        const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        url.searchParams.append('place_id', place_id);
        url.searchParams.append('key', GOOGLE_MAPS_API_KEY);
        url.searchParams.append('fields', 'address_components,formatted_address,geometry');

        const response = await fetch(url.toString());
        const data = await response.json();

        return res.status(200).json(data);

    } catch (error: any) {
        console.error('[googleMapsProxy] Place details error:', error);
        return res.status(500).json({ error: 'Failed to fetch place details' });
    }
});

export const googleMapsProxy = functionsV2.onRequest({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    invoker: 'public'
}, googleMapsProxyApp);

// ==========================================
// SEARATES API PROXY (PHASE 2)
// ==========================================

/**
 * SeaRates API Proxy Function
 * Keeps API keys secure on backend while providing frontend access
 * 
 * Endpoints supported:
 * - /logistics-explorer (FCL/LCL/Air/Rail/Road rates)
 * - /container-tracking (real-time location)
 * - /vessel-tracking (ship positions)
 * - /demurrage (port fees calculator)
 * - /distance (route calculator)
 * - /carbon-emissions (CO2 footprint)
 * - /load-calculator (3D optimization)
 * - /freight-index (market intelligence)
 */
export const seaRatesProxy = functions.https.onCall(async (data, context) => {
    try {
        const { endpoint, params, useSandbox = false } = data;

        if (!endpoint || !params) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'endpoint and params are required'
            );
        }

        // Get SeaRates API key from environment
        const SEARATES_API_KEY = process.env.SEARATES_API_KEY || 
                                 functions.config().searates?.api_key;

        if (!SEARATES_API_KEY) {
            console.warn('[SeaRates] API key not configured - Phase 2 not yet deployed');
            throw new functions.https.HttpsError(
                'failed-precondition',
                'SeaRates API not configured. Please contact support.'
            );
        }

        // Determine base URL
        const baseUrl = useSandbox 
            ? 'https://sandbox-api.searates.com/v1'
            : 'https://api.searates.com/v1';

        // Build full URL
        const url = `${baseUrl}${endpoint}`;

        console.log(`[SeaRates] Calling ${endpoint} with params:`, JSON.stringify(params).substring(0, 200));

        // Make API call with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SEARATES_API_KEY}`,
                'User-Agent': 'Vcanship/1.0'
            },
            body: JSON.stringify(params),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[SeaRates] API error (${response.status}):`, errorText);
            
            // Handle specific error codes
            if (response.status === 401) {
                throw new functions.https.HttpsError(
                    'unauthenticated',
                    'SeaRates API authentication failed'
                );
            } else if (response.status === 429) {
                throw new functions.https.HttpsError(
                    'resource-exhausted',
                    'SeaRates API quota exceeded. Please upgrade your plan.'
                );
            } else if (response.status === 404) {
                throw new functions.https.HttpsError(
                    'not-found',
                    'SeaRates endpoint not found'
                );
            }
            
            throw new functions.https.HttpsError(
                'internal',
                `SeaRates API error: ${response.statusText}`
            );
        }

        const responseData = await response.json();

        console.log(`[SeaRates] Success: ${endpoint}`);

        return {
            success: true,
            ...responseData
        };

    } catch (error: any) {
        console.error('[SeaRates] Proxy error:', error);

        if (error.name === 'AbortError') {
            throw new functions.https.HttpsError(
                'deadline-exceeded',
                'SeaRates API request timed out'
            );
        }

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError(
            'internal',
            `Failed to fetch from SeaRates: ${error.message}`
        );
    }
});

/**
 * SeaRates Health Check
 * Quick check to see if SeaRates API is configured and accessible
 */
export const seaRatesHealthCheck = functions.https.onCall(async (data, context) => {
    try {
        const SEARATES_API_KEY = process.env.SEARATES_API_KEY || 
                                 functions.config().searates?.api_key;

        return {
            available: !!SEARATES_API_KEY,
            configured: !!SEARATES_API_KEY,
            phase: SEARATES_API_KEY ? 'Phase 2 Active' : 'Phase 1 (AI Only)',
            message: SEARATES_API_KEY 
                ? 'SeaRates API is configured and ready'
                : 'SeaRates API not yet configured. Using AI estimates.'
        };
    } catch (error: any) {
        console.error('[SeaRates] Health check error:', error);
        return {
            available: false,
            configured: false,
            phase: 'Phase 1 (AI Only)',
            message: 'SeaRates API check failed'
        };
    }
});

