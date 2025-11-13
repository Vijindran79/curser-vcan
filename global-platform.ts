/**
 * 🌍 VCANSHIP GLOBAL AUTO-INITIALIZATION SYSTEM
 * 
 * Advanced worldwide platform initialization
 * - Auto-detects user country, language, currency
 * - Configures SEO meta tags dynamically
 * - Sets up local payment methods
 * - Optimizes for local regulations
 * 
 * 10 years ahead of competition
 */

import { State, setState } from './state';
import { COUNTRY_CONFIGS, detectUserCountry } from './country-detection';
import { showToast } from './ui';

interface GlobalConfig {
    detected: boolean;
    countryCode: string;
    countryName: string;
    language: string;
    currency: string;
    currencySymbol: string;
    timezone: string;
    dateFormat: string;
    measurementSystem: 'metric' | 'imperial';
    phonePrefix: string;
}

let globalConfig: GlobalConfig | null = null;

/**
 * Currency symbols mapping for all supported currencies
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
    // Major Currencies
    'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CNY': '¥', 'CHF': 'Fr',
    'CAD': 'C$', 'AUD': 'A$', 'NZD': 'NZ$', 'HKD': 'HK$', 'SGD': 'S$',
    
    // European
    'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr', 'PLN': 'zł', 'CZK': 'Kč',
    'HUF': 'Ft', 'RON': 'lei', 'BGN': 'лв', 'HRK': 'kn', 'RSD': 'дин',
    
    // Americas
    'BRL': 'R$', 'MXN': 'MX$', 'ARS': 'AR$', 'CLP': 'CLP$', 'COP': 'COL$',
    'PEN': 'S/', 'UYU': '$U', 'PYG': '₲', 'BOB': 'Bs', 'VES': 'Bs.S',
    
    // Middle East & Africa
    'SAR': '﷼', 'AED': 'د.إ', 'QAR': 'ر.ق', 'KWD': 'د.ك', 'BHD': 'د.ب',
    'OMR': 'ر.ع', 'JOD': 'د.ا', 'LBP': 'ل.ل', 'EGP': 'E£', 'TRY': '₺',
    'ILS': '₪', 'ZAR': 'R', 'NGN': '₦', 'KES': 'KSh', 'GHS': 'GH₵',
    'TND': 'د.ت', 'MAD': 'د.م', 'DZD': 'د.ج', 'LYD': 'ل.د',
    
    // Asia Pacific
    'INR': '₹', 'PKR': '₨', 'BDT': '৳', 'LKR': 'Rs', 'NPR': 'रू',
    'THB': '฿', 'VND': '₫', 'IDR': 'Rp', 'MYR': 'RM', 'PHP': '₱',
    'KRW': '₩', 'TWD': 'NT$', 'RUB': '₽', 'UAH': '₴', 'KZT': '₸',
    
    // Caribbean
    'JMD': 'J$', 'TTD': 'TT$', 'BBD': 'Bds$', 'BSD': 'B$', 'BZD': 'BZ$',
    'XCD': 'EC$', 'HTG': 'G', 'DOP': 'RD$', 'CUP': '₱',
    
    // Central America
    'GTQ': 'Q', 'HNL': 'L', 'NIO': 'C$', 'CRC': '₡', 'PAB': 'B/.',
    
    // Africa
    'ETB': 'Br', 'TZS': 'TSh', 'UGX': 'USh', 'RWF': 'FRw', 'MWK': 'MK',
    'ZMW': 'ZK', 'BWP': 'P', 'NAD': 'N$', 'SZL': 'L', 'LSL': 'L',
    'MGA': 'Ar', 'MUR': '₨', 'SCR': '₨', 'XOF': 'CFA', 'XAF': 'FCFA',
    
    // Asia
    'MMK': 'K', 'LAK': '₭', 'KHR': '៛', 'BND': 'B$', 'MNT': '₮',
    'KGS': 'с', 'UZS': 'soʻm', 'TJS': 'SM', 'TMT': 'T', 'AFN': '؋',
    
    // Other
    'ISK': 'kr', 'ALL': 'L', 'MKD': 'ден', 'BAM': 'KM', 'MDL': 'L',
    'GEL': '₾', 'AMD': '֏', 'AZN': '₼', 'BYN': 'Br'
};

/**
 * Initialize global platform configuration
 * This runs on page load and sets everything up automatically
 */
