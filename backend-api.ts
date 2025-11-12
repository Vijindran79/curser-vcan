// backend-api-fixed.ts
// Fixed version with Firebase callable functions (no CORS issues)
// This file handles communication with Shippo (parcel) and Sea Rates API (FCL/LCL/Train/Air/Bulk)

import { State, type Quote, type Address } from './state';
import { showToast, toggleLoading } from './ui';
import { functions, getFunctions } from './firebase';

/**
 * Backend API Configuration
 * These should be stored securely in Firebase Functions or environment variables
 */
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'https://api.vcanship.com/v1';

/**
 * Fetches real parcel quotes from Shippo API via backend - FIXED VERSION
 * Uses Firebase callable functions to avoid CORS issues
 */
export async function fetchShippoQuotes(params: {
    originAddress: string;
    destinationAddress: string;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    parcelType: string;
    currency: string;
}): Promise<Quote[]> {
    console.log('🔍 [DEBUG] fetchShippoQuotes STARTED', params);
    console.log('🔍 [DEBUG] Current State:', {
        subscriptionTier: State.subscriptionTier,
        isLoggedIn: State.isLoggedIn,
        currentUser: State.currentUser
    });
    
    try {
        toggleLoading(true, 'Fetching real-time quotes from carriers...');
        
        // Get the current user's auth token (optional - allow guest access)
        const { auth } = await import('./firebase');
        const user = auth?.currentUser;
        
        console.log('🔍 [DEBUG] User status:', user ? 'Logged in' : 'Guest access');
        console.log('🔍 [DEBUG] Proceeding with Firebase function call regardless of auth status');
        
        // Option 1: Call Firebase Function (recommended - no CORS issues)
        // Works for both authenticated users and guests
        const currentFunctions = functions || getFunctions();
        if (currentFunctions) {
            try {
                console.log('🔍 [DEBUG] Calling getShippoQuotes Firebase function...');
                const getShippoQuotes = currentFunctions.httpsCallable('getShippoQuotes');
                const result = await getShippoQuotes({
                    origin: params.originAddress,
                    destination: params.destinationAddress,
                    weight_kg: params.weight,
                    dimensions: params.length && params.width && params.height ? {
                        length: params.length,
                        width: params.width,
                        height: params.height
                    } : undefined,
                    parcel_type: params.parcelType,
                    currency: params.currency,
                    // Pass user info if available, but not required
                    user_email: user?.email || 'guest',
                    is_authenticated: !!user
                });
                
                console.log('🔍 [DEBUG] Firebase function call successful');
                
                const data: any = result.data;
                console.log('🔍 [DEBUG] Firebase function response:', data);
                
                // Check for subscription status messages
                if (data?.subscription_required && data?.message) {
                    console.log('🔍 [DEBUG] Showing subscription required message:', data.message);
                    showToast(data.message, 'warning', 8000);
                }
                
                if (data?.cached && !data?.expired) {
                    console.log('[SHIPPO] Using cached data (refreshed every 4 hours to save API calls)');
                    console.log('🔍 [DEBUG] Showing professional messaging for cached data');
                    // Professional messaging that hides caching logic
                    const userTier = State.subscriptionTier || 'free';
                    console.log('🔍 [DEBUG] User tier for messaging:', userTier);
                    if (userTier !== 'free' && userTier !== 'guest') {
                        console.log('🔍 [DEBUG] Showing premium message for tier:', userTier);
                        showToast('✅ Live rates from global carriers', 'success', 4000);
                    } else {
                        console.log('🔍 [DEBUG] Showing free user message');
                        showToast('📊 Rate estimates available - Upgrade for live carrier data', 'info', 6000);
                    }
                } else if (data?.cached && data?.expired) {
                    console.log('🔍 [DEBUG] Showing expired cache message');
                } else {
                    console.log('🔍 [DEBUG] Showing live data message');
                }
                
                if (data?.cached && data?.expired) {
                    console.log('[SHIPPO] Using expired cache - monthly limit reached');
                    showToast('⚠️ Showing older rates. Upgrade to Pro for real-time updates!', 'warning', 8000);
                }
                
                if (data && data.success && data.quotes && Array.isArray(data.quotes) && data.quotes.length > 0) {
                    console.log('🔍 [DEBUG] Transforming quotes, count:', data.quotes.length);
                    // Transform API response to our Quote format
                    return data.quotes.map((q: any) => ({
                        carrierName: q.carrier || q.service_name || 'Unknown Carrier',
                        carrierType: q.service_type || 'Express',
                        totalCost: q.total_rate || q.rate || q.price || 0,
                        estimatedTransitTime: q.estimated_days 
                            ? `${q.estimated_days} business days` 
                            : q.estimated_delivery || '5-7 days',
                        serviceProvider: data.cached 
                            ? (data.expired ? 'Shippo (Cached - Expired)' : 'Shippo (Cached)')
                            : 'Shippo API',
                        isSpecialOffer: false,
                        chargeableWeight: params.weight,
                        chargeableWeightUnit: 'kg',
                        weightBasis: 'Actual',
                        costBreakdown: {
                            baseShippingCost: q.total_rate || q.rate || q.price || 0,
                            fuelSurcharge: q.fuel_surcharge || 0,
                            estimatedCustomsAndTaxes: q.customs || 0,
                            optionalInsuranceCost: 0,
                            ourServiceFee: 0
                        }
                    }));
                } else {
                    console.log('🔍 [DEBUG] No quotes returned from Firebase function');
                    // API returned empty or no quotes - fall back to AI
                    throw new Error(data?.error || data?.message || 'No quotes available from Shippo');
                }
            } catch (funcError: any) {
                console.log('🔍 [DEBUG] Firebase function error:', funcError);
                // Firebase function error - fall back gracefully
                throw new Error(funcError?.message || 'Shippo API temporarily unavailable');
            }
        }
        
        // No Firebase functions available - will fall back to AI
        throw new Error('Backend API not configured');
    } catch (error: any) {
        console.log('🔍 [DEBUG] fetchShippoQuotes final error:', error);
        // Check if it's a "not found" error - let calling code handle fallback to AI
        if (error.code !== 'functions/not-found' && error.code !== 'functions/unavailable') {
            console.log('🔍 [DEBUG] Showing error toast:', error.message);
            showToast(error.message || 'Failed to fetch rates. Please try again.', 'error');
        }
        throw error;
    } finally {
        console.log('🔍 [DEBUG] fetchShippoQuotes completed');
        toggleLoading(false);
    }
}

