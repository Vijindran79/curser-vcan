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
        console.log('[BACKEND DIAGNOSTIC] fetchShippoQuotes STARTED', params);
        console.log('[BACKEND DIAGNOSTIC] Current State:', {
            subscriptionTier: State.subscriptionTier,
            isLoggedIn: State.isLoggedIn,
            currentUser: State.currentUser
        });

        try {
            toggleLoading(true, 'Fetching real-time quotes from carriers...');

            const { auth } = await import('./firebase');
            const user = auth?.currentUser;

            const currentFunctions = functions || getFunctions();

            if (!currentFunctions) {
                throw new Error('Backend functions unavailable');
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

            if (!currentFunctions) {
                throw new Error('Backend functions unavailable');
            }

            let data: any;

            try {
                // Use V2 callable with App Check enforcement
                const callable = currentFunctions.httpsCallable('getShippoQuotesV2');
                const result = await callable(callablePayload);
                data = result.data as any;
            } catch (callableError: any) {
                console.error('[BACKEND DIAGNOSTIC] Shippo callable invocation failed', callableError);
                if (callableError?.code === 'functions/unauthenticated') {
                    showToast('Parcel rate service needs a quick refresh. Try again shortly.', 'warning', 6000);
                }
                throw callableError;
            }

            console.log('[BACKEND DIAGNOSTIC] Shippo response payload:', data);

                    if (data?.subscription_required && data?.message) {
                        console.log('[BACKEND DIAGNOSTIC] Showing subscription required message:', data.message);
                        showToast(data.message, 'info', 6000);
                    }

                    if (data?.cached && data?.expired) {
                        console.log('[SHIPPO] Using expired cache - carriers unavailable');
                        showToast('⚠️ Showing older parcel rates while carriers reconnect. Try again soon.', 'warning', 8000);
                    } else if (data?.cached) {
                        console.log('[SHIPPO] Using cached data (refreshed every 4 hours to save API calls)');
                        showToast('📊 Showing cached parcel rates while live updates complete.', 'info', 6000);
                    } else {
                        console.log('[BACKEND DIAGNOSTIC] Showing live data message');
                        showToast('✅ Live parcel rates fetched from carriers.', 'success', 4000);
                    }

                    if (data && data.success && Array.isArray(data.quotes) && data.quotes.length > 0) {
                        console.log('[BACKEND DIAGNOSTIC] Transforming quotes, count:', data.quotes.length);
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

                    console.log('[BACKEND DIAGNOSTIC] No quotes returned from callable function');
                    throw new Error(data?.error || data?.message || 'No quotes available from Shippo');
            throw new Error('Shippo quotes unavailable');
        } catch (error: any) {
            console.log('[BACKEND DIAGNOSTIC] fetchShippoQuotes final error:', error);
            if (error.code !== 'functions/not-found' && error.code !== 'functions/unavailable') {
                console.log('[BACKEND DIAGNOSTIC] Showing error toast:', error.message);
                showToast(error.message || 'Failed to fetch rates. Please try again.', 'error');
            }
            throw error;
        } finally {
            console.log('[BACKEND DIAGNOSTIC] fetchShippoQuotes completed');
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

        const originCoords = await resolveLocationCoordinates(params.origin, serviceType);
        const destinationCoords = await resolveLocationCoordinates(params.destination, serviceType);

        if (!originCoords || !destinationCoords) {
            throw new Error('Location resolution failed');
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
            throw new Error(`Live rates not available for ${serviceType.toUpperCase()} yet`);
        }

        const currentFunctions = functions || getFunctions();
        if (!currentFunctions) {
            throw new Error('Backend API not configured');
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

        throw new Error(data?.error || data?.message || 'No quotes available from Sea Rates API');
    } catch (error: any) {
        const message = error?.message || 'Failed to fetch rates. Please try again.';
        if (message.includes('Live rates not available')) {
            showToast(message, 'info', 6000);
        } else if (message === 'Location resolution failed') {
            showToast('We could not find one of the locations provided. Please use a recognized port or airport code.', 'warning', 7000);
        } else if (error.code !== 'functions/not-found' && error.code !== 'functions/unavailable') {
            showToast(message, 'error');
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