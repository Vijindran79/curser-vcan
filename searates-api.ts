/**
 * SeaRates API Integration Module
 * 
 * Provides comprehensive access to SeaRates logistics APIs:
 * - Logistics Explorer (FCL/LCL/Air/Rail/Road rates)
 * - Container Tracking (real-time location)
 * - Vessel Tracking (ship positions & schedules)
 * - Port Database (4000+ ports worldwide)
 * - Distance Calculator (route & transit time)
 * - Carbon Calculator (CO2 emissions - ISO 14083)
 * - Load Calculator (3D container optimization)
 * - Demurrage Calculator (port fees & storage costs)
 * - Freight Index (market rate intelligence)
 * 
 * Phase 2 Implementation - Nov 2025
 */

import { State, type Quote } from './state';
import { showToast } from './ui';

/**
 * SeaRates API Configuration
 * Store API keys securely in Firebase Functions environment
 */
const SEARATES_CONFIG = {
    // Base URLs
    baseUrl: 'https://api.searates.com/v1',
    sandboxUrl: 'https://sandbox-api.searates.com/v1',
    
    // API Endpoints
    endpoints: {
        logisticsExplorer: '/logistics-explorer',
        containerTracking: '/container-tracking',
        vesselTracking: '/vessel-tracking',
        shipSchedules: '/ship-schedules',
        portDatabase: '/ports',
        distanceCalculator: '/distance',
        carbonCalculator: '/carbon-emissions',
        loadCalculator: '/load-calculator',
        demurrageCalculator: '/demurrage',
        freightIndex: '/freight-index',
        aiAssistant: '/ai-assistant'
    },
    
    // Feature flags (enable as we implement each feature)
    features: {
        logisticsExplorer: true,   // Phase 2a - ACTIVE ✅
        containerTracking: false,  // Phase 2b - Coming soon
        vesselTracking: false,     // Phase 2c - Coming soon
        portFees: false,           // Phase 2d - CRITICAL (Coming soon)
        distanceCalc: false,       // Phase 3a - Coming soon
        carbonCalc: false,         // Phase 3b - Coming soon
        loadCalc: false,           // Phase 3c - Coming soon
        freightIndex: false,       // Phase 3d - Coming soon
        aiAssistant: false         // Phase 3e - Coming soon
    },
    
    // CRITICAL: API quota management (50 calls/month limit!)
    quota: {
        monthlyLimit: 50,
        cacheDuration: 24 * 60 * 60 * 1000,  // 24 hours (aggressive caching!)
        warningThreshold: 40                  // Warn when 40/50 calls used
    }
};

/**
 * In-memory cache for API responses (protects 50 call/month limit)
 * Same route queried within 24 hours = instant cached response
 */
const responseCache = new Map<string, { data: any; timestamp: number; callCount: number }>();

/**
 * Generate cache key from request parameters
 */
function getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params)}`;
}

/**
 * Check if cached response is still valid
 */
function getCachedResponse<T>(endpoint: string, params: any): T | null {
    const cacheKey = getCacheKey(endpoint, params);
    const cached = responseCache.get(cacheKey);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > SEARATES_CONFIG.quota.cacheDuration) {
        responseCache.delete(cacheKey);
        return null;
    }
    
    console.log(`[SeaRates Cache HIT] Saved API call! Data age: ${Math.round(age / 1000 / 60)} minutes`);
    return cached.data as T;
}

/**
 * Store response in cache
 */
function setCachedResponse(endpoint: string, params: any, data: any): void {
    const cacheKey = getCacheKey(endpoint, params);
    const totalCalls = Array.from(responseCache.values()).reduce((sum, entry) => sum + entry.callCount, 0) + 1;
    
    responseCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        callCount: 1
    });
    
    // Warn if approaching quota limit
    if (totalCalls >= SEARATES_CONFIG.quota.warningThreshold) {
        console.warn(`[SeaRates Quota] ${totalCalls}/${SEARATES_CONFIG.quota.monthlyLimit} API calls used this month!`);
        showToast(`⚠️ API quota: ${totalCalls}/50 calls used. Consider Pro plan for unlimited access!`, 'warning', 10000);
    }
}

/**
 * SeaRates Service Types
 */
export type SeaRatesServiceType = 'fcl' | 'lcl' | 'air' | 'rail' | 'road';

/**
 * Logistics Explorer API - Get real carrier rates
 * Replaces AI estimates with actual rates from Maersk, MSC, CMA CGM, etc.
 */
export interface LogisticsExplorerRequest {
    serviceType: SeaRatesServiceType;
    origin: string;              // Port code (e.g., "CNSHA") or location
    destination: string;         // Port code (e.g., "USNYC") or location
    containers?: Array<{
        type: string;            // "20GP", "40HC", etc.
        quantity: number;
    }>;
    cargo?: {
        description: string;
        weight?: number;         // kg
        volume?: number;         // CBM
        hsCode?: string;
    };
    includePortFees?: boolean;   // Show port fees in breakdown
    includeCO2?: boolean;        // Show carbon footprint
    currency?: string;           // "USD", "EUR", etc.
}

export interface LogisticsExplorerResponse {
    success: boolean;
    quotes: Array<{
        carrier: string;         // "Maersk", "MSC", "CMA CGM"
        carrierCode: string;     // "MAEU", "MSCU", "CMDU"
        serviceType: string;     // "Direct", "Transshipment"
        totalRate: number;       // Total cost
        transitTime: string;     // "25-30 days"
        portOfLoading: string;
        portOfDischarge: string;
        breakdown: {
            oceanFreight: number;
            fuelSurcharge: number;
            portFees?: number;   // If includePortFees = true
            otherCharges: number;
        };
        co2Emissions?: {         // If includeCO2 = true
            totalKg: number;
            perTEU: number;
        };
        schedule: {
            departureDates: string[];
            arrivalDates: string[];
        };
    }>;
    cached?: boolean;
    cacheExpiry?: string;
}

/**
 * Container Tracking API - Real-time container location
 */
export interface ContainerTrackingRequest {
    containerNumber?: string;    // "MSCU1234567"
    billOfLading?: string;       // Alternative lookup
    carrierCode?: string;        // "MSCU", "MAEU", etc.
}

export interface ContainerTrackingResponse {
    success: boolean;
    container: {
        number: string;
        status: 'Empty' | 'Loaded' | 'In Transit' | 'Discharged' | 'Delivered';
        currentLocation: {
            lat: number;
            lon: number;
            name: string;          // "Port of Los Angeles"
            type: 'port' | 'vessel' | 'terminal' | 'destination';
        };
        vessel?: {
            name: string;
            imo: string;
            mmsi: string;
        };
        journey: Array<{
            location: string;
            date: string;
            status: string;
            event: string;
        }>;
        eta: string;               // Estimated arrival
        etd: string;               // Estimated departure
    };
}

/**
 * Port Fees & Demurrage Calculator
 */
export interface DemurrageCalculatorRequest {
    portCode: string;            // "USNYC", "CNSHA"
    containerType: string;       // "20GP", "40HC"
    arrivalDate: string;         // ISO date
    pickupDate?: string;         // ISO date (if known)
}

export interface DemurrageCalculatorResponse {
    success: boolean;
    port: {
        code: string;
        name: string;
        country: string;
    };
    fees: {
        portCharges: number;
        terminalHandling: number;
        documentation: number;
        total: number;
    };
    demurrage: {
        freeDays: number;         // Free storage period
        ratePerDay: number;       // Cost after free period
        currentDays?: number;     // Days already elapsed
        currentCost?: number;     // Total demurrage owed
        projectedCost?: {         // If pickupDate provided
            days: number;
            cost: number;
        };
    };
    warnings: string[];          // e.g., "Port congestion - delays expected"
}

/**
 * Distance & Transit Time Calculator
 */
export interface DistanceCalculatorRequest {
    origin: string;              // Port code or coordinates
    destination: string;         // Port code or coordinates
    routeType?: 'fastest' | 'shortest' | 'economical';
}

export interface DistanceCalculatorResponse {
    success: boolean;
    route: {
        distance: {
            nauticalMiles: number;
            kilometers: number;
        };
        transitTime: {
            fast: string;        // "20-22 days" (18-20 knots)
            standard: string;    // "25-28 days" (14-16 knots)
            economy: string;     // "30-35 days" (10-12 knots)
        };
        waypoints: Array<{
            name: string;
            lat: number;
            lon: number;
        }>;
        viaCanal?: 'Suez' | 'Panama';
    };
    alternatives?: Array<{
        routeName: string;
        distance: number;
        transitTime: string;
    }>;
}

/**
 * Carbon Emissions Calculator (ISO 14083 compliant)
 */
export interface CarbonCalculatorRequest {
    serviceType: SeaRatesServiceType;
    origin: string;
    destination: string;
    weight: number;              // kg
    volume?: number;             // CBM
}

export interface CarbonCalculatorResponse {
    success: boolean;
    emissions: {
        totalKgCO2: number;
        perKg: number;
        perTEU: number;
        equivalent: {
            trees: number;       // Trees needed to offset
            cars: number;        // Equivalent car km
        };
    };
    comparison: {
        air: number;             // CO2 if shipped by air
        road: number;            // CO2 if shipped by truck
        rail: number;            // CO2 if shipped by train
    };
    offset: {
        available: boolean;
        costUSD: number;         // Cost to offset
        provider: string;
    };
    certified: boolean;          // ISO 14083 compliant
}

/**
 * Load Calculator - 3D container optimization
 */
export interface LoadCalculatorRequest {
    containerType: string;       // "20GP", "40HC"
    cargo: Array<{
        length: number;          // cm
        width: number;           // cm
        height: number;          // cm
        weight: number;          // kg
        quantity: number;
        stackable: boolean;
        rotate: boolean;
    }>;
}

export interface LoadCalculatorResponse {
    success: boolean;
    optimization: {
        containersFilled: number;
        utilizationPercent: number;
        totalVolume: number;
        totalWeight: number;
    };
    visualization: {
        imageUrl: string;        // 3D render URL
        pdfUrl: string;          // Loading plan PDF
    };
    placement: Array<{
        item: string;
        position: { x: number; y: number; z: number };
        rotation: number;
    }>;
    warnings: string[];          // e.g., "Weight exceeds container limit"
}

/**
 * Freight Rate Index - Market intelligence
 */
export interface FreightIndexRequest {
    route?: string;              // "Shanghai-LA" or null for global
    serviceType?: SeaRatesServiceType;
}

export interface FreightIndexResponse {
    success: boolean;
    index: {
        current: number;
        change: number;          // % change from last week
        trend: 'rising' | 'falling' | 'stable';
        historical: Array<{
            date: string;
            value: number;
        }>;
    };
    recommendation: string;      // "Rates are HIGH - consider waiting"
    alerts: Array<{
        route: string;
        message: string;         // "Shanghai-LA rates down 15%"
        urgency: 'high' | 'medium' | 'low';
    }>;
}

/**
 * Main API Call Function
 * Routes requests through Firebase Functions to keep API keys secure
 * INCLUDES 24-HOUR CACHE to protect 50 call/month limit
 */
export async function callSeaRatesAPI<T>(
    endpoint: string,
    params: any,
    options?: {
        useSandbox?: boolean;
        timeout?: number;
        bypassCache?: boolean;  // Force fresh API call (use sparingly!)
    }
): Promise<T> {
    try {
        // Check if feature is enabled
        const featureName = endpoint.split('/')[1];
        const isEnabled = SEARATES_CONFIG.features[featureName as keyof typeof SEARATES_CONFIG.features];
        
        if (!isEnabled) {
            throw new Error(`Feature ${featureName} not yet implemented. Coming in Phase 2!`);
        }
        
        // CRITICAL: Check cache first (protects 50 call/month limit!)
        if (!options?.bypassCache) {
            const cachedData = getCachedResponse<T>(endpoint, params);
            if (cachedData) {
                showToast('📦 Showing cached rates (updated <24h ago)', 'info', 3000);
                return cachedData;
            }
        }
        
        // Cache miss - make real API call
        console.log(`[SeaRates API] Making real API call - will count against 50/month limit`);
        
        // Call through Firebase Function (keeps API keys secure)
        const { functions, getFunctions } = await import('./firebase');
        const currentFunctions = functions || getFunctions();
        
        if (!currentFunctions) {
            throw new Error('Firebase Functions not initialized');
        }
        
        const seaRatesProxy = currentFunctions.httpsCallable('seaRatesProxy');
        
        // Set timeout
        const timeoutMs = options?.timeout || 30000; // 30 seconds default
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SeaRates API timeout')), timeoutMs)
        );
        
        // Make API call
        const resultPromise = seaRatesProxy({
            endpoint,
            params,
            useSandbox: options?.useSandbox || false
        });
        
        const result = await Promise.race([resultPromise, timeoutPromise]) as any;
        const data = result.data;
        
        if (!data.success) {
            throw new Error(data.error || 'SeaRates API error');
        }
        
        // Store in cache for next 24 hours
        setCachedResponse(endpoint, params, data);
        
        return data as T;
        
    } catch (error: any) {
        console.error('[SeaRates API Error]', error);
        
        // User-friendly error messages
        if (error.message.includes('timeout')) {
            showToast('⏱️ Request timed out. Please try again.', 'error');
        } else if (error.message.includes('not yet implemented')) {
            showToast(error.message, 'info', 5000);
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            showToast('📊 Monthly API limit reached. Upgrade to Pro for unlimited access!', 'warning', 8000);
        } else {
            showToast('Failed to fetch real-time data. Using AI estimates.', 'warning');
        }
        
        throw error;
    }
}

/**
 * Convenience wrapper for Logistics Explorer
 */
export async function getLogisticsRates(
    request: LogisticsExplorerRequest
): Promise<LogisticsExplorerResponse> {
    return callSeaRatesAPI<LogisticsExplorerResponse>(
        SEARATES_CONFIG.endpoints.logisticsExplorer,
        {
            service_type: request.serviceType,
            origin: request.origin,
            destination: request.destination,
            containers: request.containers,
            cargo: request.cargo,
            include_port_fees: request.includePortFees ?? true,
            include_co2: request.includeCO2 ?? true,
            currency: request.currency || State.currentCurrency.code
        },
        { timeout: 25000 } // 25 seconds for rate queries
    );
}

/**
 * Convenience wrapper for Container Tracking
 */
export async function trackContainer(
    request: ContainerTrackingRequest
): Promise<ContainerTrackingResponse> {
    return callSeaRatesAPI<ContainerTrackingResponse>(
        SEARATES_CONFIG.endpoints.containerTracking,
        {
            container_number: request.containerNumber,
            bill_of_lading: request.billOfLading,
            carrier_code: request.carrierCode
        },
        { timeout: 15000 }
    );
}

/**
 * Convenience wrapper for Demurrage Calculator
 */
export async function calculateDemurrage(
    request: DemurrageCalculatorRequest
): Promise<DemurrageCalculatorResponse> {
    return callSeaRatesAPI<DemurrageCalculatorResponse>(
        SEARATES_CONFIG.endpoints.demurrageCalculator,
        {
            port_code: request.portCode,
            container_type: request.containerType,
            arrival_date: request.arrivalDate,
            pickup_date: request.pickupDate
        },
        { timeout: 10000 }
    );
}

/**
 * Convenience wrapper for Distance Calculator
 */
export async function calculateDistance(
    request: DistanceCalculatorRequest
): Promise<DistanceCalculatorResponse> {
    return callSeaRatesAPI<DistanceCalculatorResponse>(
        SEARATES_CONFIG.endpoints.distanceCalculator,
        {
            origin: request.origin,
            destination: request.destination,
            route_type: request.routeType || 'fastest'
        },
        { timeout: 10000 }
    );
}

/**
 * Convenience wrapper for Carbon Calculator
 */
export async function calculateCarbon(
    request: CarbonCalculatorRequest
): Promise<CarbonCalculatorResponse> {
    return callSeaRatesAPI<CarbonCalculatorResponse>(
        SEARATES_CONFIG.endpoints.carbonCalculator,
        {
            service_type: request.serviceType,
            origin: request.origin,
            destination: request.destination,
            weight: request.weight,
            volume: request.volume
        },
        { timeout: 10000 }
    );
}

/**
 * Convenience wrapper for Load Calculator
 */
export async function optimizeLoad(
    request: LoadCalculatorRequest
): Promise<LoadCalculatorResponse> {
    return callSeaRatesAPI<LoadCalculatorResponse>(
        SEARATES_CONFIG.endpoints.loadCalculator,
        {
            container_type: request.containerType,
            cargo: request.cargo
        },
        { timeout: 15000 }
    );
}

/**
 * Convenience wrapper for Freight Index
 */
export async function getFreightIndex(
    request: FreightIndexRequest = {}
): Promise<FreightIndexResponse> {
    return callSeaRatesAPI<FreightIndexResponse>(
        SEARATES_CONFIG.endpoints.freightIndex,
        {
            route: request.route,
            service_type: request.serviceType
        },
        { timeout: 10000 }
    );
}

/**
 * Helper: Transform SeaRates response to our Quote format
 */
export function transformSeaRatesToQuote(
    seaRatesQuote: LogisticsExplorerResponse['quotes'][0],
    serviceType: SeaRatesServiceType
): Quote {
    return {
        carrierName: seaRatesQuote.carrier,
        carrierType: serviceType.toUpperCase(),
        totalCost: seaRatesQuote.totalRate,
        estimatedTransitTime: seaRatesQuote.transitTime,
        serviceProvider: 'SeaRates API (Real-Time)',
        isSpecialOffer: false,
        chargeableWeight: 0,
        chargeableWeightUnit: 'N/A',
        weightBasis: serviceType === 'fcl' ? 'Per Container' : 'Per Volume',
        costBreakdown: {
            baseShippingCost: seaRatesQuote.breakdown.oceanFreight,
            fuelSurcharge: seaRatesQuote.breakdown.fuelSurcharge,
            estimatedCustomsAndTaxes: seaRatesQuote.breakdown.portFees || 0,
            optionalInsuranceCost: 0,
            ourServiceFee: seaRatesQuote.breakdown.otherCharges
        }
    };
}

/**
 * Helper: Check if SeaRates API is available
 */
export async function isSeaRatesAvailable(): Promise<boolean> {
    try {
        const { functions, getFunctions } = await import('./firebase');
        const currentFunctions = functions || getFunctions();
        
        if (!currentFunctions) return false;
        
        // Try to call a lightweight endpoint to check availability
        const healthCheck = currentFunctions.httpsCallable('seaRatesHealthCheck');
        const result = await Promise.race([
            healthCheck(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]) as any;
        
        return result?.data?.available === true;
    } catch {
        return false;
    }
}

export default {
    getLogisticsRates,
    trackContainer,
    calculateDemurrage,
    calculateDistance,
    calculateCarbon,
    optimizeLoad,
    getFreightIndex,
    isSeaRatesAvailable,
    transformSeaRatesToQuote
};
