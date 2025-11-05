/**
 * Country Detection & Auto-Configuration System
 * 
 * Automatically detects user's country and configures:
 * - Currency
 * - Language
 * - Local charges
 * - Compliance rules
 * - Tax settings
 */

import { State } from './state';

export interface CountryDetectionResult {
    countryCode: string;
    countryName: string;
    currency: string;
    language: string;
    timezone: string;
    latitude?: number;
    longitude?: number;
}

export interface CountryConfig {
    currency: string;
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    measurementSystem: 'metric' | 'imperial';
    phonePrefix: string;
    taxLabel: string;
    taxRate: number;
}

/**
 * Country configurations mapping
 */
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
    'US': {
        currency: 'USD',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        measurementSystem: 'imperial',
        phonePrefix: '+1',
        taxLabel: 'Sales Tax',
        taxRate: 0.08
    },
    'CA': {
        currency: 'CAD',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        measurementSystem: 'metric',
        phonePrefix: '+1',
        taxLabel: 'GST/HST',
        taxRate: 0.13
    },
    'GB': {
        currency: 'GBP',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        measurementSystem: 'metric',
        phonePrefix: '+44',
        taxLabel: 'VAT',
        taxRate: 0.20
    },
    'DE': {
        currency: 'EUR',
        language: 'de',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: '24h',
        measurementSystem: 'metric',
        phonePrefix: '+49',
        taxLabel: 'MwSt',
        taxRate: 0.19
    },
    'FR': {
        currency: 'EUR',
        language: 'fr',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        measurementSystem: 'metric',
        phonePrefix: '+33',
        taxLabel: 'TVA',
        taxRate: 0.20
    },
    'CN': {
        currency: 'CNY',
        language: 'zh',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        measurementSystem: 'metric',
        phonePrefix: '+86',
        taxLabel: 'VAT',
        taxRate: 0.13
    },
    'JP': {
        currency: 'JPY',
        language: 'ja',
        dateFormat: 'YYYY/MM/DD',
        timeFormat: '24h',
        measurementSystem: 'metric',
        phonePrefix: '+81',
        taxLabel: 'Consumption Tax',
        taxRate: 0.10
    },
    'IN': {
        currency: 'INR',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        measurementSystem: 'metric',
        phonePrefix: '+91',
        taxLabel: 'GST',
        taxRate: 0.18
    },
    'SG': {
        currency: 'SGD',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        measurementSystem: 'metric',
        phonePrefix: '+65',
        taxLabel: 'GST',
        taxRate: 0.08
    },
    'AU': {
        currency: 'AUD',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        measurementSystem: 'metric',
        phonePrefix: '+61',
        taxLabel: 'GST',
        taxRate: 0.10
    },
    'AE': {
        currency: 'AED',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        measurementSystem: 'metric',
        phonePrefix: '+971',
        taxLabel: 'VAT',
        taxRate: 0.05
    },
    'BR': {
        currency: 'BRL',
        language: 'pt',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        measurementSystem: 'metric',
        phonePrefix: '+55',
        taxLabel: 'ICMS',
        taxRate: 0.18
    },
    'MX': {
        currency: 'MXN',
        language: 'es',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        measurementSystem: 'metric',
        phonePrefix: '+52',
        taxLabel: 'IVA',
        taxRate: 0.16
    },
    'ES': {
        currency: 'EUR',
        language: 'es',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        measurementSystem: 'metric',
        phonePrefix: '+34',
        taxLabel: 'IVA',
        taxRate: 0.21
    },
    'IT': {
        currency: 'EUR',
        language: 'it',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        measurementSystem: 'metric',
        phonePrefix: '+39',
        taxLabel: 'IVA',
        taxRate: 0.22
    },
    'NL': {
        currency: 'EUR',
        language: 'nl',
        dateFormat: 'DD-MM-YYYY',
        timeFormat: '24h',
        measurementSystem: 'metric',
        phonePrefix: '+31',
        taxLabel: 'BTW',
        taxRate: 0.21
    },
    'KR': {
        currency: 'KRW',
        language: 'ko',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '12h',
        measurementSystem: 'metric',
        phonePrefix: '+82',
        taxLabel: 'VAT',
        taxRate: 0.10
    },
    'SA': {
        currency: 'SAR',
        language: 'ar',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        measurementSystem: 'metric',
        phonePrefix: '+966',
        taxLabel: 'VAT',
        taxRate: 0.15
    },
    'ZA': {
        currency: 'ZAR',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        measurementSystem: 'metric',
        phonePrefix: '+27',
        taxLabel: 'VAT',
        taxRate: 0.15
    },
    'TH': {
        currency: 'THB',
        language: 'th',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        measurementSystem: 'metric',
        phonePrefix: '+66',
        taxLabel: 'VAT',
        taxRate: 0.07
    }
};

