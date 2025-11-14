// backend-api-fixed.ts
// Fixed version with Firebase callable functions (no CORS issues)
// This file handles communication with Shippo (parcel) and Sea Rates API (FCL/LCL/Train/Air/Bulk)

import { State, type Quote } from './state';
import { showToast, toggleLoading } from './ui';
import { functions, getFunctions, GEOAPIFY_API_KEY } from './firebase';

/**
 * Backend API Configuration
 * These should be stored securely in Firebase Functions or environment variables
 */
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'https://api.vcanship.com/v1';

type SeaRatesServiceType = 'fcl' | 'lcl' | 'train' | 'air' | 'bulk';
type LocationInput = string | { lat?: number; lng?: number; lon?: number; latitude?: number; longitude?: number; name?: string } | null | undefined;

interface LocationCoordinates {
    lat: number;
    lng: number;
    name?: string;
}

const locationCache = new Map<string, LocationCoordinates>();

function buildGeoapifyQuery(raw: string, serviceType: SeaRatesServiceType): string {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;

    const unlocodeMatch = trimmed.match(/\b([A-Z]{5})\b/);
    if (unlocodeMatch) {
        return `${unlocodeMatch[1]} port`;
    }

    if (serviceType === 'air') {
        const iataMatch = trimmed.match(/\b([A-Z]{3})\b/);
        if (iataMatch) {
            return `${iataMatch[1]} airport`;
        }
        return trimmed;
    }

    return trimmed;
}

