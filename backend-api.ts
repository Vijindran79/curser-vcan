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
 * Fetches real parcel quotes from the backend via Firebase callable functions.
 * This function can handle different providers like Shippo and Sendcloud.
 */
export async function fetchParcelQuotes(params: {
    provider: 'shippo' | 'sendcloud';
    originAddress: string;
    destinationAddress: string;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    parcelType: string;
    currency: string;
}): Promise<Quote[]> {
    console.log(`🔍 [DEBUG] fetchParcelQuotes STARTED for ${params.provider}`, params);

    try {
        toggleLoading(true, `Fetching real-time quotes from ${params.provider}...`);

        const currentFunctions = functions || getFunctions();
        if (!currentFunctions) {
            throw new Error('Backend API not configured');
        }

        const getParcelQuotes = currentFunctions.httpsCallable('getParcelQuotes');
        const result = await getParcelQuotes({
            provider: params.provider,
            origin: params.originAddress,
            destination: params.destinationAddress,
            weight: params.weight,
            dimensions: params.length && params.width && params.height ? {
                length: params.length,
                width: params.width,
                height: params.height,
            } : undefined,
            parcel_type: params.parcelType,
            currency: params.currency,
        });

        const data: any = result.data;

        if (data?.subscription_required && data?.message) {
            showToast(data.message, 'warning', 8000);
        }

        if (data?.cached && !data?.expired) {
            const userTier = State.subscriptionTier || 'free';
            if (userTier !== 'free' && userTier !== 'guest') {
                showToast('✅ Live rates from global carriers', 'success', 4000);
            } else {
                showToast('📊 Rate estimates available - Upgrade for live carrier data', 'info', 6000);
            }
        }

        if (data?.cached && data?.expired) {
            showToast('⚠️ Showing older rates. Upgrade to Pro for real-time updates!', 'warning', 8000);
        }

        if (data?.success && Array.isArray(data.quotes) && data.quotes.length > 0) {
            return data.quotes.map((q: any) => ({
                carrierName: q.carrier || 'Unknown Carrier',
                carrierType: q.service_name || 'Express',
                totalCost: q.total_rate || 0,
                estimatedTransitTime: q.transit_time || '5-7 days',
                serviceProvider: q.source === 'live_carrier_api' ? `${params.provider.toUpperCase()} API` : `${params.provider.toUpperCase()} (Estimated)`,
                isSpecialOffer: false,
                chargeableWeight: params.weight,
                chargeableWeightUnit: 'kg',
                weightBasis: 'Actual',
                costBreakdown: {
                    baseShippingCost: q.total_rate || 0,
                    fuelSurcharge: q.fuel_surcharge || 0,
                    estimatedCustomsAndTaxes: q.customs || 0,
                    optionalInsuranceCost: 0,
                    ourServiceFee: 0,
                },
            }));
        } else {
            throw new Error(data?.message || `No quotes available from ${params.provider}`);
        }
    } catch (error: any) {
        console.error('🔍 [DEBUG] fetchParcelQuotes final error:', error);
        showToast(error.message || 'Failed to fetch rates. Please try again.', 'error');
        throw error;
    } finally {
        toggleLoading(false);
    }
}


/**
 * Fetches real sea freight rates for FCL/LCL/Train/Air/Bulk via Sea Rates API
 */
export async function getSeaRatesQuotes(params: {
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
        
        const currentFunctions = functions || getFunctions();
        if (!currentFunctions) {
            throw new Error('Backend API not configured');
        }

        const getSeaRates = currentFunctions.httpsCallable('getSeaRatesQuotes');
        const result = await getSeaRates({
            serviceType: params.serviceType,
            origin: params.origin,
            destination: params.destination,
            containers: params.containers,
            cargo: params.cargo,
            currency: params.currency,
        });

        const data: any = result.data;

        if (data?.subscription_required && data?.message) {
            showToast(data.message, 'warning', 8000);
        }

        if (data?.cached && !data?.expired) {
            const userTier = State.subscriptionTier || 'free';
            if (userTier === 'pro' || userTier === 'premium') {
                showToast('✅ Live rates from global carriers', 'success', 4000);
            } else {
                showToast('📊 Rate estimates available - Upgrade for live carrier data', 'info', 6000);
            }
        }
        
        if (data?.cached && data?.expired) {
            showToast('⚠️ Showing older rates. Upgrade to Pro for real-time updates!', 'warning', 8000);
        }
        
        if (data && data.success && data.quotes && Array.isArray(data.quotes) && data.quotes.length > 0) {
            return data.quotes.map((q: any) => ({
                carrierName: q.carrier || 'Ocean Carrier',
                carrierType: params.serviceType.toUpperCase(),
                totalCost: q.total_rate || 0,
                estimatedTransitTime: q.transit_time || '15-30 days',
                serviceProvider: data.cached ? 'Sea Rates (Cached)' : 'Sea Rates API',
                isSpecialOffer: false,
                chargeableWeight: params.cargo?.weight || 0,
                chargeableWeightUnit: params.cargo?.weight ? 'kg' : 'N/A',
                weightBasis: params.serviceType === 'fcl' ? 'Per Container' : 'Per Volume',
                costBreakdown: {
                    baseShippingCost: q.ocean_freight || 0,
                    fuelSurcharge: q.baf || 0,
                    estimatedCustomsAndTaxes: q.customs || 0,
                    optionalInsuranceCost: 0,
                    ourServiceFee: q.service_fee || 0
                }
            }));
        } else {
            throw new Error(data?.message || 'No quotes available from Sea Rates API');
        }
    } catch (error: any) {
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
        
        throw new Error('Email service not configured');
    } catch (error: any) {
        showToast(error.message || 'Failed to send inquiry. Please contact us directly.', 'error');
        return false;
    } finally {
        toggleLoading(false);
    }
}