/**
 * Detect user's country using multiple methods
 */
export async function detectUserCountry(): Promise<CountryDetectionResult | null> {
    try {
        // Method 1: Try IP geolocation API (free tier)
        const ipApiResult = await detectViaIpApi();
        if (ipApiResult) return ipApiResult;

        // Method 2: Try browser timezone as fallback
        const timezoneResult = detectViaTimezone();
        if (timezoneResult) return timezoneResult;

        // Method 3: Try browser language as last resort
        const languageResult = detectViaLanguage();
        return languageResult;

    } catch (error) {
        console.error('Country detection failed:', error);
        return null;
    }
}

/**
 * Detect country via IP geolocation API
 */
async function detectViaIpApi(): Promise<CountryDetectionResult | null> {
    try {
        // Using ipapi.co free tier (no API key required, 1000 requests/day)
        const response = await fetch('https://ipapi.co/json/', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('IP API failed');
        }

        const data = await response.json();

        return {
            countryCode: data.country_code,
            countryName: data.country_name,
            currency: data.currency,
            language: data.languages?.split(',')[0] || 'en',
            timezone: data.timezone,
            latitude: data.latitude,
            longitude: data.longitude
        };
    } catch (error) {
        console.warn('IP API detection failed:', error);
        return null;
    }
}

/**
 * Detect country via browser timezone
 */
function detectViaTimezone(): CountryDetectionResult | null {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Map common timezones to countries
        const timezoneCountryMap: Record<string, string> = {
            'America/New_York': 'US',
            'America/Chicago': 'US',
            'America/Denver': 'US',
            'America/Los_Angeles': 'US',
            'America/Toronto': 'CA',
            'America/Vancouver': 'CA',
            'Europe/London': 'GB',
            'Europe/Berlin': 'DE',
            'Europe/Paris': 'FR',
            'Europe/Amsterdam': 'NL',
            'Europe/Madrid': 'ES',
            'Europe/Rome': 'IT',
            'Asia/Shanghai': 'CN',
            'Asia/Tokyo': 'JP',
            'Asia/Seoul': 'KR',
            'Asia/Singapore': 'SG',
            'Asia/Dubai': 'AE',
            'Asia/Kolkata': 'IN',
            'Asia/Bangkok': 'TH',
            'Australia/Sydney': 'AU',
            'America/Sao_Paulo': 'BR',
            'America/Mexico_City': 'MX',
            'Asia/Riyadh': 'SA',
            'Africa/Johannesburg': 'ZA'
        };

        const countryCode = timezoneCountryMap[timezone];
        if (!countryCode) return null;

        const config = COUNTRY_CONFIGS[countryCode];
        return {
            countryCode,
            countryName: getCountryName(countryCode),
            currency: config?.currency || 'USD',
            language: config?.language || 'en',
            timezone
        };
    } catch (error) {
        console.warn('Timezone detection failed:', error);
        return null;
    }
}

/**
 * Detect country via browser language
 */