export async function initializeGlobalPlatform(): Promise<void> {
    console.log('🌍 Initializing VCANSHIP Global Platform...');
    
    try {
        // 1. Detect user's location
        const detection = await detectUserCountry();
        console.log('📍 Detected location:', detection);
        
        // 2. Get country configuration
        const countryConfig = COUNTRY_CONFIGS[detection.countryCode] || COUNTRY_CONFIGS['US'];
        
        // 3. Set up global configuration
        globalConfig = {
            detected: true,
            countryCode: detection.countryCode,
            countryName: detection.countryName,
            language: countryConfig.language,
            currency: countryConfig.currency,
            currencySymbol: CURRENCY_SYMBOLS[countryConfig.currency] || countryConfig.currency,
            timezone: detection.timezone,
            dateFormat: countryConfig.dateFormat,
            measurementSystem: countryConfig.measurementSystem,
            phonePrefix: countryConfig.phonePrefix
        };
        
        // 4. Update application state
        setState({
            currentCurrency: {
                code: globalConfig.currency,
                symbol: globalConfig.currencySymbol
            }
        });
        
        // 5. Set HTML lang attribute for SEO
        document.documentElement.lang = globalConfig.language;
        
        // 6. Update meta tags for SEO
        updateSEOMetaTags(globalConfig);
        
        // 7. Load appropriate language pack
        await loadLanguagePack(globalConfig.language);
        
        // 8. Initialize local payment methods
        initializeLocalPaymentMethods(globalConfig.countryCode);
        
        // 9. Apply regional styles (RTL for Arabic, etc.)
        applyRegionalStyles(globalConfig.language);
        
        // 10. Show welcome message in local language
        showLocalizedWelcome(globalConfig);
        
        console.log('✅ Platform initialized for:', globalConfig.countryName);
        console.log('💱 Currency:', globalConfig.currency, globalConfig.currencySymbol);
        console.log('🗣️ Language:', globalConfig.language);
        
        // Store in localStorage for faster subsequent loads
        localStorage.setItem('vcanship_global_config', JSON.stringify(globalConfig));
        
    } catch (error) {
        console.error('Error initializing global platform:', error);
        // Fall back to US/English defaults
        globalConfig = {
            detected: false,
            countryCode: 'US',
            countryName: 'United States',
            language: 'en',
            currency: 'USD',
            currencySymbol: '$',
            timezone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY',
            measurementSystem: 'imperial',
            phonePrefix: '+1'
        };
        
        setState({
            currentCurrency: { code: 'USD', symbol: '$' }
        });
    }
}

/**
 * Update SEO meta tags dynamically based on location
 */
function updateSEOMetaTags(config: GlobalConfig): void {
    const localizedTitles: Record<string, string> = {
        'en': `VCANSHIP - Global Logistics Platform | Cheapest Shipping Rates`,
        'es': `VCANSHIP - Plataforma Logística Global | Tarifas de Envío más Baratas`,
        'fr': `VCANSHIP - Plateforme Logistique Mondiale | Tarifs d'Expédition les Moins Chers`,
        'de': `VCANSHIP - Globale Logistikplattform | Günstigste Versandtarife`,
        'pt': `VCANSHIP - Plataforma Logística Global | Tarifas de Envio mais Baratas`,
        'zh': `VCANSHIP - 全球物流平台 | 最便宜的运输价格`,
        'ar': `VCANSHIP - منصة لوجستية عالمية | أرخص أسعار الشحن`,
        'ja': `VCANSHIP - グローバル物流プラットフォーム | 最安値の配送料金`,
        'ko': `VCANSHIP - 글로벌 물류 플랫폼 | 최저 배송 요금`,
        'ru': `VCANSHIP - Глобальная Логистическая Платформа | Самые Дешевые Тарифы`,
        'hi': `VCANSHIP - वैश्विक लॉजिस्टिक्स प्लेटफ़ॉर्म | सबसे सस्ती शिपिंग दरें`,
        'it': `VCANSHIP - Piattaforma Logistica Globale | Tariffe di Spedizione più Economiche`,
        'tr': `VCANSHIP - Küresel Lojistik Platformu | En Ucuz Kargo Ücretleri`
    };
    
    const localizedDescriptions: Record<string, string> = {
        'en': `Ship parcels, freight & cargo worldwide. Compare rates from 100+ carriers. DHL, FedEx, UPS, Maersk, MSC. Instant quotes in ${config.currency}.`,
        'es': `Envíe paquetes, carga y mercancías en todo el mundo. Compare tarifas de más de 100 transportistas. Cotizaciones instantáneas en ${config.currency}.`,
        'fr': `Expédiez des colis, du fret et des marchandises dans le monde entier. Comparez les tarifs de plus de 100 transporteurs. Devis instantanés en ${config.currency}.`,
        'de': `Versenden Sie Pakete, Fracht und Ladung weltweit. Vergleichen Sie Tarife von über 100 Spediteuren. Sofortangebote in ${config.currency}.`,
        'pt': `Envie encomendas, frete e carga em todo o mundo. Compare tarifas de mais de 100 transportadoras. Cotações instantâneas em ${config.currency}.`,
        'zh': `全球运输包裹、货运和货物。比较100多家承运商的费率。${config.currency}即时报价。`,
        'ar': `شحن الطرود والبضائع والحمولات في جميع أنحاء العالم. قارن الأسعار من أكثر من 100 شركة نقل. عروض أسعار فورية بـ ${config.currency}.`,
        'hi': `दुनिया भर में पार्सल, माल और कार्गो भेजें। 100+ वाहकों से दरों की तुलना करें। ${config.currency} में तत्काल कोट्स।`,
        'it': `Spedisci pacchi, merci e cargo in tutto il mondo. Confronta le tariffe di oltre 100 corrieri. Preventivi istantanei in ${config.currency}.`,
        'tr': `Dünya çapında paket, navlun ve kargo gönderin. 100'den fazla taşıyıcıdan fiyat karşılaştırın. ${config.currency} cinsinden anında teklifler.`
    };
    
    const title = localizedTitles[config.language] || localizedTitles['en'];
    const description = localizedDescriptions[config.language] || localizedDescriptions['en'];
    
    // Update title
    document.title = title;
    
    // Update or create meta tags
    updateMetaTag('description', description);
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:locale', `${config.language}_${config.countryCode}`);
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    
    // Add hreflang for international SEO
    addHreflangTags(config.language);
}