async function geocodeLocation(query: string, serviceType: SeaRatesServiceType): Promise<LocationCoordinates | null> {
    const cacheKey = `${serviceType}:${query.toLowerCase()}`;
    if (locationCache.has(cacheKey)) {
        return locationCache.get(cacheKey)!;
    }

    const apiKey = GEOAPIFY_API_KEY || import.meta.env.VITE_GEOAPIFY_API_KEY;
    if (!apiKey || apiKey.includes('REPLACE')) {
        console.warn('[Geoapify] API key missing - cannot geocode location');
        return null;
    }

    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(buildGeoapifyQuery(query, serviceType))}&limit=1&apiKey=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Geoapify error ${response.status}`);
        }

        const data = await response.json();
        const properties = data?.features?.[0]?.properties;
        if (properties?.lat != null && properties?.lon != null) {
            const coords: LocationCoordinates = {
                lat: Number(properties.lat),
                lng: Number(properties.lon),
                name: properties.formatted || query
            };
            locationCache.set(cacheKey, coords);
            return coords;
        }
    } catch (error) {
        console.warn('[Geoapify] Failed to geocode location', query, error);
    }

    return null;
}

async function resolveLocationCoordinates(location: LocationInput, serviceType: SeaRatesServiceType): Promise<LocationCoordinates | null> {
    if (!location) return null;

    if (typeof location === 'object') {
        const lat = location.lat ?? location.latitude;
        const lng = location.lng ?? location.lon ?? location.longitude;
        if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
            return { lat, lng, name: location.name };
        }
        if (location.name && typeof location.name === 'string') {
            return geocodeLocation(location.name, serviceType);
        }
    }

    if (typeof location === 'string') {
        const trimmed = location.trim();
        if (!trimmed) {
            return null;
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === 'object') {
                return resolveLocationCoordinates(parsed as LocationInput, serviceType);
            }
        } catch {
            // Not JSON - continue to geocode text input
        }

        return geocodeLocation(trimmed, serviceType);
    }

    return null;
}

    function normalizeContainerType(type?: string): string {
        if (!type) return '40HC';
        const upper = type.toUpperCase();
        if (upper.includes('45')) return '45HC';
        if (upper.includes('40H')) return '40HC';
        if (upper.includes('40')) return '40FT';
        if (upper.includes('20')) return '20FT';
        return upper;
    }

    /**
     * Fetches real parcel quotes from Shippo API via backend - callable version
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
        try {
            toggleLoading(true, 'Fetching real-time quotes from carriers...');

            const { auth } = await import('./firebase');
            const user = auth?.currentUser;

            const currentFunctions = functions || getFunctions();

            if (!currentFunctions) {
                throw new Error('Backend service temporarily unavailable. Please check your connection and try again.');
            }

            const callablePayload = {
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
                userEmail: user?.email || 'guest'
            };

            let data: any;

            try {
                // Use V2 callable with App Check enforcement
                const callable = currentFunctions.httpsCallable('getShippoQuotesV2');
                const result = await callable(callablePayload);
                data = result.data as any;
            } catch (callableError: any) {
                console.error('[API Error] Shippo callable failed:', callableError);
                
                // Provide user-friendly error messages based on error code
                if (callableError?.code === 'functions/unauthenticated') {
                    showToast('Please sign in to access parcel rates. Your session may have expired.', 'warning', 6000);
                    throw new Error('Authentication required. Please sign in and try again.');
                } else if (callableError?.code === 'functions/permission-denied') {
                    showToast('You do not have permission to access this feature. Please contact support.', 'error', 6000);
                    throw new Error('Access denied. Please verify your account permissions.');
                } else if (callableError?.code === 'functions/resource-exhausted') {
                    showToast('Rate limit exceeded. Please wait a moment and try again.', 'warning', 6000);
                    throw new Error('Too many requests. Please slow down and try again in a moment.');
                } else if (callableError?.code === 'functions/not-found') {
                    showToast('Parcel rate service is temporarily unavailable. Our team has been notified.', 'error', 6000);
                    throw new Error('Service endpoint not found. Please try again later.');
                } else if (callableError?.code === 'functions/deadline-exceeded') {
                    showToast('Request timed out. Please check your connection and try again.', 'warning', 6000);
                    throw new Error('The request took too long to complete. Please try again with a better connection.');
                } else {
                    // Generic network/API error
                    showToast('Failed to connect to parcel rate service. Please check your internet connection.', 'error', 6000);
                    throw new Error(`Network error: ${callableError?.message || 'Unable to reach service'}. Please check your connection.`);
                }
            }

            console.log('[API Success] Shippo response received:', data);

            // Handle subscription and caching messages
            if (data?.subscription_required && data?.message) {
                showToast(data.message, 'info', 6000);
            }

            if (data?.cached && data?.expired) {
                showToast('⚠️ Showing older parcel rates while carriers reconnect. Try again soon.', 'warning', 8000);
            } else if (data?.cached) {
                showToast('📊 Showing cached parcel rates while live updates complete.', 'info', 6000);
            } else {
                showToast('✅ Live parcel rates fetched from carriers.', 'success', 4000);
            }

            // Check for successful response with quotes
            if (data && data.success && Array.isArray(data.quotes) && data.quotes.length > 0) {
                console.log('[API Success] Transforming quotes, count:', data.quotes.length);
                return data.quotes.map((q: any) => ({
                    carrierName: q.carrier || q.service_name || 'Unknown Carrier',
                    carrierType: q.service_type || 'Express',
                    totalCost: q.total_rate || q.rate || q.price || 0,
                    estimatedTransitTime: q.estimated_days
                        ? `${q.estimated_days} business days`
                        : q.estimated_delivery || q.transit_time || '5-7 days',
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
            }

            // No quotes returned - provide helpful message
            if (data?.message?.includes('subscription')) {
                throw new Error(data.message);
            } else if (data?.message?.includes('location')) {
                throw new Error('We could not recognize one or both addresses. Please use complete street addresses with city and country.');
            } else if (data?.message?.includes('weight')) {
                throw new Error('The parcel weight or dimensions appear to be invalid. Please check your entries.');
            } else {
                throw new Error(data?.error || data?.message || 'No quotes available for your route. This may be due to carrier restrictions or invalid addresses. Please verify your shipment details and try again.');
            }
        } catch (error: any) {
            console.error('[API Error] fetchShippoQuotes failed:', error);
            
            // Don't show toast for certain error types that already handled it
            if (error.code !== 'functions/not-found' && error.code !== 'functions/unavailable') {
                // If we haven't already shown a specific toast, show a generic one
                if (!error.message.includes('Please sign in') &&
                    !error.message.includes('Access denied') &&
                    !error.message.includes('Rate limit') &&
                    !error.message.includes('Service endpoint')) {
                    showToast(error.message || 'Failed to fetch parcel rates. Please check your details and try again.', 'error', 8000);
                }
            }
            throw error;
        } finally {
            toggleLoading(false);
        }
    }

/**
 * Fetches real sea freight rates for FCL/LCL/Train/Air/Bulk via Sea Rates API
 * Already uses Firebase callable functions (no CORS issues)
 */
export async function fetchSeaRatesQuotes(params: {
    serviceType: SeaRatesServiceType;
    origin: LocationInput;
    destination: LocationInput;
    containers?: Array<{ type: string; quantity: number }>;
    cargo?: {
        description: string;
        weight?: number;
        volume?: number;
        hsCode?: string;
    };
    currency: string;
}): Promise<Quote[]> {
    const serviceType = params.serviceType;
    try {
        toggleLoading(true, 'Fetching real-time carrier rates...');

        // Validate required parameters
        if (!params.origin || !params.destination) {
            throw new Error('Please provide both origin and destination locations.');
        }

        const originCoords = await resolveLocationCoordinates(params.origin, serviceType);
        const destinationCoords = await resolveLocationCoordinates(params.destination, serviceType);

        if (!originCoords || !destinationCoords) {
            throw new Error(`We could not find the ${!originCoords ? 'origin' : 'destination'} location. Please check the address, port code, or airport code and try again.`);
        }

        const callableNameMap: Record<SeaRatesServiceType, string | null> = {
            fcl: 'getFCLRates',
            lcl: 'getFCLRates',
            air: 'getFCLRates',
            train: null,
            bulk: null
        };

        const callableName = callableNameMap[serviceType];
        if (!callableName) {
            throw new Error(`Live rates are not yet available for ${serviceType.toUpperCase()} shipments. Please try our manual quote request or contact support.`);
        }

        const currentFunctions = functions || getFunctions();
        if (!currentFunctions) {
            throw new Error('Backend service is temporarily unavailable. Please check your internet connection and try again.');
        }

        const payload: any = {
            origin: originCoords,
            destination: destinationCoords
        };

        let chargeableWeight = 0;
        let chargeableUnit = 'N/A';
        let weightBasis = 'Per Container';

        if (serviceType === 'fcl') {
            const primaryContainer = params.containers?.find(c => (c.quantity ?? 0) > 0) ?? params.containers?.[0];
            if (!primaryContainer) {
                throw new Error('Please select at least one container type for FCL shipment.');
            }
            payload.containerType = normalizeContainerType(primaryContainer?.type);
            if (params.cargo?.weight) {
                chargeableWeight = params.cargo.weight;
                chargeableUnit = 'kg';
            }
        } else if (serviceType === 'lcl') {
            const volume = params.cargo?.volume && params.cargo.volume > 0 ? params.cargo.volume : 1;
            const weight = params.cargo?.weight && params.cargo.weight > 0 ? params.cargo.weight : Math.max(volume * 1000, 1000);
            payload.volume = Number(volume.toFixed(3));
            payload.weight = Number(weight.toFixed(2));
            chargeableWeight = payload.volume;
            chargeableUnit = 'CBM';
            weightBasis = 'Volume';
        } else if (serviceType === 'air') {
            const weight = params.cargo?.weight && params.cargo.weight > 0 ? params.cargo.weight : 100;
            payload.weight = Number(weight.toFixed(2));
            chargeableWeight = payload.weight;
            chargeableUnit = 'kg';
            weightBasis = 'Chargeable Weight';
        }

        try {
            const callable = currentFunctions.httpsCallable(callableName);
            const result = await callable(payload);
            const data: any = result.data;

            if (data?.subscription_required && data?.message) {
                showToast(data.message, 'warning', 8000);
            }

            if (data?.cached && !data?.expired) {
                console.log('[SEA RATES] Using cached data (refreshed every 4 hours to save API calls)');
                const userTier = State.subscriptionTier || 'free';
                if (userTier === 'pro') {
                    showToast('✅ Live rates from global carriers', 'success', 4000);
                } else {
                    showToast('📊 Rate estimates available - Upgrade for live carrier data', 'info', 6000);
                }
            }

            if (data?.cached && data?.expired) {
                console.log('[SEA RATES] Using expired cache - monthly limit reached');
                showToast('⚠️ Showing older rates. Upgrade to Pro for real-time updates!', 'warning', 8000);
            }

            if (data && data.success && Array.isArray(data.quotes) && data.quotes.length > 0) {
                return data.quotes.map((q: any) => {
                    const estimatedTransitTime = q.transit_time
                        || (q.transitTime ? `${q.transitTime} days` : null)
                        || (q.estimated_days ? `${q.estimated_days} days` : null)
                        || '15-30 days';

                    return {
                        carrierName: q.carrier || q.carrier_name || 'Carrier',
                        carrierType: serviceType === 'fcl' ? 'FCL'
                            : serviceType === 'lcl' ? 'LCL'
                            : 'Air Freight',
                        totalCost: q.total_rate ?? q.price ?? q.rate ?? 0,
                        estimatedTransitTime,
                        serviceProvider: data.cached
                            ? (data.expired ? 'Sea Rates (Cached - Expired)' : 'Sea Rates (Cached)')
                            : 'Sea Rates API',
                        isSpecialOffer: false,
                        chargeableWeight,
                        chargeableWeightUnit: chargeableUnit,
                        weightBasis,
                        costBreakdown: {
                            baseShippingCost: q.ocean_freight ?? q.base_rate ?? q.freight ?? 0,
                            fuelSurcharge: q.baf ?? q.fuel_surcharge ?? 0,
                            estimatedCustomsAndTaxes: q.customs ?? q.duties ?? 0,
                            optionalInsuranceCost: 0,
                            ourServiceFee: q.service_fee ?? 0
                        }
                    } as Quote;
                });
            }

            // No quotes returned - provide helpful guidance
            if (data?.message?.includes('subscription')) {
                throw new Error(data.message);
            } else if (data?.message?.includes('location')) {
                throw new Error('One of the locations provided is not recognized by our system. Please use standard port codes (e.g., CNSHA for Shanghai) or airport codes (e.g., LHR for London Heathrow).');
            } else if (data?.message?.includes('route')) {
                throw new Error('This route is not currently serviced by our carriers. Please contact our support team for alternative options.');
            } else {
                throw new Error(data?.error || data?.message || `No quotes available for your ${serviceType.toUpperCase()} shipment. This may be due to carrier capacity, route restrictions, or incomplete shipment details. Please verify all information and try again.`);
            }
        } catch (apiError: any) {
            console.error('[API Error] SeaRates callable failed:', apiError);
            
            // Provide specific error messages for different error codes
            if (apiError?.code === 'functions/unauthenticated') {
                showToast('Please sign in to access freight rates. Your session may have expired.', 'warning', 6000);
                throw new Error('Authentication required. Please sign in and try again.');
            } else if (apiError?.code === 'functions/permission-denied') {
                showToast('You do not have permission to access freight rates. Please contact support.', 'error', 6000);
                throw new Error('Access denied. Please verify your account permissions.');
            } else if (apiError?.code === 'functions/resource-exhausted') {
                showToast('Rate limit exceeded. Please wait a moment and try again.', 'warning', 6000);
                throw new Error('Too many requests. Please slow down and try again in a moment.');
            } else if (apiError?.code === 'functions/deadline-exceeded') {
                showToast('Request timed out. The route may be complex. Please try again with a simpler query.', 'warning', 6000);
                throw new Error('The request took too long to complete. Please try again with a better connection or simpler route.');
            } else if (apiError?.code === 'functions/not-found') {
                showToast('Freight rate service is temporarily unavailable. Our team has been notified.', 'error', 6000);
                throw new Error('Service endpoint not found. Please try again later.');
            } else {
                // Re-throw the original error to be handled by the outer catch
                throw apiError;
            }
        }
    } catch (error: any) {
        console.error('[API Error] fetchSeaRatesQuotes failed:', error);
        
        // Provide user-friendly error messages based on error type
        const errorMessage = error.message || 'Failed to fetch freight rates.';
        
        if (errorMessage.includes('Location resolution failed')) {
            showToast(errorMessage, 'warning', 7000);
        } else if (errorMessage.includes('not yet available')) {
            showToast(errorMessage, 'info', 6000);
        } else if (errorMessage.includes('No quotes available')) {
            showToast(errorMessage, 'info', 8000);
        } else if (errorMessage.includes('Authentication required') ||
                   errorMessage.includes('Access denied') ||
                   errorMessage.includes('Rate limit exceeded') ||
                   errorMessage.includes('Service endpoint')) {
            // These already have specific toasts shown above, don't show generic toast
        } else {
            // Generic error - provide helpful message
            showToast('Failed to fetch freight rates. Please check your shipment details and try again.', 'error', 8000);
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
        // Validate required parameters
        if (!params.customerDetails?.name || !params.customerDetails?.email) {
            throw new Error('Please provide your name and email address so we can respond to your inquiry.');
        }

        if (!params.quotes || params.quotes.length === 0) {
            throw new Error('No quotes selected. Please choose a shipping option before sending your inquiry.');
        }

        toggleLoading(true, 'Sending your inquiry...');
        
        const currentFunctions = functions || getFunctions();
        if (!currentFunctions) {
            throw new Error('Email service is temporarily unavailable. Please contact us directly at support@vcanship.com or call +44 20 1234 5678.');
        }

        try {
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
                showToast('✅ Your inquiry has been sent successfully! Our team will contact you within 24 hours.', 'success', 6000);
                return true;
            } else {
                // Handle specific backend error messages
                if (data.error?.includes('rate limit')) {
                    throw new Error('You have sent too many inquiries recently. Please wait a few minutes before trying again.');
                } else if (data.error?.includes('invalid email')) {
                    throw new Error('The email address provided appears to be invalid. Please check and try again.');
                } else if (data.error?.includes('incomplete')) {
                    throw new Error('Some required information is missing from your inquiry. Please fill in all required fields.');
                } else {
                    throw new Error(data.error || 'Failed to send inquiry due to a server error. Please try again or contact us directly.');
                }
            }
        } catch (apiError: any) {
            console.error('[API Error] Quote inquiry failed:', apiError);
            
            // Provide specific error messages for different error codes
            if (apiError?.code === 'functions/unauthenticated') {
                throw new Error('Please sign in to send inquiries. Your session may have expired.');
            } else if (apiError?.code === 'functions/permission-denied') {
                throw new Error('You do not have permission to send inquiries. Please contact support.');
            } else if (apiError?.code === 'functions/resource-exhausted') {
                throw new Error('You have sent too many inquiries. Please wait a few minutes and try again.');
            } else if (apiError?.code === 'functions/deadline-exceeded') {
                throw new Error('The request timed out. Please check your connection and try again.');
            } else if (apiError?.code === 'functions/not-found') {
                throw new Error('The inquiry service is temporarily unavailable. Please contact us directly at support@vcanship.com');
            } else {
                throw new Error(`Failed to send inquiry: ${apiError?.message || 'Unknown error'}. Please try again or contact support.`);
            }
        }
    } catch (error: any) {
        console.error('[API Error] sendQuoteInquiry failed:', error);
        
        // Show user-friendly error message
        const errorMessage = error.message || 'Failed to send inquiry. Please try again.';
        showToast(errorMessage, 'error', 8000);
        
        // Provide additional guidance for specific errors
        if (errorMessage.includes('Email service')) {
            showToast('Alternative: Email us at support@vcanship.com or call +44 20 1234 5678', 'info', 6000);
        } else if (errorMessage.includes('too many')) {
            showToast('Tip: You can also reach us via WhatsApp or live chat for immediate assistance.', 'info', 6000);
        }
        
        return false;
    } finally {
        toggleLoading(false);
    }
}