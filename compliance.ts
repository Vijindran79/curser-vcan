// compliance.ts
// World-class compliance checking system for international shipping
// Automatically checks exporting and importing country regulations, calculates taxes, duties, CFR, X-work, and more

import { State } from './state';
import { showToast } from './ui';

export interface ComplianceCheck {
    originCountry: string;
    destinationCountry: string;
    itemDescription: string;
    hsCode?: string;
    weight: number;
    value: number;
    requiresPreInspection: boolean;
    requiresCertificate: boolean;
    certificateType?: string;
    prohibitedItems: string[];
    restrictedItems: string[];
    exportRestrictions: string[];
    importRestrictions: string[];
    exportTaxRate: number;
    importTaxRate: number;
    importDutyRate: number;
    cfrCost: number;
    xWorkCost: number;
    totalAdditionalCosts: number;
    requiredDocuments: string[];
    warnings: string[];
    errors: string[];
}

export interface CountryRegulations {
    code: string;
    name: string;
    exportRestrictions: string[];
    importRestrictions: string[];
    prohibitedItems: string[];
    restrictedItems: string[];
    requiresPreInspection: boolean;
    commonCertificateTypes: string[];
    taxRates: {
        export: number;
        import: number;
        duty: number;
    };
    cfrMultiplier: number;
    xWorkMultiplier: number;
}

export interface CountryPickupRules {
    code: string;
    name: string;
    homePickupAvailable: boolean;
    pickupCarriers: string[];
    pickupMinimumNotice: number; // Hours (24, 48, 72, etc.)
    pickupCutoffTime: string; // "17:00"
    pickupDays: string[]; // ['monday', 'tuesday', ...]
    pickupFee: number; // Additional fee (0 if free)
    pickupMinWeight: number; // Minimum kg for pickup
    pickupMaxWeight: number; // Maximum kg for pickup
    dropoffOnly: boolean; // Force drop-off in remote areas
    majorCarriers: string[]; // Available carriers in this country
    dropoffLocations: string[]; // Types of drop-off points
}