function updateMetaTag(property: string, content: string): void {
    let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
    if (!meta) {
        meta = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
    }
    if (!meta) {
        meta = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('twitter:')) {
            meta.setAttribute('property', property);
        } else {
            meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
}

function addHreflangTags(currentLang: string): void {
    // Remove existing hreflang tags
    document.querySelectorAll('link[rel="alternate"]').forEach(el => el.remove());
    
    // Major languages to support
    const languages = ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ar', 'ja', 'ko', 'ru', 'hi', 'it', 'tr'];
    const baseUrl = window.location.origin;
    
    languages.forEach(lang => {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = lang;
        link.href = `${baseUrl}?lang=${lang}`;
        document.head.appendChild(link);
    });
    
    // Add x-default
    const defaultLink = document.createElement('link');
    defaultLink.rel = 'alternate';
    defaultLink.hreflang = 'x-default';
    defaultLink.href = baseUrl;
    document.head.appendChild(defaultLink);
}

/**
 * Load language pack for the detected language
 */
async function loadLanguagePack(languageCode: string): Promise<void> {
    try {
        // Try to load the specific language file
        const response = await fetch(`/locales/${languageCode}.json`);
        if (response.ok) {
            const translations = await response.json();
            // Store in global state or i18n system
            (window as any).translations = translations;
            console.log(`✅ Loaded ${languageCode} language pack`);
        } else {
            // Fall back to English
            console.log(`⚠️ ${languageCode} not available, falling back to English`);
            const enResponse = await fetch('/locales/en.json');
            if (enResponse.ok) {
                const translations = await enResponse.json();
                (window as any).translations = translations;
            }
        }
    } catch (error) {
        console.error('Error loading language pack:', error);
    }
}

/**
 * Initialize local payment methods based on country
 */
function initializeLocalPaymentMethods(countryCode: string): void {
    const localPaymentMethods: Record<string, string[]> = {
        'CN': ['Alipay', 'WeChat Pay', 'UnionPay'],
        'IN': ['UPI', 'Paytm', 'PhonePe', 'Razorpay'],
        'BR': ['Pix', 'Boleto'],
        'ID': ['GoPay', 'OVO', 'Dana'],
        'MY': ['Touch \'n Go', 'Boost'],
        'TH': ['PromptPay', 'TrueMoney'],
        'VN': ['MoMo', 'ZaloPay'],
        'PH': ['GCash', 'PayMaya'],
        'MX': ['OXXO', 'SPEI'],
        'AR': ['Mercado Pago'],
        'CL': ['Webpay'],
        'PE': ['Yape', 'Plin'],
        'ZA': ['SnapScan', 'Zapper'],
        'NG': ['Paystack', 'Flutterwave'],
        'KE': ['M-Pesa'],
        'EG': ['Fawry'],
        'SA': ['Mada', 'STC Pay'],
        'AE': ['Tabby', 'Postpay'],
        'TR': ['iyzico', 'Papara'],
        'RU': ['Yandex Money', 'QIWI'],
        'PL': ['BLIK', 'Przelewy24'],
        'NL': ['iDEAL'],
        'BE': ['Bancontact'],
        'DE': ['Sofort', 'Giropay'],
        'AT': ['eps'],
        'CH': ['Twint'],
        'SE': ['Swish'],
        'NO': ['Vipps'],
        'DK': ['MobilePay'],
        'FI': ['Siirto']
    };
    
    const methods = localPaymentMethods[countryCode] || ['Card'];
    console.log(`💳 Available payment methods for ${countryCode}:`, methods.join(', '));
    
    // Store in global state for payment page
    (window as any).localPaymentMethods = methods;
}

/**
 * Apply regional styles (RTL for Arabic, special fonts, etc.)
 */
function applyRegionalStyles(languageCode: string): void {
    const body = document.body;
    
    // RTL languages
    if (['ar', 'he', 'fa', 'ur'].includes(languageCode)) {
        body.setAttribute('dir', 'rtl');
        body.classList.add('rtl-layout');
    } else {
        body.setAttribute('dir', 'ltr');
        body.classList.remove('rtl-layout');
    }
    
    // Add language-specific class for special styling
    body.classList.add(`lang-${languageCode}`);
    
    // Load language-specific fonts if needed
    if (languageCode === 'ar') {
        loadFont('Noto Sans Arabic', 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap');
    } else if (languageCode === 'zh' || languageCode === 'ja' || languageCode === 'ko') {
        loadFont('Noto Sans CJK', 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap');
    } else if (languageCode === 'th') {
        loadFont('Noto Sans Thai', 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700&display=swap');
    } else if (languageCode === 'hi') {
        loadFont('Noto Sans Devanagari', 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap');
    }
}

function loadFont(name: string, url: string): void {
    const existing = document.querySelector(`link[href="${url}"]`);
    if (!existing) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
        console.log(`📝 Loaded font: ${name}`);
    }
}

/**
 * Show localized welcome message
 */
function showLocalizedWelcome(config: GlobalConfig): void {
    const welcomeMessages: Record<string, string> = {
        'en': `🌍 Welcome! Shipping rates in ${config.currency}`,
        'es': `🌍 ¡Bienvenido! Tarifas en ${config.currency}`,
        'fr': `🌍 Bienvenue! Tarifs en ${config.currency}`,
        'de': `🌍 Willkommen! Tarife in ${config.currency}`,
        'pt': `🌍 Bem-vindo! Tarifas em ${config.currency}`,
        'zh': `🌍 欢迎！${config.currency} 价格`,
        'ar': `🌍 مرحباً! الأسعار بـ ${config.currency}`,
        'ja': `🌍 ようこそ！${config.currency}料金`,
        'ko': `🌍 환영합니다! ${config.currency} 요금`,
        'ru': `🌍 Добро пожаловать! Тарифы в ${config.currency}`,
        'hi': `🌍 स्वागत है! ${config.currency} में दरें`,
        'it': `🌍 Benvenuto! Tariffe in ${config.currency}`,
        'tr': `🌍 Hoş geldiniz! ${config.currency} fiyatlar`
    };
    
    const message = welcomeMessages[config.language] || welcomeMessages['en'];
    
    // Only show if it's the first visit or country changed
    const lastCountry = localStorage.getItem('vcanship_last_country');
    if (!lastCountry || lastCountry !== config.countryCode) {
        showToast(message, 'success', 4000);
        localStorage.setItem('vcanship_last_country', config.countryCode);
    }
}

/**
 * Get current global configuration
 */
export function getGlobalConfig(): GlobalConfig | null {
    if (!globalConfig) {
        // Try to load from localStorage
        const stored = localStorage.getItem('vcanship_global_config');
        if (stored) {
            try {
                globalConfig = JSON.parse(stored);
            } catch (e) {
                return null;
            }
        }
    }
    return globalConfig;
}

/**
 * Format price in local currency
 */
export function formatLocalPrice(amount: number): string {
    const config = getGlobalConfig();
    if (!config) return `$${amount.toFixed(2)}`;
    
    try {
        return new Intl.NumberFormat(config.language + '-' + config.countryCode, {
            style: 'currency',
            currency: config.currency
        }).format(amount);
    } catch (e) {
        return `${config.currencySymbol}${amount.toFixed(2)}`;
    }
}

/**
 * Format date in local format
 */
export function formatLocalDate(date: Date): string {
    const config = getGlobalConfig();
    if (!config) return date.toLocaleDateString('en-US');
    
    try {
        return new Intl.DateTimeFormat(config.language + '-' + config.countryCode).format(date);
    } catch (e) {
        return date.toLocaleDateString();
    }
}

// Auto-initialize when the script loads
if (typeof window !== 'undefined') {
    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeGlobalPlatform);
    } else {
        initializeGlobalPlatform();
    }
}