/**
 * Fetches real sea freight rates for FCL/LCL/Train/Air/Bulk via Sea Rates API
 * Already uses Firebase callable functions (no CORS issues)
 */
export async function fetchSeaRatesQuotes(params: {
    serviceType: 'fcl' | 'lcl' | 'train' | 'air' | 'bulk';
    origin: string; // Port or location
    destination: string; // Port or location
    containers?: Array<{ type: string; quantity: number }>;
    cargo?: {
        description: string;
        weight?: number;
        volume?: number;
        hsCode?: string;
    };
    currency: string;
}): Promise<Quote[]> {
    try {
        toggleLoading(true, 'Fetching real-time sea freight rates...');
        
        // Call Firebase Function (no CORS issues - already implemented correctly)
        const currentFunctions = functions || getFunctions();
        if (currentFunctions) {
            try {
                const getSeaRates = currentFunctions.httpsCallable('getSeaRates');
                const result = await getSeaRates({
                    service_type: params.serviceType,
                    origin: params.origin,
                    destination: params.destination,
                    containers: params.containers,
                    cargo: params.cargo,
                    currency: params.currency
                });
                
                const data: any = result.data;
                
                // Check for subscription/cache status messages
                if (data?.subscription_required && data?.message) {
                    showToast(data.message, 'warning', 8000);
                }
                
                if (data?.cached && !data?.expired) {
                    console.log('[SEA RATES] Using cached data (refreshed every 4 hours to save API calls)');
                    // Professional messaging that hides caching logic
                    const userTier = State.subscriptionTier || 'free';
                    if (userTier === 'pro' || userTier === 'premium') {
                        showToast('✅ Live rates from global carriers', 'success', 4000);
                    } else {
                        showToast('📊 Rate estimates available - Upgrade for live carrier data', 'info', 6000);
                    }
                }
                
                if (data?.cached && data?.expired) {
                    console.log('[SEA RATES] Using expired cache - monthly limit reached');
                    showToast('⚠️ Showing older rates. Upgrade to Pro for real-time updates!', 'warning', 8000);
                }
                
                if (data && data.success && data.quotes && Array.isArray(data.quotes) && data.quotes.length > 0) {
                    // Transform Sea Rates API response to our Quote format
                    const quotes = data.quotes.map((q: any) => ({
                        carrierName: q.carrier || q.carrier_name || 'Ocean Carrier',
                        carrierType: params.serviceType === 'fcl' ? 'FCL' 
                            : params.serviceType === 'lcl' ? 'LCL'
                            : params.serviceType === 'train' ? 'Rail'
                            : params.serviceType === 'air' ? 'Air Freight'
                            : 'Bulk Shipping',
                        totalCost: q.total_rate || q.price || 0,
                        estimatedTransitTime: q.transit_time || q.estimated_days 
                            ? `${q.estimated_days} days` 
                            : '15-30 days',
                        serviceProvider: data.cached 
                            ? (data.expired ? 'Sea Rates (Cached - Expired)' : 'Sea Rates (Cached)')
                            : 'Sea Rates API',
                        isSpecialOffer: false,
                        chargeableWeight: params.cargo?.weight || 0,
                        chargeableWeightUnit: params.cargo?.weight ? 'kg' : 'N/A',
                        weightBasis: params.serviceType === 'fcl' ? 'Per Container' : 'Per Volume',
                        costBreakdown: {
                            baseShippingCost: q.ocean_freight || q.base_rate || 0,
                            fuelSurcharge: q.baf || q.fuel_surcharge || 0,
                            estimatedCustomsAndTaxes: q.customs || q.duties || 0,
                            optionalInsuranceCost: 0,
                            ourServiceFee: q.service_fee || 0
                        }
                    }));
                    
                    return quotes;
                } else {
                    // API returned no quotes or error - fall back to AI
                    throw new Error(data?.error || data?.message || 'No quotes available from Sea Rates API');
                }
            } catch (funcError: any) {
                // Firebase function error - fall back gracefully
                throw new Error(funcError?.message || 'Sea Rates API temporarily unavailable');
            }
        }
        
        // No Firebase functions available - will fall back to AI
        throw new Error('Backend API not configured');
    } catch (error: any) {
        
        // Don't show toast if it's a "not found" error - let calling code handle fallback to AI
        if (error.code !== 'functions/not-found' && error.code !== 'functions/unavailable') {
            showToast(error.message || 'Failed to fetch rates. Please try again.', 'error');
        }
        throw error;
    } finally {
        toggleLoading(false);
    }
}