// Comprehensive country regulations database
const COUNTRY_REGULATIONS: { [key: string]: CountryRegulations } = {
    'US': {
        code: 'US',
        name: 'United States',
        exportRestrictions: ['weapons', 'military', 'technology', 'chemicals'],
        importRestrictions: ['food', 'plants', 'animals', 'medication'],
        prohibitedItems: ['drugs', 'counterfeit', 'weapons', 'explosives'],
        restrictedItems: ['electronics', 'batteries', 'liquids', 'cosmetics'],
        requiresPreInspection: false,
        commonCertificateTypes: ['FDA', 'USDA', 'EPA'],
        taxRates: { export: 0, import: 0, duty: 2.5 },
        cfrMultiplier: 0.15,
        xWorkMultiplier: 0.08
    },
    'UK': {
        code: 'UK',
        name: 'United Kingdom',
        exportRestrictions: ['technology', 'antiques', 'art'],
        importRestrictions: ['food', 'plants', 'animals', 'alcohol'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries', 'perfume'],
        requiresPreInspection: false,
        commonCertificateTypes: ['CE', 'UKCA', 'VAT'],
        taxRates: { export: 0, import: 20, duty: 2.5 },
        cfrMultiplier: 0.12,
        xWorkMultiplier: 0.06
    },
    'DE': {
        code: 'DE',
        name: 'Germany',
        exportRestrictions: ['technology', 'art', 'cultural'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries', 'chemicals'],
        requiresPreInspection: false,
        commonCertificateTypes: ['CE', 'TÜV', 'GS'],
        taxRates: { export: 0, import: 19, duty: 2.5 },
        cfrMultiplier: 0.14,
        xWorkMultiplier: 0.07
    },
    'FR': {
        code: 'FR',
        name: 'France',
        exportRestrictions: ['art', 'cultural', 'antiques'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries', 'cosmetics'],
        requiresPreInspection: false,
        commonCertificateTypes: ['CE', 'NF', 'AFNOR'],
        taxRates: { export: 0, import: 20, duty: 2.5 },
        cfrMultiplier: 0.13,
        xWorkMultiplier: 0.06
    },
    'IT': {
        code: 'IT',
        name: 'Italy',
        exportRestrictions: ['art', 'cultural', 'antiques'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['CE', 'IMQ'],
        taxRates: { export: 0, import: 22, duty: 2.5 },
        cfrMultiplier: 0.13,
        xWorkMultiplier: 0.06
    },
    'ES': {
        code: 'ES',
        name: 'Spain',
        exportRestrictions: ['art', 'cultural'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['CE', 'AENOR'],
        taxRates: { export: 0, import: 21, duty: 2.5 },
        cfrMultiplier: 0.13,
        xWorkMultiplier: 0.06
    },
    'NL': {
        code: 'NL',
        name: 'Netherlands',
        exportRestrictions: ['technology', 'cultural'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['CE', 'KEMA'],
        taxRates: { export: 0, import: 21, duty: 2.5 },
        cfrMultiplier: 0.12,
        xWorkMultiplier: 0.06
    },
    'BE': {
        code: 'BE',
        name: 'Belgium',
        exportRestrictions: ['art', 'cultural'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['CE'],
        taxRates: { export: 0, import: 21, duty: 2.5 },
        cfrMultiplier: 0.12,
        xWorkMultiplier: 0.06
    },
    'CN': {
        code: 'CN',
        name: 'China',
        exportRestrictions: ['technology', 'cultural', 'antiques'],
        importRestrictions: ['food', 'plants', 'animals', 'electronics'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries', 'cosmetics'],
        requiresPreInspection: true,
        commonCertificateTypes: ['CCC', 'CIQ', 'CCIC'],
        taxRates: { export: 13, import: 13, duty: 10 },
        cfrMultiplier: 0.18,
        xWorkMultiplier: 0.12
    },
    'JP': {
        code: 'JP',
        name: 'Japan',
        exportRestrictions: ['technology', 'cultural'],
        importRestrictions: ['food', 'plants', 'animals', 'medication'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries', 'cosmetics'],
        requiresPreInspection: true,
        commonCertificateTypes: ['JIS', 'PSE', 'TELEC'],
        taxRates: { export: 0, import: 10, duty: 5 },
        cfrMultiplier: 0.15,
        xWorkMultiplier: 0.08
    },
    'KR': {
        code: 'KR',
        name: 'South Korea',
        exportRestrictions: ['technology', 'cultural'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: true,
        commonCertificateTypes: ['KC', 'KCC'],
        taxRates: { export: 0, import: 10, duty: 8 },
        cfrMultiplier: 0.16,
        xWorkMultiplier: 0.09
    },
    'IN': {
        code: 'IN',
        name: 'India',
        exportRestrictions: ['cultural', 'antiques'],
        importRestrictions: ['food', 'plants', 'animals', 'electronics'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries', 'cosmetics'],
        requiresPreInspection: true,
        commonCertificateTypes: ['BIS', 'DGFT', 'CDSCO'],
        taxRates: { export: 0, import: 18, duty: 10 },
        cfrMultiplier: 0.17,
        xWorkMultiplier: 0.10
    },
    'AU': {
        code: 'AU',
        name: 'Australia',
        exportRestrictions: ['cultural', 'wildlife'],
        importRestrictions: ['food', 'plants', 'animals', 'medication'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: true,
        commonCertificateTypes: ['ACMA', 'TGA', 'AQUIS'],
        taxRates: { export: 0, import: 10, duty: 5 },
        cfrMultiplier: 0.14,
        xWorkMultiplier: 0.07
    },
    'CA': {
        code: 'CA',
        name: 'Canada',
        exportRestrictions: ['cultural', 'technology'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['CSA', 'IC', 'Health Canada'],
        taxRates: { export: 0, import: 5, duty: 2.5 },
        cfrMultiplier: 0.13,
        xWorkMultiplier: 0.06
    },
    'MX': {
        code: 'MX',
        name: 'Mexico',
        exportRestrictions: ['cultural', 'antiques'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['NOM', 'COFEPRIS'],
        taxRates: { export: 0, import: 16, duty: 10 },
        cfrMultiplier: 0.15,
        xWorkMultiplier: 0.08
    },
    'BR': {
        code: 'BR',
        name: 'Brazil',
        exportRestrictions: ['cultural', 'wildlife'],
        importRestrictions: ['food', 'plants', 'animals', 'electronics'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries', 'cosmetics'],
        requiresPreInspection: true,
        commonCertificateTypes: ['INMETRO', 'ANVISA'],
        taxRates: { export: 0, import: 17, duty: 14 },
        cfrMultiplier: 0.18,
        xWorkMultiplier: 0.11
    },
    'AE': {
        code: 'AE',
        name: 'United Arab Emirates',
        exportRestrictions: ['cultural', 'religious'],
        importRestrictions: ['food', 'plants', 'animals', 'alcohol'],
        prohibitedItems: ['drugs', 'weapons', 'alcohol', 'pork'],
        restrictedItems: ['electronics', 'batteries', 'cosmetics'],
        requiresPreInspection: true,
        commonCertificateTypes: ['ECAS', 'ESMA', 'DOH'],
        taxRates: { export: 0, import: 5, duty: 5 },
        cfrMultiplier: 0.14,
        xWorkMultiplier: 0.07
    },
    'SA': {
        code: 'SA',
        name: 'Saudi Arabia',
        exportRestrictions: ['cultural', 'religious'],
        importRestrictions: ['food', 'plants', 'animals', 'alcohol'],
        prohibitedItems: ['drugs', 'weapons', 'alcohol', 'pork'],
        restrictedItems: ['electronics', 'batteries', 'cosmetics'],
        requiresPreInspection: true,
        commonCertificateTypes: ['SASO', 'SFDA'],
        taxRates: { export: 0, import: 15, duty: 5 },
        cfrMultiplier: 0.15,
        xWorkMultiplier: 0.08
    },
    'SG': {
        code: 'SG',
        name: 'Singapore',
        exportRestrictions: ['cultural'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit', 'chewing gum'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['IMDA', 'HSA'],
        taxRates: { export: 0, import: 7, duty: 0 },
        cfrMultiplier: 0.11,
        xWorkMultiplier: 0.05
    },
    'HK': {
        code: 'HK',
        name: 'Hong Kong',
        exportRestrictions: ['cultural'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['HKCA', 'OFCA'],
        taxRates: { export: 0, import: 0, duty: 0 },
        cfrMultiplier: 0.10,
        xWorkMultiplier: 0.04
    },
    'MY': {
        code: 'MY',
        name: 'Malaysia',
        exportRestrictions: ['cultural'],
        importRestrictions: ['food', 'plants', 'animals', 'pork', 'alcohol'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit', 'pornography'],
        restrictedItems: [],
        requiresPreInspection: false,
        commonCertificateTypes: [],
        taxRates: { export: 0, import: 0, duty: 0 },
        cfrMultiplier: 0.13,
        xWorkMultiplier: 0.06
    },
    'TH': {
        code: 'TH',
        name: 'Thailand',
        exportRestrictions: ['cultural', 'wildlife'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['TISI', 'FDA Thailand'],
        taxRates: { export: 0, import: 7, duty: 5 },
        cfrMultiplier: 0.13,
        xWorkMultiplier: 0.06
    },
    'VN': {
        code: 'VN',
        name: 'Vietnam',
        exportRestrictions: ['cultural'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['CR', 'MOH'],
        taxRates: { export: 0, import: 10, duty: 10 },
        cfrMultiplier: 0.15,
        xWorkMultiplier: 0.08
    },
    'ID': {
        code: 'ID',
        name: 'Indonesia',
        exportRestrictions: ['cultural', 'wildlife'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['SNI', 'BPOM'],
        taxRates: { export: 0, import: 11, duty: 10 },
        cfrMultiplier: 0.15,
        xWorkMultiplier: 0.08
    },
    'PH': {
        code: 'PH',
        name: 'Philippines',
        exportRestrictions: ['cultural'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['BPS', 'FDA Philippines'],
        taxRates: { export: 0, import: 12, duty: 10 },
        cfrMultiplier: 0.15,
        xWorkMultiplier: 0.08
    },
    'ZA': {
        code: 'ZA',
        name: 'South Africa',
        exportRestrictions: ['cultural', 'wildlife'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['SABS', 'SAHPRA'],
        taxRates: { export: 0, import: 15, duty: 5 },
        cfrMultiplier: 0.14,
        xWorkMultiplier: 0.07
    },
    'EG': {
        code: 'EG',
        name: 'Egypt',
        exportRestrictions: ['cultural', 'antiques'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: true,
        commonCertificateTypes: ['GOEIC', 'EOS'],
        taxRates: { export: 0, import: 14, duty: 10 },
        cfrMultiplier: 0.16,
        xWorkMultiplier: 0.09
    },
    'TR': {
        code: 'TR',
        name: 'Turkey',
        exportRestrictions: ['cultural', 'antiques'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['TSE', 'MoH Turkey'],
        taxRates: { export: 0, import: 18, duty: 10 },
        cfrMultiplier: 0.15,
        xWorkMultiplier: 0.08
    },
    'RU': {
        code: 'RU',
        name: 'Russia',
        exportRestrictions: ['technology', 'cultural'],
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: true,
        commonCertificateTypes: ['GOST', 'Rosstandart'],
        taxRates: { export: 0, import: 20, duty: 10 },
        cfrMultiplier: 0.17,
        xWorkMultiplier: 0.10
    }
};

// Country-specific home pickup rules and carrier availability
export const COUNTRY_PICKUP_RULES: { [key: string]: CountryPickupRules } = {
    'US': {
        code: 'US',
        name: 'United States',
        homePickupAvailable: true,
        pickupCarriers: ['USPS', 'FedEx', 'UPS', 'DHL'],
        pickupMinimumNotice: 24, // Next day
        pickupCutoffTime: '14:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0, // USPS free, FedEx/UPS may charge
        pickupMinWeight: 0,
        pickupMaxWeight: 70,
        dropoffOnly: false,
        majorCarriers: ['USPS', 'FedEx', 'UPS', 'DHL'],
        dropoffLocations: ['Post Offices', 'FedEx Stores', 'UPS Stores', 'Walgreens', 'CVS']
    },
    'UK': {
        code: 'UK',
        name: 'United Kingdom',
        homePickupAvailable: true,
        pickupCarriers: ['Royal Mail', 'DHL', 'UPS', 'FedEx', 'Parcelforce'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '17:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0, // Free over £10
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Royal Mail', 'DHL', 'Evri', 'Yodel', 'DPD', 'Parcelforce'],
        dropoffLocations: ['Post Offices', 'Evri ParcelShops', 'InPost Lockers', 'Yodel Stores', 'Corner Shops']
    },
    'CA': {
        code: 'CA',
        name: 'Canada',
        homePickupAvailable: true,
        pickupCarriers: ['Canada Post', 'FedEx', 'UPS', 'Purolator'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Canada Post', 'FedEx', 'UPS', 'Purolator'],
        dropoffLocations: ['Post Offices', 'Shoppers Drug Mart', 'FedEx Locations', 'UPS Stores']
    },
    'AU': {
        code: 'AU',
        name: 'Australia',
        homePickupAvailable: true,
        pickupCarriers: ['Australia Post', 'DHL', 'FedEx', 'Sendle'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0, // Free for most services
        pickupMinWeight: 0,
        pickupMaxWeight: 22,
        dropoffOnly: false,
        majorCarriers: ['Australia Post', 'DHL', 'FedEx', 'StarTrack', 'Sendle'],
        dropoffLocations: ['Post Offices', 'Parcel Lockers', 'Newsagents', 'Participating Retailers']
    },
    'DE': {
        code: 'DE',
        name: 'Germany',
        homePickupAvailable: true,
        pickupCarriers: ['DHL', 'DPD', 'UPS', 'Hermes'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 31.5,
        dropoffOnly: false,
        majorCarriers: ['DHL', 'DPD', 'UPS', 'Hermes', 'GLS'],
        dropoffLocations: ['Paketshops', 'Post Offices', 'DHL Packstationen', 'Kiosks']
    },
    'FR': {
        code: 'FR',
        name: 'France',
        homePickupAvailable: true,
        pickupCarriers: ['La Poste', 'Chronopost', 'DPD', 'UPS'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['La Poste', 'Chronopost', 'DPD', 'Colissimo', 'Mondial Relay'],
        dropoffLocations: ['Post Offices', 'Relay Points', 'Tabacs', 'Supermarkets']
    },
    'IT': {
        code: 'IT',
        name: 'Italy',
        homePickupAvailable: true,
        pickupCarriers: ['Poste Italiane', 'DHL', 'UPS', 'BRT'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 2.5, // €2.50
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Poste Italiane', 'DHL', 'UPS', 'BRT', 'SDA'],
        dropoffLocations: ['Post Offices', 'Fermopoint', 'Tabaccherie', 'Edicole']
    },
    'ES': {
        code: 'ES',
        name: 'Spain',
        homePickupAvailable: true,
        pickupCarriers: ['Correos', 'SEUR', 'MRW', 'UPS'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '14:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Correos', 'SEUR', 'MRW', 'UPS', 'DHL'],
        dropoffLocations: ['Post Offices', 'Citypaq Lockers', 'Estancos', 'Puntos Pack']
    },
    'NL': {
        code: 'NL',
        name: 'Netherlands',
        homePickupAvailable: true,
        pickupCarriers: ['PostNL', 'DHL', 'DPD', 'UPS'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['PostNL', 'DHL', 'DPD', 'UPS'],
        dropoffLocations: ['PostNL Points', 'Supermarkets', 'Shell Stations', 'Primera Stores']
    },
    'BE': {
        code: 'BE',
        name: 'Belgium',
        homePickupAvailable: true,
        pickupCarriers: ['bpost', 'DPD', 'UPS', 'DHL'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['bpost', 'DPD', 'UPS', 'DHL'],
        dropoffLocations: ['Post Offices', 'bpost Points', 'Pick-up Points', 'Parcel Lockers']
    },
    'MY': {
        code: 'MY',
        name: 'Malaysia',
        homePickupAvailable: true,
        pickupCarriers: ['Poslaju', 'DHL', 'FedEx', 'J&T Express'],
        pickupMinimumNotice: 48, // 2 days
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 5, // RM5
        pickupMinWeight: 1,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Poslaju', 'DHL', 'FedEx', 'J&T Express', 'Ninja Van'],
        dropoffLocations: ['Post Offices', '7-Eleven', 'MyPost Drop Points', 'Petrol Stations']
    },
    'SG': {
        code: 'SG',
        name: 'Singapore',
        homePickupAvailable: true,
        pickupCarriers: ['SingPost', 'DHL', 'FedEx', 'Ninja Van'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['SingPost', 'DHL', 'FedEx', 'Ninja Van', 'J&T Express'],
        dropoffLocations: ['Post Offices', 'POPStations', '7-Eleven', 'Cheers']
    },
    'HK': {
        code: 'HK',
        name: 'Hong Kong',
        homePickupAvailable: true,
        pickupCarriers: ['HongKong Post', 'DHL', 'FedEx', 'SF Express'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '17:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['HongKong Post', 'DHL', 'FedEx', 'SF Express'],
        dropoffLocations: ['Post Offices', '7-Eleven', 'Circle K', 'SF Lockers']
    },
    'JP': {
        code: 'JP',
        name: 'Japan',
        homePickupAvailable: true,
        pickupCarriers: ['Japan Post', 'Yamato', 'Sagawa', 'DHL'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '18:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Japan Post', 'Yamato', 'Sagawa', 'DHL', 'FedEx'],
        dropoffLocations: ['Post Offices', 'Convenience Stores', 'Yamato Centers', 'PUDO Stations']
    },
    'KR': {
        code: 'KR',
        name: 'South Korea',
        homePickupAvailable: true,
        pickupCarriers: ['Korea Post', 'CJ Logistics', 'Hanjin', 'DHL'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '17:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Korea Post', 'CJ Logistics', 'Hanjin', 'DHL'],
        dropoffLocations: ['Post Offices', 'Convenience Stores', 'CU Stores', 'GS25']
    },
    'CN': {
        code: 'CN',
        name: 'China',
        homePickupAvailable: true,
        pickupCarriers: ['China Post', 'SF Express', 'YTO', 'ZTO'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '18:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['China Post', 'SF Express', 'YTO', 'ZTO', 'JD Logistics'],
        dropoffLocations: ['Post Offices', 'SF Stores', 'Cainiao Stations', 'Convenience Stores']
    },
    'IN': {
        code: 'IN',
        name: 'India',
        homePickupAvailable: true,
        pickupCarriers: ['India Post', 'Blue Dart', 'DTDC', 'DHL'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 35,
        dropoffOnly: false,
        majorCarriers: ['India Post', 'Blue Dart', 'DTDC', 'DHL', 'FedEx'],
        dropoffLocations: ['Post Offices', 'Blue Dart Centers', 'DTDC Offices', 'Retail Partners']
    },
    'TH': {
        code: 'TH',
        name: 'Thailand',
        homePickupAvailable: true,
        pickupCarriers: ['Thailand Post', 'Kerry Express', 'Flash Express', 'DHL'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '17:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Thailand Post', 'Kerry Express', 'Flash Express', 'DHL', 'J&T Express'],
        dropoffLocations: ['Post Offices', '7-Eleven', 'Kerry Lockers', 'Family Mart']
    },
    'VN': {
        code: 'VN',
        name: 'Vietnam',
        homePickupAvailable: true,
        pickupCarriers: ['Vietnam Post', 'Giao Hang Nhanh', 'J&T Express', 'Ninja Van'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '17:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Vietnam Post', 'Giao Hang Nhanh', 'J&T Express', 'Ninja Van'],
        dropoffLocations: ['Post Offices', 'Circle K', 'Mini Mart', 'GHN Points']
    },
    'ID': {
        code: 'ID',
        name: 'Indonesia',
        homePickupAvailable: true,
        pickupCarriers: ['Pos Indonesia', 'JNE', 'J&T Express', 'SiCepat'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Pos Indonesia', 'JNE', 'J&T Express', 'SiCepat', 'Ninja Xpress'],
        dropoffLocations: ['Post Offices', 'Indomaret', 'Alfamart', 'JNE Counters']
    },
    'PH': {
        code: 'PH',
        name: 'Philippines',
        homePickupAvailable: true,
        pickupCarriers: ['PHLPost', 'LBC', 'J&T Express', 'Ninja Van'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 50, // ₱50
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['PHLPost', 'LBC', 'J&T Express', 'Ninja Van', 'Xend'],
        dropoffLocations: ['Post Offices', 'LBC Branches', '7-Eleven', 'M Lhuillier']
    },
    'MX': {
        code: 'MX',
        name: 'Mexico',
        homePickupAvailable: true,
        pickupCarriers: ['Correos de México', 'DHL', 'FedEx', 'Estafeta'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '14:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Correos de México', 'DHL', 'FedEx', 'Estafeta', 'Redpack'],
        dropoffLocations: ['Post Offices', 'OXXO', '7-Eleven', 'Estafeta Offices']
    },
    'BR': {
        code: 'BR',
        name: 'Brazil',
        homePickupAvailable: true,
        pickupCarriers: ['Correios', 'DHL', 'FedEx', 'Jadlog'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Correios', 'DHL', 'FedEx', 'Jadlog', 'Total Express'],
        dropoffLocations: ['Post Offices', 'Correios Agencies', 'Lotéricas', 'Partner Stores']
    },
    'AE': {
        code: 'AE',
        name: 'United Arab Emirates',
        homePickupAvailable: true,
        pickupCarriers: ['Emirates Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Emirates Post', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL ServicePoints', 'Emirates Deliver', 'Aramex Shops']
    },
    'SA': {
        code: 'SA',
        name: 'Saudi Arabia',
        homePickupAvailable: true,
        pickupCarriers: ['Saudi Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Saudi Post', 'DHL', 'FedEx', 'Aramex', 'SMSA'],
        dropoffLocations: ['Post Offices', 'DHL ServicePoints', 'SMSA Branches', 'Aramex Shops']
    },
    'ZA': {
        code: 'ZA',
        name: 'South Africa',
        homePickupAvailable: true,
        pickupCarriers: ['SAPO', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '14:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['SAPO', 'DHL', 'FedEx', 'Aramex', 'The Courier Guy'],
        dropoffLocations: ['Post Offices', 'Pudo Lockers', 'Pick n Pay', 'Checkers']
    },
    'EG': {
        code: 'EG',
        name: 'Egypt',
        homePickupAvailable: true,
        pickupCarriers: ['Egypt Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Egypt Post', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL ServicePoints', 'Aramex Shops', 'Bosta Points']
    },
    'PL': {
        code: 'PL',
        name: 'Poland',
        homePickupAvailable: true,
        pickupCarriers: ['Poczta Polska', 'InPost', 'DPD', 'UPS'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Poczta Polska', 'InPost', 'DPD', 'UPS', 'DHL'],
        dropoffLocations: ['Post Offices', 'InPost Paczkomaty', 'Żabka', 'Orlen Stations']
    },
    'SE': {
        code: 'SE',
        name: 'Sweden',
        homePickupAvailable: true,
        pickupCarriers: ['PostNord', 'DHL', 'UPS', 'Bring'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 35,
        dropoffOnly: false,
        majorCarriers: ['PostNord', 'DHL', 'UPS', 'Bring', 'Budbee'],
        dropoffLocations: ['Post Offices', 'ICA Stores', 'Pressbyrån', 'Service Points']
    },
    'NO': {
        code: 'NO',
        name: 'Norway',
        homePickupAvailable: true,
        pickupCarriers: ['Posten Norge', 'Bring', 'DHL', 'UPS'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 35,
        dropoffOnly: false,
        majorCarriers: ['Posten Norge', 'Bring', 'DHL', 'UPS'],
        dropoffLocations: ['Post Offices', 'Post i Butikk', 'Narvesen', 'Circle K']
    },
    'DK': {
        code: 'DK',
        name: 'Denmark',
        homePickupAvailable: true,
        pickupCarriers: ['PostNord', 'GLS', 'DHL', 'UPS'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 35,
        dropoffOnly: false,
        majorCarriers: ['PostNord', 'GLS', 'DHL', 'UPS', 'DAO'],
        dropoffLocations: ['Post Offices', 'Pakkeshops', '7-Eleven', 'Shell Stations']
    },
    'FI': {
        code: 'FI',
        name: 'Finland',
        homePickupAvailable: true,
        pickupCarriers: ['Posti', 'Matkahuolto', 'DHL', 'UPS'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 35,
        dropoffOnly: false,
        majorCarriers: ['Posti', 'Matkahuolto', 'DHL', 'UPS'],
        dropoffLocations: ['Post Offices', 'Parcel Machines', 'R-kioski', 'K-Markets']
    },
    'NZ': {
        code: 'NZ',
        name: 'New Zealand',
        homePickupAvailable: true,
        pickupCarriers: ['NZ Post', 'CourierPost', 'DHL', 'FedEx'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['NZ Post', 'CourierPost', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'BookMe Boxes', 'ParcelPod', 'Participating Stores']
    },
    'IE': {
        code: 'IE',
        name: 'Ireland',
        homePickupAvailable: true,
        pickupCarriers: ['An Post', 'DPD', 'Fastway', 'DHL'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['An Post', 'DPD', 'Fastway', 'DHL', 'UPS'],
        dropoffLocations: ['Post Offices', 'Parcel Lockers', 'Centra', 'SuperValu']
    },
    'CH': {
        code: 'CH',
        name: 'Switzerland',
        homePickupAvailable: true,
        pickupCarriers: ['Swiss Post', 'DHL', 'UPS', 'DPD'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '17:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Swiss Post', 'DHL', 'UPS', 'DPD'],
        dropoffLocations: ['Post Offices', 'MyPost 24 Boxes', 'Kiosks', 'Partner Stores']
    },
    'AT': {
        code: 'AT',
        name: 'Austria',
        homePickupAvailable: true,
        pickupCarriers: ['Österreichische Post', 'DHL', 'DPD', 'UPS'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 31.5,
        dropoffOnly: false,
        majorCarriers: ['Österreichische Post', 'DHL', 'DPD', 'UPS', 'GLS'],
        dropoffLocations: ['Post Offices', 'Post Partner', 'Packstationen', 'Bipa Stores']
    },
    'PT': {
        code: 'PT',
        name: 'Portugal',
        homePickupAvailable: true,
        pickupCarriers: ['CTT', 'DPD', 'UPS', 'DHL'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['CTT', 'DPD', 'UPS', 'DHL', 'NACEX'],
        dropoffLocations: ['Post Offices', 'CTT Expresso', 'Payshop', 'Partner Stores']
    },
    'GR': {
        code: 'GR',
        name: 'Greece',
        homePickupAvailable: true,
        pickupCarriers: ['ELTA', 'ACS', 'Speedex', 'DHL'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '14:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['ELTA', 'ACS', 'Speedex', 'DHL', 'Geniki Taxydromiki'],
        dropoffLocations: ['Post Offices', 'ACS Shops', 'Speedex Points', 'Partner Stores']
    },
    'CZ': {
        code: 'CZ',
        name: 'Czech Republic',
        homePickupAvailable: true,
        pickupCarriers: ['Česká pošta', 'PPL', 'DPD', 'DHL'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Česká pošta', 'PPL', 'DPD', 'DHL', 'Zásilkovna'],
        dropoffLocations: ['Post Offices', 'Zásilkovna Points', 'Balikomat Boxes', 'Partner Stores']
    },
    'HU': {
        code: 'HU',
        name: 'Hungary',
        homePickupAvailable: true,
        pickupCarriers: ['Magyar Posta', 'GLS', 'DPD', 'DHL'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Magyar Posta', 'GLS', 'DPD', 'DHL', 'Foxpost'],
        dropoffLocations: ['Post Offices', 'MPL Machines', 'Foxpost Boxes', 'MOL Stations']
    },
    'RO': {
        code: 'RO',
        name: 'Romania',
        homePickupAvailable: true,
        pickupCarriers: ['Poșta Română', 'FAN Courier', 'DPD', 'DHL'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Poșta Română', 'FAN Courier', 'DPD', 'DHL', 'Cargus'],
        dropoffLocations: ['Post Offices', 'Easybox Lockers', 'FAN Offices', 'Partner Stores']
    },
    'BG': {
        code: 'BG',
        name: 'Bulgaria',
        homePickupAvailable: true,
        pickupCarriers: ['Bulgarian Posts', 'Econt', 'Speedy', 'DHL'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Bulgarian Posts', 'Econt', 'Speedy', 'DHL', 'DPD'],
        dropoffLocations: ['Post Offices', 'Econt Offices', 'Speedy Offices', 'EasyPay Stores']
    },
    'TR': {
        code: 'TR',
        name: 'Turkey',
        homePickupAvailable: true,
        pickupCarriers: ['PTT', 'Yurtiçi Kargo', 'Aras Kargo', 'DHL'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '17:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['PTT', 'Yurtiçi Kargo', 'Aras Kargo', 'DHL', 'MNG Kargo'],
        dropoffLocations: ['Post Offices', 'PTT Branches', 'Cargo Offices', 'Partner Stores']
    },
    'IL': {
        code: 'IL',
        name: 'Israel',
        homePickupAvailable: true,
        pickupCarriers: ['Israel Post', 'DHL', 'FedEx', 'UPS'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Israel Post', 'DHL', 'FedEx', 'UPS'],
        dropoffLocations: ['Post Offices', 'DHL ServicePoints', 'Collection Centers']
    },
    'AR': {
        code: 'AR',
        name: 'Argentina',
        homePickupAvailable: true,
        pickupCarriers: ['Correo Argentino', 'OCA', 'Andreani', 'DHL'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '14:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Correo Argentino', 'OCA', 'Andreani', 'DHL'],
        dropoffLocations: ['Post Offices', 'OCA Branches', 'Andreani Points', 'Rapipago']
    },
    'CL': {
        code: 'CL',
        name: 'Chile',
        homePickupAvailable: true,
        pickupCarriers: ['Correos de Chile', 'Chilexpress', 'DHL', 'FedEx'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '14:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Correos de Chile', 'Chilexpress', 'DHL', 'FedEx', 'Blue Express'],
        dropoffLocations: ['Post Offices', 'Chilexpress Branches', 'Blue Express Points', 'ServiEstado']
    },
    'CO': {
        code: 'CO',
        name: 'Colombia',
        homePickupAvailable: true,
        pickupCarriers: ['4-72', 'Servientrega', 'DHL', 'FedEx'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['4-72', 'Servientrega', 'DHL', 'FedEx', 'TCC'],
        dropoffLocations: ['Post Offices', 'Servientrega Points', 'Efecty', 'SuperGiros']
    },
    'PE': {
        code: 'PE',
        name: 'Peru',
        homePickupAvailable: true,
        pickupCarriers: ['Serpost', 'Olva Courier', 'DHL', 'FedEx'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '14:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Serpost', 'Olva Courier', 'DHL', 'FedEx', 'Shalom'],
        dropoffLocations: ['Post Offices', 'Olva Agencies', 'Tambo Stores', 'Partner Points']
    },
    'NG': {
        code: 'NG',
        name: 'Nigeria',
        homePickupAvailable: true,
        pickupCarriers: ['NIPOST', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['NIPOST', 'DHL', 'FedEx', 'Aramex', 'GIG Logistics'],
        dropoffLocations: ['Post Offices', 'DHL ServicePoints', 'GIG Offices', 'Partner Stores']
    },
    'KE': {
        code: 'KE',
        name: 'Kenya',
        homePickupAvailable: true,
        pickupCarriers: ['Posta Kenya', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Posta Kenya', 'DHL', 'FedEx', 'Aramex', 'Wells Fargo'],
        dropoffLocations: ['Post Offices', 'DHL ServicePoints', 'Partner Stores', 'Huduma Centers']
    },
    'PK': {
        code: 'PK',
        name: 'Pakistan',
        homePickupAvailable: true,
        pickupCarriers: ['Pakistan Post', 'TCS', 'Leopards', 'DHL'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Pakistan Post', 'TCS', 'Leopards', 'DHL', 'M&P Express'],
        dropoffLocations: ['Post Offices', 'TCS Offices', 'Leopards Centers', 'Partner Stores']
    },
    'BD': {
        code: 'BD',
        name: 'Bangladesh',
        homePickupAvailable: true,
        pickupCarriers: ['Bangladesh Post', 'Sundarban', 'eCourier', 'DHL'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '16:00',
        pickupDays: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Bangladesh Post', 'Sundarban', 'eCourier', 'DHL', 'Pathao'],
        dropoffLocations: ['Post Offices', 'eCourier Points', 'Sundarban Hubs', 'Partner Stores']
    },
    'LK': {
        code: 'LK',
        name: 'Sri Lanka',
        homePickupAvailable: true,
        pickupCarriers: ['Sri Lanka Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Sri Lanka Post', 'DHL', 'FedEx', 'Aramex', 'Pronto'],
        dropoffLocations: ['Post Offices', 'DHL ServicePoints', 'Partner Stores']
    },
    'TW': {
        code: 'TW',
        name: 'Taiwan',
        homePickupAvailable: true,
        pickupCarriers: ['Chunghwa Post', 'Kerry TJ Logistics', 'HCT Logistics', 'DHL'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '17:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Chunghwa Post', 'Kerry TJ', 'HCT', 'DHL', 'FedEx'],
        dropoffLocations: ['Post Offices', '7-Eleven', 'FamilyMart', 'Hi-Life']
    },
    'MM': {
        code: 'MM',
        name: 'Myanmar',
        homePickupAvailable: true,
        pickupCarriers: ['MPT', 'DHL', 'FedEx'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['MPT', 'DHL', 'FedEx', 'Kerry Express'],
        dropoffLocations: ['Post Offices', 'DHL ServicePoints', 'Partner Stores']
    },
    'KH': {
        code: 'KH',
        name: 'Cambodia',
        homePickupAvailable: true,
        pickupCarriers: ['Cambodia Post', 'DHL', 'Kerry Express', 'J&T Express'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Cambodia Post', 'DHL', 'Kerry Express', 'J&T Express'],
        dropoffLocations: ['Post Offices', 'DHL Points', 'Partner Stores']
    },
    'LA': {
        code: 'LA',
        name: 'Laos',
        homePickupAvailable: true,
        pickupCarriers: ['Lao Post', 'DHL', 'Kerry Express'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Lao Post', 'DHL', 'Kerry Express'],
        dropoffLocations: ['Post Offices', 'DHL Points']
    },
    'NP': {
        code: 'NP',
        name: 'Nepal',
        homePickupAvailable: true,
        pickupCarriers: ['Nepal Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Nepal Post', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL Points', 'Partner Stores']
    },
    'BN': {
        code: 'BN',
        name: 'Brunei',
        homePickupAvailable: true,
        pickupCarriers: ['Brunei Post', 'DHL', 'FedEx'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Brunei Post', 'DHL', 'FedEx'],
        dropoffLocations: ['Post Offices', 'DHL Points']
    },
    'MV': {
        code: 'MV',
        name: 'Maldives',
        homePickupAvailable: true,
        pickupCarriers: ['Maldives Post', 'DHL', 'FedEx'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '15:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Maldives Post', 'DHL', 'FedEx'],
        dropoffLocations: ['Post Offices', 'DHL Points']
    },
    'JO': {
        code: 'JO',
        name: 'Jordan',
        homePickupAvailable: true,
        pickupCarriers: ['Jordan Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Jordan Post', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL Points', 'Aramex Shops']
    },
    'LB': {
        code: 'LB',
        name: 'Lebanon',
        homePickupAvailable: true,
        pickupCarriers: ['LibanPost', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['LibanPost', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL Points', 'Aramex Shops']
    },
    'KW': {
        code: 'KW',
        name: 'Kuwait',
        homePickupAvailable: true,
        pickupCarriers: ['Kuwait Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Kuwait Post', 'DHL', 'FedEx', 'Aramex', 'SMSA'],
        dropoffLocations: ['Post Offices', 'DHL Points', 'Aramex Shops']
    },
    'OM': {
        code: 'OM',
        name: 'Oman',
        homePickupAvailable: true,
        pickupCarriers: ['Oman Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Oman Post', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL Points', 'Aramex Shops']
    },
    'QA': {
        code: 'QA',
        name: 'Qatar',
        homePickupAvailable: true,
        pickupCarriers: ['Q-Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Q-Post', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL Points', 'Aramex Shops']
    },
    'BH': {
        code: 'BH',
        name: 'Bahrain',
        homePickupAvailable: true,
        pickupCarriers: ['Bahrain Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 24,
        pickupCutoffTime: '16:00',
        pickupDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Bahrain Post', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL Points', 'Aramex Shops']
    },
    'GH': {
        code: 'GH',
        name: 'Ghana',
        homePickupAvailable: true,
        pickupCarriers: ['Ghana Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Ghana Post', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL Points']
    },
    'ET': {
        code: 'ET',
        name: 'Ethiopia',
        homePickupAvailable: true,
        pickupCarriers: ['Ethiopian Postal Service', 'DHL', 'FedEx'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Ethiopian Postal Service', 'DHL', 'FedEx'],
        dropoffLocations: ['Post Offices', 'DHL Points']
    },
    'UG': {
        code: 'UG',
        name: 'Uganda',
        homePickupAvailable: true,
        pickupCarriers: ['Uganda Post', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Uganda Post', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL Points']
    },
    'TZ': {
        code: 'TZ',
        name: 'Tanzania',
        homePickupAvailable: true,
        pickupCarriers: ['Tanzania Posts', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Tanzania Posts', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL Points']
    },
    'MA': {
        code: 'MA',
        name: 'Morocco',
        homePickupAvailable: true,
        pickupCarriers: ['Barid Al-Maghrib', 'DHL', 'FedEx', 'Aramex'],
        pickupMinimumNotice: 48,
        pickupCutoffTime: '15:00',
        pickupDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pickupFee: 0,
        pickupMinWeight: 0,
        pickupMaxWeight: 30,
        dropoffOnly: false,
        majorCarriers: ['Barid Al-Maghrib', 'DHL', 'FedEx', 'Aramex'],
        dropoffLocations: ['Post Offices', 'DHL Points', 'Aramex Shops']
    }
};

// Helper function to detect country from address
export function detectCountry(address: string): string | null {
    const upperAddress = address.toUpperCase();
    
    // Check country codes
    for (const [code, data] of Object.entries(COUNTRY_REGULATIONS)) {
        if (upperAddress.includes(code) || upperAddress.includes(data.name.toUpperCase())) {
            return code;
        }
    }
    
    // Check common country name variations
    const countryNames: { [key: string]: string } = {
        'UNITED STATES': 'US', 'USA': 'US', 'AMERICA': 'US',
        'UNITED KINGDOM': 'UK', 'BRITAIN': 'UK', 'ENGLAND': 'UK',
        'GERMANY': 'DE', 'DEUTSCHLAND': 'DE',
        'FRANCE': 'FR',
        'ITALY': 'IT', 'ITALIA': 'IT',
        'SPAIN': 'ES', 'ESPANA': 'ES',
        'NETHERLANDS': 'NL', 'HOLLAND': 'NL',
        'BELGIUM': 'BE', 'BELGIË': 'BE',
        'CHINA': 'CN', 'PRC': 'CN',
        'JAPAN': 'JP',
        'SOUTH KOREA': 'KR', 'KOREA': 'KR',
        'INDIA': 'IN',
        'AUSTRALIA': 'AU',
        'CANADA': 'CA',
        'MEXICO': 'MX',
        'BRAZIL': 'BR', 'BRASIL': 'BR',
        'UAE': 'AE', 'UNITED ARAB EMIRATES': 'AE',
        'SAUDI ARABIA': 'SA', 'KSA': 'SA',
        'SINGAPORE': 'SG',
        'HONG KONG': 'HK',
        'MALAYSIA': 'MY',
        'THAILAND': 'TH',
        'VIETNAM': 'VN',
        'INDONESIA': 'ID',
        'PHILIPPINES': 'PH',
        'SOUTH AFRICA': 'ZA',
        'EGYPT': 'EG',
        'TURKEY': 'TR',
        'RUSSIA': 'RU'
    };
    
    for (const [name, code] of Object.entries(countryNames)) {
        if (upperAddress.includes(name)) {
            return code;
        }
    }
    
    return null;
}

// Prohibited items keywords
const PROHIBITED_KEYWORDS: { [key: string]: string[] } = {
    'drugs': ['drug', 'narcotic', 'cannabis', 'marijuana', 'cocaine', 'heroin', 'opium'],
    'weapons': ['weapon', 'gun', 'rifle', 'pistol', 'knife', 'sword', 'ammunition', 'ammo'],
    'explosives': ['explosive', 'bomb', 'dynamite', 'tnt', 'fireworks', 'firecracker'],
    'counterfeit': ['counterfeit', 'fake', 'replica', 'imitation'],
    'batteries': ['battery', 'lithium', 'lipo', 'li-ion', 'li-poly'],
    'perfume': ['perfume', 'cologne', 'fragrance', 'aftershave'],
    'alcohol': ['alcohol', 'wine', 'beer', 'whiskey', 'vodka', 'spirits', 'liquor'],
    'tobacco': ['tobacco', 'cigarette', 'cigar', 'e-cigarette', 'vape', 'vaping'],
    'pork': ['pork', 'bacon', 'ham', 'sausage'],
    'medication': ['medication', 'medicine', 'pharmaceutical', 'prescription', 'drug']
};

// Restricted items keywords
const RESTRICTED_KEYWORDS: { [key: string]: string[] } = {
    'electronics': ['electronic', 'device', 'computer', 'laptop', 'phone', 'tablet', 'camera'],
    'cosmetics': ['cosmetic', 'makeup', 'lipstick', 'nail polish', 'skincare'],
    'food': ['food', 'chocolate', 'candy', 'snack', 'beverage', 'drink'],
    'plants': ['plant', 'seed', 'flower', 'herb', 'vegetable'],
    'animals': ['animal', 'pet', 'dog', 'cat', 'bird', 'fish'],
    'liquids': ['liquid', 'fluid', 'oil', 'paint', 'ink'],
    'chemicals': ['chemical', 'acid', 'base', 'solvent', 'cleaner']
};

/**
 * Comprehensive compliance check for international shipping
 * Optimized for speed - runs synchronously without external API calls
 * SMART: Automatically detects local vs international and skips unnecessary checks
 */
export function checkCompliance(params: {
    originAddress: string;
    destinationAddress: string;
    itemDescription: string;
    hsCode?: string;
    weight: number;
    value: number;
    serviceType?: string;
}): ComplianceCheck {
    const originCountry = detectCountry(params.originAddress);
    const destCountry = detectCountry(params.destinationAddress);
    
    // SMART DETECTION: Check if this is a local delivery (same country)
    const isLocalDelivery = originCountry === destCountry;
    
    console.log(`[COMPLIANCE] ${isLocalDelivery ? 'LOCAL' : 'INTERNATIONAL'} delivery detected: ${originCountry} → ${destCountry}`);
    
    // For local deliveries, perform minimal compliance checks
    if (isLocalDelivery) {
        const description = params.itemDescription.toLowerCase();
        const prohibitedItems: string[] = [];
        const warnings: string[] = [];
        const errors: string[] = [];
        
        // Only check for universally prohibited items (drugs, weapons, explosives)
        const criticalProhibited = ['drugs', 'weapons', 'explosives'];
        for (const category of criticalProhibited) {
            if (PROHIBITED_KEYWORDS[category]) {
                for (const keyword of PROHIBITED_KEYWORDS[category]) {
                    if (description.includes(keyword)) {
                        prohibitedItems.push(category);
                        errors.push(`${category} cannot be shipped domestically`);
                        break;
                    }
                }
            }
        }
        
        return {
            originCountry: originCountry || 'Unknown',
            destinationCountry: destCountry || 'Unknown',
            itemDescription: params.itemDescription,
            hsCode: params.hsCode,
            weight: params.weight,
            value: params.value,
            requiresPreInspection: false,
            requiresCertificate: false,
            prohibitedItems,
            restrictedItems: [],
            exportRestrictions: [],
            importRestrictions: [],
            exportTaxRate: 0,
            importTaxRate: 0,
            importDutyRate: 0,
            cfrCost: 0,
            xWorkCost: 0,
            totalAdditionalCosts: 0,
            requiredDocuments: [],
            warnings,
            errors
        };
    }
    
    // For INTERNATIONAL deliveries, perform full compliance check
    const originRegs = originCountry ? COUNTRY_REGULATIONS[originCountry] : null;
    const destRegs = destCountry ? COUNTRY_REGULATIONS[destCountry] : null;
    
    const description = params.itemDescription.toLowerCase();
    const prohibitedItems: string[] = [];
    const restrictedItems: string[] = [];
    const exportRestrictions: string[] = [];
    const importRestrictions: string[] = [];
    const requiredDocuments: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check prohibited items
    for (const [category, keywords] of Object.entries(PROHIBITED_KEYWORDS)) {
        for (const keyword of keywords) {
            if (description.includes(keyword)) {
                prohibitedItems.push(category);
                break;
            }
        }
    }
    
    // Check restricted items
    for (const [category, keywords] of Object.entries(RESTRICTED_KEYWORDS)) {
        for (const keyword of keywords) {
            if (description.includes(keyword)) {
                restrictedItems.push(category);
                break;
            }
        }
    }
    
    // Check origin country restrictions
    if (originRegs) {
        for (const restriction of originRegs.exportRestrictions) {
            if (description.includes(restriction)) {
                exportRestrictions.push(restriction);
            }
        }
        
        // Check prohibited items against origin
        for (const item of prohibitedItems) {
            if (originRegs.prohibitedItems.includes(item)) {
                errors.push(`${item} is prohibited for export from ${originRegs.name}`);
            }
        }
    }
    
    // Check destination country restrictions
    if (destRegs) {
        for (const restriction of destRegs.importRestrictions) {
            if (description.includes(restriction)) {
                importRestrictions.push(restriction);
            }
        }
        
        // Check prohibited items against destination
        for (const item of prohibitedItems) {
            if (destRegs.prohibitedItems.includes(item)) {
                errors.push(`${item} is prohibited for import into ${destRegs.name}`);
            }
        }
        
        // Check restricted items
        for (const item of restrictedItems) {
            if (destRegs.restrictedItems.includes(item)) {
                warnings.push(`${item} requires special documentation for import into ${destRegs.name}`);
                requiredDocuments.push(`${item} import permit`);
            }
        }
        
        // Add required certificates
        if (destRegs.requiresPreInspection && destRegs.commonCertificateTypes.length > 0) {
            requiredDocuments.push(...destRegs.commonCertificateTypes.map(cert => `${cert} Certificate`));
        }
    }
    
    // Calculate costs
    const originTaxRate = originRegs?.taxRates.export || 0;
    const destTaxRate = destRegs?.taxRates.import || 0;
    const destDutyRate = destRegs?.taxRates.duty || 0;
    
    const exportTax = (params.value * originTaxRate) / 100;
    const importTax = (params.value * destTaxRate) / 100;
    const importDuty = (params.value * destDutyRate) / 100;
    
    const cfrMultiplier = destRegs?.cfrMultiplier || 0.12;
    const xWorkMultiplier = destRegs?.xWorkMultiplier || 0.06;
    
    const cfrCost = params.value * cfrMultiplier;
    const xWorkCost = params.value * xWorkMultiplier;
    
    const totalAdditionalCosts = exportTax + importTax + importDuty + cfrCost + xWorkCost;
    
    // Determine if pre-inspection is required
    const requiresPreInspection = destRegs?.requiresPreInspection || false;
    const requiresCertificate = requiredDocuments.length > 0;
    const certificateType = destRegs?.commonCertificateTypes[0] || undefined;
    
    // Add warnings for missing HS code on international shipments
    if (originCountry && destCountry && originCountry !== destCountry && !params.hsCode) {
        warnings.push('HS Code is required for international shipments. Please generate one.');
    }
    
    // Add warnings for high value shipments
    if (params.value > 5000) {
        warnings.push('High value shipment - additional insurance recommended');
    }
    
    // Add warnings for heavy shipments
    if (params.weight > 30) {
        warnings.push('Heavy shipment - special handling may be required');
    }
    
    return {
        originCountry: originCountry || 'Unknown',
        destinationCountry: destCountry || 'Unknown',
        itemDescription: params.itemDescription,
        hsCode: params.hsCode,
        weight: params.weight,
        value: params.value,
        requiresPreInspection,
        requiresCertificate,
        certificateType,
        prohibitedItems: [...new Set(prohibitedItems)],
        restrictedItems: [...new Set(restrictedItems)],
        exportRestrictions: [...new Set(exportRestrictions)],
        importRestrictions: [...new Set(importRestrictions)],
        exportTaxRate: originTaxRate,
        importTaxRate: destTaxRate,
        importDutyRate: destDutyRate,
        cfrCost,
        xWorkCost,
        totalAdditionalCosts,
        requiredDocuments: [...new Set(requiredDocuments)],
        warnings: [...new Set(warnings)],
        errors: [...new Set(errors)]
    };
}