function detectViaLanguage(): CountryDetectionResult | null {
    try {
        const language = navigator.language || 'en-US';
        const [lang, region] = language.split('-');
        
        const countryCode = region || 'US';
        const config = COUNTRY_CONFIGS[countryCode] || COUNTRY_CONFIGS['US'];

        return {
            countryCode,
            countryName: getCountryName(countryCode),
            currency: config.currency,
            language: lang,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    } catch (error) {
        console.warn('Language detection failed:', error);
        return null;
    }
}

/**
 * Apply country configuration to app
 */
export async function applyCountryConfiguration(detection: CountryDetectionResult) {
    const config = COUNTRY_CONFIGS[detection.countryCode];
    
    if (!config) {
        console.warn(`No configuration for country: ${detection.countryCode}`);
        return;
    }

    // Store detected country in state
    State.userCountry = {
        code: detection.countryCode,
        name: detection.countryName,
        currency: config.currency,
        language: config.language,
        timezone: detection.timezone
    };

    // Apply language by dispatching locale-change event
    window.dispatchEvent(new CustomEvent('locale-change', {
        detail: {
            language: config.language,
            country: detection.countryCode,
            currency: config.currency
        }
    }));

    // Apply currency symbol
    State.currencySymbol = getCurrencySymbol(config.currency);
    State.currencyCode = config.currency;
    
    // Update localStorage for language
    localStorage.setItem('vcanship_language', config.language);

    // Update all price displays
    updatePriceDisplays(config.currency);

    // Log for debugging
    console.log(`🌍 Country detected: ${detection.countryName} (${detection.countryCode})`);
    console.log(`💰 Currency: ${config.currency}`);
    console.log(`🌐 Language: ${config.language}`);
    console.log(`🕐 Timezone: ${detection.timezone}`);

    // Store in localStorage for future visits
    localStorage.setItem('vcanship_detected_country', JSON.stringify({
        ...detection,
        config,
        detectedAt: new Date().toISOString()
    }));
}

/**
 * Get cached country detection
 */
export function getCachedCountryDetection(): CountryDetectionResult | null {
    try {
        const cached = localStorage.getItem('vcanship_detected_country');
        if (!cached) return null;

        const data = JSON.parse(cached);
        const detectedAt = new Date(data.detectedAt);
        const hoursSinceDetection = (Date.now() - detectedAt.getTime()) / (1000 * 60 * 60);

        // Cache valid for 24 hours
        if (hoursSinceDetection < 24) {
            return data;
        }

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Initialize country detection on app load
 */
export async function initializeCountryDetection() {
    // Check cache first
    const cached = getCachedCountryDetection();
    if (cached) {
        console.log('Using cached country detection');
        await applyCountryConfiguration(cached);
        return cached;
    }

    // Detect country
    const detection = await detectUserCountry();
    if (detection) {
        await applyCountryConfiguration(detection);
        return detection;
    }

    // Fallback to US
    console.log('Country detection failed, defaulting to US');
    await applyCountryConfiguration({
        countryCode: 'US',
        countryName: 'United States',
        currency: 'USD',
        language: 'en',
        timezone: 'America/New_York'
    });

    return null;
}

/**
 * Get country name from code
 */
function getCountryName(code: string): string {
    const names: Record<string, string> = {
        'US': 'United States',
        'CA': 'Canada',
        'GB': 'United Kingdom',
        'DE': 'Germany',
        'FR': 'France',
        'CN': 'China',
        'JP': 'Japan',
        'IN': 'India',
        'SG': 'Singapore',
        'AU': 'Australia',
        'AE': 'United Arab Emirates',
        'BR': 'Brazil',
        'MX': 'Mexico',
        'ES': 'Spain',
        'IT': 'Italy',
        'NL': 'Netherlands',
        'KR': 'South Korea',
        'SA': 'Saudi Arabia',
        'ZA': 'South Africa',
        'TH': 'Thailand'
    };
    return names[code] || code;
}

/**
 * Get currency symbol
 */
function getCurrencySymbol(code: string): string {
    const symbols: Record<string, string> = {
        'USD': '$',
        'CAD': 'C$',
        'GBP': '£',
        'EUR': '€',
        'CNY': '¥',
        'JPY': '¥',
        'INR': '₹',
        'SGD': 'S$',
        'AUD': 'A$',
        'AED': 'د.إ',
        'BRL': 'R$',
        'MXN': 'MX$',
        'KRW': '₩',
        'SAR': '﷼',
        'ZAR': 'R',
        'THB': '฿'
    };
    return symbols[code] || code;
}

/**
 * Update all price displays with new currency
 */
function updatePriceDisplays(currency: string) {
    const symbol = getCurrencySymbol(currency);
    
    // Update all elements with data-price attribute
    document.querySelectorAll('[data-price]').forEach(element => {
        const price = element.getAttribute('data-price');
        if (price) {
            element.textContent = `${symbol}${price}`;
        }
    });
}

/**
 * Allow user to manually change country
 */
export async function changeCountry(countryCode: string) {
    const config = COUNTRY_CONFIGS[countryCode];
    if (!config) {
        console.error(`Invalid country code: ${countryCode}`);
        return;
    }

    await applyCountryConfiguration({
        countryCode,
        countryName: getCountryName(countryCode),
        currency: config.currency,
        language: config.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Reload page to apply all changes
    window.location.reload();
}