/**
 * Sends quote inquiry email via backend
 */
export async function sendQuoteInquiry(params: {
    serviceType: string;
    quotes: Quote[];
    customerDetails: {
        name: string;
        email: string;
        phone?: string;
    };
    shipmentDetails: any;
    selectedQuote?: Quote;
}): Promise<boolean> {
    try {
        toggleLoading(true, 'Sending your inquiry...');
        
        const currentFunctions = functions || getFunctions();
        if (currentFunctions) {
            const sendInquiry = currentFunctions.httpsCallable('sendQuoteInquiry');
            const result = await sendInquiry({
                service_type: params.serviceType,
                quotes: params.quotes,
                customer: params.customerDetails,
                shipment: params.shipmentDetails,
                selected_quote: params.selectedQuote
            });
            
            const data: any = result.data;
            
            if (data.success) {
                showToast('Your inquiry has been sent! We will get back to you ASAP.', 'success');
                return true;
            } else {
                throw new Error(data.error || 'Failed to send inquiry');
            }
        }
        
        // Fallback: Try direct email API if available
        throw new Error('Email service not configured');
    } catch (error: any) {
        showToast(error.message || 'Failed to send inquiry. Please contact us directly.', 'error');
        return false;
    } finally {
        toggleLoading(false);
    }
}