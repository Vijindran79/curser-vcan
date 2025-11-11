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
/**
 * Comprehensive country configurations for worldwide support
 * Covers 195+ countries with proper currency, language, and localization settings
 */
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
    // NORTH AMERICA
    'US': { currency: 'USD', language: 'en', dateFormat: 'MM/DD/YYYY', timeFormat: '12h', measurementSystem: 'imperial', phonePrefix: '+1', taxLabel: 'Sales Tax', taxRate: 0.08 },
    'CA': { currency: 'CAD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+1', taxLabel: 'GST/HST', taxRate: 0.13 },
    'MX': { currency: 'MXN', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+52', taxLabel: 'IVA', taxRate: 0.16 },

    // CENTRAL AMERICA & CARIBBEAN
    'GT': { currency: 'GTQ', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+502', taxLabel: 'IVA', taxRate: 0.12 },
    'BZ': { currency: 'BZD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'imperial', phonePrefix: '+501', taxLabel: 'GST', taxRate: 0.125 },
    'SV': { currency: 'USD', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+503', taxLabel: 'IVA', taxRate: 0.13 },
    'HN': { currency: 'HNL', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+504', taxLabel: 'ISV', taxRate: 0.15 },
    'NI': { currency: 'NIO', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+505', taxLabel: 'IVA', taxRate: 0.15 },
    'CR': { currency: 'CRC', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+506', taxLabel: 'IVA', taxRate: 0.13 },
    'PA': { currency: 'PAB', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+507', taxLabel: 'ITBMS', taxRate: 0.07 },
    'CU': { currency: 'CUP', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+53', taxLabel: 'Tax', taxRate: 0.10 },
    'JM': { currency: 'JMD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+1876', taxLabel: 'GCT', taxRate: 0.15 },
    'HT': { currency: 'HTG', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+509', taxLabel: 'TCA', taxRate: 0.10 },
    'DO': { currency: 'DOP', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+1809', taxLabel: 'ITBIS', taxRate: 0.18 },
    'PR': { currency: 'USD', language: 'es', dateFormat: 'MM/DD/YYYY', timeFormat: '12h', measurementSystem: 'imperial', phonePrefix: '+1787', taxLabel: 'IVU', taxRate: 0.115 },
    'TT': { currency: 'TTD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+1868', taxLabel: 'VAT', taxRate: 0.125 },
    'BB': { currency: 'BBD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+1246', taxLabel: 'VAT', taxRate: 0.175 },
    'BS': { currency: 'BSD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'imperial', phonePrefix: '+1242', taxLabel: 'VAT', taxRate: 0.10 },

    // SOUTH AMERICA
    'BR': { currency: 'BRL', language: 'pt', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+55', taxLabel: 'ICMS', taxRate: 0.18 },
    'AR': { currency: 'ARS', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+54', taxLabel: 'IVA', taxRate: 0.21 },
    'CL': { currency: 'CLP', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+56', taxLabel: 'IVA', taxRate: 0.19 },
    'CO': { currency: 'COP', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+57', taxLabel: 'IVA', taxRate: 0.19 },
    'PE': { currency: 'PEN', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+51', taxLabel: 'IGV', taxRate: 0.18 },
    'VE': { currency: 'VES', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+58', taxLabel: 'IVA', taxRate: 0.16 },
    'EC': { currency: 'USD', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+593', taxLabel: 'IVA', taxRate: 0.12 },
    'BO': { currency: 'BOB', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+591', taxLabel: 'IVA', taxRate: 0.13 },
    'PY': { currency: 'PYG', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+595', taxLabel: 'IVA', taxRate: 0.10 },
    'UY': { currency: 'UYU', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+598', taxLabel: 'IVA', taxRate: 0.22 },
    'GY': { currency: 'GYD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+592', taxLabel: 'VAT', taxRate: 0.14 },
    'SR': { currency: 'SRD', language: 'nl', dateFormat: 'DD-MM-YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+597', taxLabel: 'OB', taxRate: 0.10 },

    // WESTERN EUROPE
    'GB': { currency: 'GBP', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+44', taxLabel: 'VAT', taxRate: 0.20 },
    'IE': { currency: 'EUR', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+353', taxLabel: 'VAT', taxRate: 0.23 },
    'FR': { currency: 'EUR', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+33', taxLabel: 'TVA', taxRate: 0.20 },
    'DE': { currency: 'EUR', language: 'de', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+49', taxLabel: 'MwSt', taxRate: 0.19 },
    'ES': { currency: 'EUR', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+34', taxLabel: 'IVA', taxRate: 0.21 },
    'IT': { currency: 'EUR', language: 'it', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+39', taxLabel: 'IVA', taxRate: 0.22 },
    'PT': { currency: 'EUR', language: 'pt', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+351', taxLabel: 'IVA', taxRate: 0.23 },
    'NL': { currency: 'EUR', language: 'nl', dateFormat: 'DD-MM-YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+31', taxLabel: 'BTW', taxRate: 0.21 },
    'BE': { currency: 'EUR', language: 'nl', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+32', taxLabel: 'BTW', taxRate: 0.21 },
    'LU': { currency: 'EUR', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+352', taxLabel: 'TVA', taxRate: 0.17 },
    'CH': { currency: 'CHF', language: 'de', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+41', taxLabel: 'MWST', taxRate: 0.077 },
    'AT': { currency: 'EUR', language: 'de', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+43', taxLabel: 'USt', taxRate: 0.20 },
    'MC': { currency: 'EUR', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+377', taxLabel: 'TVA', taxRate: 0.20 },

    // NORTHERN EUROPE
    'SE': { currency: 'SEK', language: 'sv', dateFormat: 'YYYY-MM-DD', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+46', taxLabel: 'Moms', taxRate: 0.25 },
    'NO': { currency: 'NOK', language: 'no', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+47', taxLabel: 'MVA', taxRate: 0.25 },
    'DK': { currency: 'DKK', language: 'da', dateFormat: 'DD-MM-YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+45', taxLabel: 'Moms', taxRate: 0.25 },
    'FI': { currency: 'EUR', language: 'fi', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+358', taxLabel: 'ALV', taxRate: 0.24 },
    'IS': { currency: 'ISK', language: 'is', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+354', taxLabel: 'VSK', taxRate: 0.24 },

    // EASTERN EUROPE
    'PL': { currency: 'PLN', language: 'pl', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+48', taxLabel: 'VAT', taxRate: 0.23 },
    'CZ': { currency: 'CZK', language: 'cs', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+420', taxLabel: 'DPH', taxRate: 0.21 },
    'SK': { currency: 'EUR', language: 'sk', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+421', taxLabel: 'DPH', taxRate: 0.20 },
    'HU': { currency: 'HUF', language: 'hu', dateFormat: 'YYYY.MM.DD', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+36', taxLabel: 'ÁFA', taxRate: 0.27 },
    'RO': { currency: 'RON', language: 'ro', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+40', taxLabel: 'TVA', taxRate: 0.19 },
    'BG': { currency: 'BGN', language: 'bg', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+359', taxLabel: 'ДДС', taxRate: 0.20 },
    'HR': { currency: 'EUR', language: 'hr', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+385', taxLabel: 'PDV', taxRate: 0.25 },
    'SI': { currency: 'EUR', language: 'sl', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+386', taxLabel: 'DDV', taxRate: 0.22 },
    'RS': { currency: 'RSD', language: 'sr', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+381', taxLabel: 'PDV', taxRate: 0.20 },
    'UA': { currency: 'UAH', language: 'uk', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+380', taxLabel: 'ПДВ', taxRate: 0.20 },
    'BY': { currency: 'BYN', language: 'ru', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+375', taxLabel: 'НДС', taxRate: 0.20 },
    'MD': { currency: 'MDL', language: 'ro', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+373', taxLabel: 'TVA', taxRate: 0.20 },
    'LT': { currency: 'EUR', language: 'lt', dateFormat: 'YYYY-MM-DD', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+370', taxLabel: 'PVM', taxRate: 0.21 },
    'LV': { currency: 'EUR', language: 'lv', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+371', taxLabel: 'PVN', taxRate: 0.21 },
    'EE': { currency: 'EUR', language: 'et', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+372', taxLabel: 'KM', taxRate: 0.20 },

    // BALKANS
    'GR': { currency: 'EUR', language: 'el', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+30', taxLabel: 'ΦΠΑ', taxRate: 0.24 },
    'AL': { currency: 'ALL', language: 'sq', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+355', taxLabel: 'TVSH', taxRate: 0.20 },
    'MK': { currency: 'MKD', language: 'mk', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+389', taxLabel: 'ДДВ', taxRate: 0.18 },
    'BA': { currency: 'BAM', language: 'bs', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+387', taxLabel: 'PDV', taxRate: 0.17 },
    'ME': { currency: 'EUR', language: 'sr', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+382', taxLabel: 'PDV', taxRate: 0.21 },
    'XK': { currency: 'EUR', language: 'sq', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+383', taxLabel: 'TVSH', taxRate: 0.18 },

    // RUSSIA & CENTRAL ASIA
    'RU': { currency: 'RUB', language: 'ru', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+7', taxLabel: 'НДС', taxRate: 0.20 },
    'KZ': { currency: 'KZT', language: 'kk', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+7', taxLabel: 'ҚҚС', taxRate: 0.12 },
    'UZ': { currency: 'UZS', language: 'uz', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+998', taxLabel: 'QQS', taxRate: 0.12 },
    'TM': { currency: 'TMT', language: 'tk', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+993', taxLabel: 'VAT', taxRate: 0.15 },
    'KG': { currency: 'KGS', language: 'ky', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+996', taxLabel: 'НДС', taxRate: 0.12 },
    'TJ': { currency: 'TJS', language: 'tg', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+992', taxLabel: 'АА', taxRate: 0.18 },
    'AM': { currency: 'AMD', language: 'hy', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+374', taxLabel: 'ԱԱՀ', taxRate: 0.20 },
    'AZ': { currency: 'AZN', language: 'az', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+994', taxLabel: 'ƏDV', taxRate: 0.18 },
    'GE': { currency: 'GEL', language: 'ka', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+995', taxLabel: 'დღგ', taxRate: 0.18 },

    // MIDDLE EAST
    'TR': { currency: 'TRY', language: 'tr', dateFormat: 'DD.MM.YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+90', taxLabel: 'KDV', taxRate: 0.18 },
    'AE': { currency: 'AED', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+971', taxLabel: 'VAT', taxRate: 0.05 },
    'SA': { currency: 'SAR', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+966', taxLabel: 'VAT', taxRate: 0.15 },
    'QA': { currency: 'QAR', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+974', taxLabel: 'VAT', taxRate: 0.00 },
    'KW': { currency: 'KWD', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+965', taxLabel: 'VAT', taxRate: 0.00 },
    'BH': { currency: 'BHD', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+973', taxLabel: 'VAT', taxRate: 0.10 },
    'OM': { currency: 'OMR', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+968', taxLabel: 'VAT', taxRate: 0.05 },
    'JO': { currency: 'JOD', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+962', taxLabel: 'GST', taxRate: 0.16 },
    'LB': { currency: 'LBP', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+961', taxLabel: 'VAT', taxRate: 0.11 },
    'SY': { currency: 'SYP', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+963', taxLabel: 'VAT', taxRate: 0.00 },
    'IQ': { currency: 'IQD', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+964', taxLabel: 'VAT', taxRate: 0.00 },
    'IL': { currency: 'ILS', language: 'he', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+972', taxLabel: 'VAT', taxRate: 0.17 },
    'PS': { currency: 'ILS', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+970', taxLabel: 'VAT', taxRate: 0.16 },
    'YE': { currency: 'YER', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+967', taxLabel: 'GST', taxRate: 0.05 },
    'IR': { currency: 'IRR', language: 'fa', dateFormat: 'YYYY/MM/DD', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+98', taxLabel: 'VAT', taxRate: 0.09 },

    // SOUTH ASIA
    'IN': { currency: 'INR', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+91', taxLabel: 'GST', taxRate: 0.18 },
    'PK': { currency: 'PKR', language: 'ur', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+92', taxLabel: 'GST', taxRate: 0.17 },
    'BD': { currency: 'BDT', language: 'bn', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+880', taxLabel: 'VAT', taxRate: 0.15 },
    'LK': { currency: 'LKR', language: 'si', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+94', taxLabel: 'VAT', taxRate: 0.15 },
    'NP': { currency: 'NPR', language: 'ne', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+977', taxLabel: 'VAT', taxRate: 0.13 },
    'BT': { currency: 'BTN', language: 'dz', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+975', taxLabel: 'GST', taxRate: 0.00 },
    'MV': { currency: 'MVR', language: 'dv', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+960', taxLabel: 'GST', taxRate: 0.06 },
    'AF': { currency: 'AFN', language: 'ps', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+93', taxLabel: 'VAT', taxRate: 0.00 },

    // EAST ASIA
    'CN': { currency: 'CNY', language: 'zh', dateFormat: 'YYYY-MM-DD', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+86', taxLabel: 'VAT', taxRate: 0.13 },
    'JP': { currency: 'JPY', language: 'ja', dateFormat: 'YYYY/MM/DD', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+81', taxLabel: 'Consumption Tax', taxRate: 0.10 },
    'KR': { currency: 'KRW', language: 'ko', dateFormat: 'YYYY-MM-DD', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+82', taxLabel: 'VAT', taxRate: 0.10 },
    'TW': { currency: 'TWD', language: 'zh', dateFormat: 'YYYY/MM/DD', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+886', taxLabel: 'VAT', taxRate: 0.05 },
    'HK': { currency: 'HKD', language: 'zh', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+852', taxLabel: 'No VAT', taxRate: 0.00 },
    'MO': { currency: 'MOP', language: 'zh', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+853', taxLabel: 'No VAT', taxRate: 0.00 },
    'MN': { currency: 'MNT', language: 'mn', dateFormat: 'YYYY.MM.DD', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+976', taxLabel: 'НӨАТ', taxRate: 0.10 },
    'KP': { currency: 'KPW', language: 'ko', dateFormat: 'YYYY-MM-DD', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+850', taxLabel: 'VAT', taxRate: 0.00 },

    // SOUTHEAST ASIA
    'TH': { currency: 'THB', language: 'th', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+66', taxLabel: 'VAT', taxRate: 0.07 },
    'VN': { currency: 'VND', language: 'vi', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+84', taxLabel: 'VAT', taxRate: 0.10 },
    'MY': { currency: 'MYR', language: 'ms', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+60', taxLabel: 'SST', taxRate: 0.06 },
    'SG': { currency: 'SGD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+65', taxLabel: 'GST', taxRate: 0.08 },
    'ID': { currency: 'IDR', language: 'id', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+62', taxLabel: 'PPN', taxRate: 0.11 },
    'PH': { currency: 'PHP', language: 'en', dateFormat: 'MM/DD/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+63', taxLabel: 'VAT', taxRate: 0.12 },
    'BN': { currency: 'BND', language: 'ms', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+673', taxLabel: 'No VAT', taxRate: 0.00 },
    'KH': { currency: 'KHR', language: 'km', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+855', taxLabel: 'VAT', taxRate: 0.10 },
    'LA': { currency: 'LAK', language: 'lo', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+856', taxLabel: 'VAT', taxRate: 0.10 },
    'MM': { currency: 'MMK', language: 'my', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+95', taxLabel: 'CIT', taxRate: 0.00 },
    'TL': { currency: 'USD', language: 'pt', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+670', taxLabel: 'VAT', taxRate: 0.00 },

    // OCEANIA
    'AU': { currency: 'AUD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+61', taxLabel: 'GST', taxRate: 0.10 },
    'NZ': { currency: 'NZD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+64', taxLabel: 'GST', taxRate: 0.15 },
    'PG': { currency: 'PGK', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+675', taxLabel: 'GST', taxRate: 0.10 },
    'FJ': { currency: 'FJD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+679', taxLabel: 'VAT', taxRate: 0.09 },
    'SB': { currency: 'SBD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+677', taxLabel: 'VAT', taxRate: 0.10 },
    'VU': { currency: 'VUV', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+678', taxLabel: 'VAT', taxRate: 0.15 },
    'NC': { currency: 'XPF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+687', taxLabel: 'TGC', taxRate: 0.11 },
    'PF': { currency: 'XPF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+689', taxLabel: 'TVA', taxRate: 0.13 },
    'WS': { currency: 'WST', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+685', taxLabel: 'VAGST', taxRate: 0.15 },
    'TO': { currency: 'TOP', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+676', taxLabel: 'CT', taxRate: 0.15 },

    // AFRICA - NORTH
    'EG': { currency: 'EGP', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+20', taxLabel: 'VAT', taxRate: 0.14 },
    'LY': { currency: 'LYD', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+218', taxLabel: 'VAT', taxRate: 0.00 },
    'TN': { currency: 'TND', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+216', taxLabel: 'TVA', taxRate: 0.19 },
    'DZ': { currency: 'DZD', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+213', taxLabel: 'TVA', taxRate: 0.19 },
    'MA': { currency: 'MAD', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+212', taxLabel: 'TVA', taxRate: 0.20 },
    'MR': { currency: 'MRU', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+222', taxLabel: 'TVA', taxRate: 0.14 },
    'SD': { currency: 'SDG', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+249', taxLabel: 'VAT', taxRate: 0.17 },
    'SS': { currency: 'SSP', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+211', taxLabel: 'VAT', taxRate: 0.00 },

    // AFRICA - WEST
    'NG': { currency: 'NGN', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+234', taxLabel: 'VAT', taxRate: 0.075 },
    'GH': { currency: 'GHS', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+233', taxLabel: 'VAT', taxRate: 0.125 },
    'CI': { currency: 'XOF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+225', taxLabel: 'TVA', taxRate: 0.18 },
    'SN': { currency: 'XOF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+221', taxLabel: 'TVA', taxRate: 0.18 },
    'ML': { currency: 'XOF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+223', taxLabel: 'TVA', taxRate: 0.18 },
    'BF': { currency: 'XOF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+226', taxLabel: 'TVA', taxRate: 0.18 },
    'NE': { currency: 'XOF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+227', taxLabel: 'TVA', taxRate: 0.19 },
    'TG': { currency: 'XOF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+228', taxLabel: 'TVA', taxRate: 0.18 },
    'BJ': { currency: 'XOF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+229', taxLabel: 'TVA', taxRate: 0.18 },
    'GM': { currency: 'GMD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+220', taxLabel: 'VAT', taxRate: 0.15 },
    'GW': { currency: 'XOF', language: 'pt', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+245', taxLabel: 'IVA', taxRate: 0.15 },
    'LR': { currency: 'LRD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'imperial', phonePrefix: '+231', taxLabel: 'GST', taxRate: 0.00 },
    'SL': { currency: 'SLL', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+232', taxLabel: 'GST', taxRate: 0.15 },

    // AFRICA - CENTRAL
    'CM': { currency: 'XAF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+237', taxLabel: 'TVA', taxRate: 0.1925 },
    'TD': { currency: 'XAF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+235', taxLabel: 'TVA', taxRate: 0.18 },
    'CF': { currency: 'XAF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+236', taxLabel: 'TVA', taxRate: 0.19 },
    'CG': { currency: 'XAF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+242', taxLabel: 'TVA', taxRate: 0.18 },
    'CD': { currency: 'CDF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+243', taxLabel: 'TVA', taxRate: 0.16 },
    'GA': { currency: 'XAF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+241', taxLabel: 'TVA', taxRate: 0.18 },
    'GQ': { currency: 'XAF', language: 'es', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+240', taxLabel: 'IVA', taxRate: 0.15 },
    'ST': { currency: 'STN', language: 'pt', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+239', taxLabel: 'IVA', taxRate: 0.15 },

    // AFRICA - EAST
    'KE': { currency: 'KES', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+254', taxLabel: 'VAT', taxRate: 0.16 },
    'TZ': { currency: 'TZS', language: 'sw', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+255', taxLabel: 'VAT', taxRate: 0.18 },
    'UG': { currency: 'UGX', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+256', taxLabel: 'VAT', taxRate: 0.18 },
    'RW': { currency: 'RWF', language: 'rw', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+250', taxLabel: 'VAT', taxRate: 0.18 },
    'BI': { currency: 'BIF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+257', taxLabel: 'TVA', taxRate: 0.18 },
    'ET': { currency: 'ETB', language: 'am', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+251', taxLabel: 'VAT', taxRate: 0.15 },
    'ER': { currency: 'ERN', language: 'ti', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+291', taxLabel: 'VAT', taxRate: 0.05 },
    'DJ': { currency: 'DJF', language: 'fr', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+253', taxLabel: 'TVA', taxRate: 0.10 },
    'SO': { currency: 'SOS', language: 'so', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+252', taxLabel: 'VAT', taxRate: 0.00 },
    'SC': { currency: 'SCR', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+248', taxLabel: 'VAT', taxRate: 0.15 },
    'MU': { currency: 'MUR', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+230', taxLabel: 'VAT', taxRate: 0.15 },
    'KM': { currency: 'KMF', language: 'ar', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+269', taxLabel: 'TVA', taxRate: 0.10 },
    'MG': { currency: 'MGA', language: 'mg', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+261', taxLabel: 'TVA', taxRate: 0.20 },

    // AFRICA - SOUTHERN
    'ZA': { currency: 'ZAR', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+27', taxLabel: 'VAT', taxRate: 0.15 },
    'ZW': { currency: 'ZWL', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+263', taxLabel: 'VAT', taxRate: 0.15 },
    'BW': { currency: 'BWP', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+267', taxLabel: 'VAT', taxRate: 0.12 },
    'NA': { currency: 'NAD', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+264', taxLabel: 'VAT', taxRate: 0.15 },
    'LS': { currency: 'LSL', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+266', taxLabel: 'VAT', taxRate: 0.15 },
    'SZ': { currency: 'SZL', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+268', taxLabel: 'VAT', taxRate: 0.15 },
    'MZ': { currency: 'MZN', language: 'pt', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+258', taxLabel: 'IVA', taxRate: 0.17 },
    'AO': { currency: 'AOA', language: 'pt', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', measurementSystem: 'metric', phonePrefix: '+244', taxLabel: 'IVA', taxRate: 0.14 },
    'ZM': { currency: 'ZMW', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+260', taxLabel: 'VAT', taxRate: 0.16 },
    'MW': { currency: 'MWK', language: 'en', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', measurementSystem: 'metric', phonePrefix: '+265', taxLabel: 'VAT', taxRate: 0.165 },
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
        
        // Comprehensive timezone to country mapping (195+ countries)
        const timezoneCountryMap: Record<string, string> = {
            // North America
            'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US', 'Pacific/Honolulu': 'US',
            'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA', 'America/Halifax': 'CA', 'America/Winnipeg': 'CA', 'America/St_Johns': 'CA',
            'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Tijuana': 'MX', 'America/Mazatlan': 'MX',
            // Central America & Caribbean
            'America/Guatemala': 'GT', 'America/Belize': 'BZ', 'America/San_Salvador': 'SV', 'America/Tegucigalpa': 'HN', 'America/Managua': 'NI', 'America/Costa_Rica': 'CR', 'America/Panama': 'PA',
            'America/Havana': 'CU', 'America/Jamaica': 'JM', 'America/Port-au-Prince': 'HT', 'America/Santo_Domingo': 'DO', 'America/Puerto_Rico': 'PR', 'America/Port_of_Spain': 'TT', 'America/Barbados': 'BB', 'America/Nassau': 'BS',
            // South America
            'America/Sao_Paulo': 'BR', 'America/Manaus': 'BR', 'America/Fortaleza': 'BR', 'America/Recife': 'BR', 'America/Rio_Branco': 'BR',
            'America/Argentina/Buenos_Aires': 'AR', 'America/Argentina/Cordoba': 'AR', 'America/Argentina/Mendoza': 'AR',
            'America/Santiago': 'CL', 'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Caracas': 'VE', 'America/Guayaquil': 'EC', 'America/La_Paz': 'BO', 'America/Asuncion': 'PY', 'America/Montevideo': 'UY', 'America/Guyana': 'GY', 'America/Paramaribo': 'SR',
            // Western Europe
            'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Lisbon': 'PT', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Luxembourg': 'LU', 'Europe/Zurich': 'CH', 'Europe/Vienna': 'AT', 'Europe/Monaco': 'MC',
            // Northern Europe
            'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI', 'Atlantic/Reykjavik': 'IS',
            // Eastern Europe
            'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Bratislava': 'SK', 'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO', 'Europe/Sofia': 'BG', 'Europe/Zagreb': 'HR', 'Europe/Ljubljana': 'SI', 'Europe/Belgrade': 'RS', 'Europe/Kiev': 'UA', 'Europe/Minsk': 'BY', 'Europe/Chisinau': 'MD', 'Europe/Vilnius': 'LT', 'Europe/Riga': 'LV', 'Europe/Tallinn': 'EE',
            // Balkans
            'Europe/Athens': 'GR', 'Europe/Tirane': 'AL', 'Europe/Skopje': 'MK', 'Europe/Sarajevo': 'BA', 'Europe/Podgorica': 'ME',
            // Russia & Central Asia
            'Europe/Moscow': 'RU', 'Asia/Yekaterinburg': 'RU', 'Asia/Novosibirsk': 'RU', 'Asia/Krasnoyarsk': 'RU', 'Asia/Irkutsk': 'RU', 'Asia/Yakutsk': 'RU', 'Asia/Vladivostok': 'RU', 'Asia/Magadan': 'RU', 'Asia/Kamchatka': 'RU',
            'Asia/Almaty': 'KZ', 'Asia/Tashkent': 'UZ', 'Asia/Ashgabat': 'TM', 'Asia/Bishkek': 'KG', 'Asia/Dushanbe': 'TJ', 'Asia/Yerevan': 'AM', 'Asia/Baku': 'AZ', 'Asia/Tbilisi': 'GE',
            // Middle East
            'Europe/Istanbul': 'TR', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW', 'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM', 'Asia/Amman': 'JO', 'Asia/Beirut': 'LB', 'Asia/Damascus': 'SY', 'Asia/Baghdad': 'IQ', 'Asia/Jerusalem': 'IL', 'Asia/Gaza': 'PS', 'Asia/Aden': 'YE', 'Asia/Tehran': 'IR',
            // South Asia
            'Asia/Kolkata': 'IN', 'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP', 'Asia/Thimphu': 'BT', 'Indian/Maldives': 'MV', 'Asia/Kabul': 'AF',
            // East Asia
            'Asia/Shanghai': 'CN', 'Asia/Urumqi': 'CN', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Taipei': 'TW', 'Asia/Hong_Kong': 'HK', 'Asia/Macau': 'MO', 'Asia/Ulaanbaatar': 'MN', 'Asia/Pyongyang': 'KP',
            // Southeast Asia
            'Asia/Bangkok': 'TH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Singapore': 'SG', 'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID', 'Asia/Jayapura': 'ID', 'Asia/Manila': 'PH', 'Asia/Brunei': 'BN', 'Asia/Phnom_Penh': 'KH', 'Asia/Vientiane': 'LA', 'Asia/Yangon': 'MM', 'Asia/Dili': 'TL',
            // Oceania
            'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Australia/Darwin': 'AU', 'Australia/Hobart': 'AU',
            'Pacific/Auckland': 'NZ', 'Pacific/Chatham': 'NZ', 'Pacific/Port_Moresby': 'PG', 'Pacific/Fiji': 'FJ', 'Pacific/Guadalcanal': 'SB', 'Pacific/Efate': 'VU', 'Pacific/Noumea': 'NC', 'Pacific/Tahiti': 'PF', 'Pacific/Apia': 'WS', 'Pacific/Tongatapu': 'TO',
            // Africa - North
            'Africa/Cairo': 'EG', 'Africa/Tripoli': 'LY', 'Africa/Tunis': 'TN', 'Africa/Algiers': 'DZ', 'Africa/Casablanca': 'MA', 'Africa/Nouakchott': 'MR', 'Africa/Khartoum': 'SD', 'Africa/Juba': 'SS',
            // Africa - West
            'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Abidjan': 'CI', 'Africa/Dakar': 'SN', 'Africa/Bamako': 'ML', 'Africa/Ouagadougou': 'BF', 'Africa/Niamey': 'NE', 'Africa/Lome': 'TG', 'Africa/Porto-Novo': 'BJ', 'Africa/Banjul': 'GM', 'Africa/Bissau': 'GW', 'Africa/Monrovia': 'LR', 'Africa/Freetown': 'SL',
            // Africa - Central
            'Africa/Douala': 'CM', 'Africa/Ndjamena': 'TD', 'Africa/Bangui': 'CF', 'Africa/Brazzaville': 'CG', 'Africa/Kinshasa': 'CD', 'Africa/Libreville': 'GA', 'Africa/Malabo': 'GQ', 'Africa/Sao_Tome': 'ST',
            // Africa - East
            'Africa/Nairobi': 'KE', 'Africa/Dar_es_Salaam': 'TZ', 'Africa/Kampala': 'UG', 'Africa/Kigali': 'RW', 'Africa/Bujumbura': 'BI', 'Africa/Addis_Ababa': 'ET', 'Africa/Asmara': 'ER', 'Africa/Djibouti': 'DJ', 'Africa/Mogadishu': 'SO', 'Indian/Mahe': 'SC', 'Indian/Mauritius': 'MU', 'Indian/Comoro': 'KM', 'Indian/Antananarivo': 'MG',
            // Africa - Southern
            'Africa/Johannesburg': 'ZA', 'Africa/Harare': 'ZW', 'Africa/Gaborone': 'BW', 'Africa/Windhoek': 'NA', 'Africa/Maseru': 'LS', 'Africa/Mbabane': 'SZ', 'Africa/Maputo': 'MZ', 'Africa/Luanda': 'AO', 'Africa/Lusaka': 'ZM', 'Africa/Blantyre': 'MW'
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

    // Update main currency state object (critical for UI synchronization)
    State.currentCurrency = {
        code: config.currency,
        symbol: getCurrencySymbol(config.currency)
    };
    
    // Apply currency symbol (legacy support)
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
/**
 * Get full country name from ISO code (195+ countries)
 */
function getCountryName(code: string): string {
    const names: Record<string, string> = {
        // North America
        'US': 'United States', 'CA': 'Canada', 'MX': 'Mexico',
        // Central America & Caribbean
        'GT': 'Guatemala', 'BZ': 'Belize', 'SV': 'El Salvador', 'HN': 'Honduras', 'NI': 'Nicaragua', 'CR': 'Costa Rica', 'PA': 'Panama',
        'CU': 'Cuba', 'JM': 'Jamaica', 'HT': 'Haiti', 'DO': 'Dominican Republic', 'PR': 'Puerto Rico', 'TT': 'Trinidad and Tobago', 'BB': 'Barbados', 'BS': 'Bahamas',
        // South America
        'BR': 'Brazil', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Peru', 'VE': 'Venezuela', 'EC': 'Ecuador', 'BO': 'Bolivia', 'PY': 'Paraguay', 'UY': 'Uruguay', 'GY': 'Guyana', 'SR': 'Suriname',
        // Western Europe
        'GB': 'United Kingdom', 'IE': 'Ireland', 'FR': 'France', 'DE': 'Germany', 'ES': 'Spain', 'IT': 'Italy', 'PT': 'Portugal', 'NL': 'Netherlands', 'BE': 'Belgium', 'LU': 'Luxembourg', 'CH': 'Switzerland', 'AT': 'Austria', 'MC': 'Monaco',
        // Northern Europe
        'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland', 'IS': 'Iceland',
        // Eastern Europe
        'PL': 'Poland', 'CZ': 'Czech Republic', 'SK': 'Slovakia', 'HU': 'Hungary', 'RO': 'Romania', 'BG': 'Bulgaria', 'HR': 'Croatia', 'SI': 'Slovenia', 'RS': 'Serbia', 'UA': 'Ukraine', 'BY': 'Belarus', 'MD': 'Moldova', 'LT': 'Lithuania', 'LV': 'Latvia', 'EE': 'Estonia',
        // Balkans
        'GR': 'Greece', 'AL': 'Albania', 'MK': 'North Macedonia', 'BA': 'Bosnia and Herzegovina', 'ME': 'Montenegro', 'XK': 'Kosovo',
        // Russia & Central Asia
        'RU': 'Russia', 'KZ': 'Kazakhstan', 'UZ': 'Uzbekistan', 'TM': 'Turkmenistan', 'KG': 'Kyrgyzstan', 'TJ': 'Tajikistan', 'AM': 'Armenia', 'AZ': 'Azerbaijan', 'GE': 'Georgia',
        // Middle East
        'TR': 'Turkey', 'AE': 'United Arab Emirates', 'SA': 'Saudi Arabia', 'QA': 'Qatar', 'KW': 'Kuwait', 'BH': 'Bahrain', 'OM': 'Oman', 'JO': 'Jordan', 'LB': 'Lebanon', 'SY': 'Syria', 'IQ': 'Iraq', 'IL': 'Israel', 'PS': 'Palestine', 'YE': 'Yemen', 'IR': 'Iran',
        // South Asia
        'IN': 'India', 'PK': 'Pakistan', 'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'NP': 'Nepal', 'BT': 'Bhutan', 'MV': 'Maldives', 'AF': 'Afghanistan',
        // East Asia
        'CN': 'China', 'JP': 'Japan', 'KR': 'South Korea', 'TW': 'Taiwan', 'HK': 'Hong Kong', 'MO': 'Macau', 'MN': 'Mongolia', 'KP': 'North Korea',
        // Southeast Asia
        'TH': 'Thailand', 'VN': 'Vietnam', 'MY': 'Malaysia', 'SG': 'Singapore', 'ID': 'Indonesia', 'PH': 'Philippines', 'BN': 'Brunei', 'KH': 'Cambodia', 'LA': 'Laos', 'MM': 'Myanmar', 'TL': 'Timor-Leste',
        // Oceania
        'AU': 'Australia', 'NZ': 'New Zealand', 'PG': 'Papua New Guinea', 'FJ': 'Fiji', 'SB': 'Solomon Islands', 'VU': 'Vanuatu', 'NC': 'New Caledonia', 'PF': 'French Polynesia', 'WS': 'Samoa', 'TO': 'Tonga',
        // Africa - North
        'EG': 'Egypt', 'LY': 'Libya', 'TN': 'Tunisia', 'DZ': 'Algeria', 'MA': 'Morocco', 'MR': 'Mauritania', 'SD': 'Sudan', 'SS': 'South Sudan',
        // Africa - West
        'NG': 'Nigeria', 'GH': 'Ghana', 'CI': 'Ivory Coast', 'SN': 'Senegal', 'ML': 'Mali', 'BF': 'Burkina Faso', 'NE': 'Niger', 'TG': 'Togo', 'BJ': 'Benin', 'GM': 'Gambia', 'GW': 'Guinea-Bissau', 'LR': 'Liberia', 'SL': 'Sierra Leone',
        // Africa - Central
        'CM': 'Cameroon', 'TD': 'Chad', 'CF': 'Central African Republic', 'CG': 'Congo', 'CD': 'DR Congo', 'GA': 'Gabon', 'GQ': 'Equatorial Guinea', 'ST': 'São Tomé and Príncipe',
        // Africa - East
        'KE': 'Kenya', 'TZ': 'Tanzania', 'UG': 'Uganda', 'RW': 'Rwanda', 'BI': 'Burundi', 'ET': 'Ethiopia', 'ER': 'Eritrea', 'DJ': 'Djibouti', 'SO': 'Somalia', 'SC': 'Seychelles', 'MU': 'Mauritius', 'KM': 'Comoros', 'MG': 'Madagascar',
        // Africa - Southern
        'ZA': 'South Africa', 'ZW': 'Zimbabwe', 'BW': 'Botswana', 'NA': 'Namibia', 'LS': 'Lesotho', 'SZ': 'Eswatini', 'MZ': 'Mozambique', 'AO': 'Angola', 'ZM': 'Zambia', 'MW': 'Malawi'
    };
    return names[code] || code;
}

/**
 * Get currency symbol (100+ currencies)
 */
function getCurrencySymbol(code: string): string {
    const symbols: Record<string, string> = {
        'USD': '$', 'CAD': 'C$', 'MXN': 'MX$', 'BRL': 'R$', 'ARS': '$', 'CLP': '$', 'COP': '$', 'PEN': 'S/', 'VES': 'Bs', 'BOB': 'Bs', 'PYG': '₲', 'UYU': '$U',
        'EUR': '€', 'GBP': '£', 'CHF': 'CHF', 'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr', 'ISK': 'kr',
        'PLN': 'zł', 'CZK': 'Kč', 'HUF': 'Ft', 'RON': 'lei', 'BGN': 'лв', 'HRK': 'kn', 'RSD': 'дин', 'UAH': '₴', 'BYN': 'Br', 'MDL': 'L',
        'RUB': '₽', 'KZT': '₸', 'UZS': 'сўм', 'TMT': 'm', 'KGS': 'с', 'TJS': 'ЅМ', 'AMD': '֏', 'AZN': '₼', 'GEL': '₾',
        'TRY': '₺', 'AED': 'د.إ', 'SAR': '﷼', 'QAR': 'ر.ق', 'KWD': 'د.ك', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.ا', 'LBP': 'ل.ل', 'SYP': '£', 'IQD': 'د.ع', 'ILS': '₪', 'YER': '﷼', 'IRR': '﷼',
        'INR': '₹', 'PKR': '₨', 'BDT': '৳', 'LKR': 'Rs', 'NPR': 'Rs', 'BTN': 'Nu', 'MVR': 'Rf', 'AFN': '؋',
        'CNY': '¥', 'JPY': '¥', 'KRW': '₩', 'TWD': 'NT$', 'HKD': 'HK$', 'MOP': 'P', 'MNT': '₮', 'KPW': '₩',
        'THB': '฿', 'VND': '₫', 'MYR': 'RM', 'SGD': 'S$', 'IDR': 'Rp', 'PHP': '₱', 'BND': 'B$', 'KHR': '៛', 'LAK': '₭', 'MMK': 'K',
        'AUD': 'A$', 'NZD': 'NZ$', 'PGK': 'K', 'FJD': 'FJ$', 'SBD': 'SI$', 'VUV': 'Vt', 'XPF': '₣', 'WST': 'T', 'TOP': 'T$',
        'EGP': '£', 'LYD': 'ل.د', 'TND': 'د.ت', 'DZD': 'د.ج', 'MAD': 'د.م', 'MRU': 'UM', 'SDG': 'ج.س', 'SSP': '£',
        'NGN': '₦', 'GHS': '₵', 'XOF': 'CFA', 'XAF': 'FCFA', 'GMD': 'D', 'LRD': 'L$', 'SLL': 'Le',
        'KES': 'KSh', 'TZS': 'TSh', 'UGX': 'USh', 'RWF': 'FRw', 'BIF': 'FBu', 'ETB': 'Br', 'ERN': 'Nfk', 'DJF': 'Fdj', 'SOS': 'Sh', 'SCR': 'SR', 'MUR': '₨', 'KMF': 'CF', 'MGA': 'Ar',
        'ZAR': 'R', 'ZWL': 'Z$', 'BWP': 'P', 'NAD': 'N$', 'LSL': 'L', 'SZL': 'E', 'MZN': 'MT', 'AOA': 'Kz', 'ZMW': 'ZK', 'MWK': 'MK',
        'GTQ': 'Q', 'BZD': 'BZ$', 'HNL': 'L', 'NIO': 'C$', 'CRC': '₡', 'PAB': 'B/.', 'CUP': '$', 'JMD': 'J$', 'HTG': 'G', 'DOP': 'RD$', 'TTD': 'TT$', 'BBD': 'Bds$', 'BSD': 'B$',
        'GYD': 'G$', 'SRD': '$', 'ALL': 'L', 'MKD': 'ден', 'BAM': 'KM', 'CDF': 'FC', 'STN': 'Db'
    };
    return symbols[code] || code;
}

/**
 * Refreshes all visible price elements to display amounts in the given target currency.
 *
 * Loads conversion utilities lazily, converts values whose base currency differs (assumes USD when unspecified), formats amounts to two decimal places, and marks each element with `data-price-rendered-currency`.
 *
 * @param currency - Target ISO currency code used to render prices (e.g., "USD", "EUR")
 */
async function updatePriceDisplays(currency: string) {
    const symbol = getCurrencySymbol(currency);
    const desired = currency.toUpperCase();

    // Update all elements with data-price attribute
    const elements = Array.from(document.querySelectorAll('[data-price]'));

    // Lazy-load currency utils to avoid blocking initial paint
    const { convertAmount } = await import('./src/utils/currency');

    await Promise.all(elements.map(async (element) => {
        const priceAttr = element.getAttribute('data-price');
        if (!priceAttr) return;

        const raw = Number(priceAttr);
        if (!Number.isFinite(raw)) return;

        // If the element specifies its base currency, use that; otherwise assume USD
        const baseCurrency = (element.getAttribute('data-price-currency') || 'USD').toUpperCase();

        // Convert only when needed
        let displayAmount = raw;
        if (baseCurrency !== desired) {
            try {
                displayAmount = await convertAmount(raw, baseCurrency, desired);
            } catch {
                displayAmount = raw; // fallback
            }
        }

        // Write formatted text while preserving dataset for future reflows
        element.textContent = `${symbol}${displayAmount.toFixed(2)}`;
        element.setAttribute('data-price-rendered-currency', desired);
    }));
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