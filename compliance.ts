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
        importRestrictions: ['food', 'plants', 'animals'],
        prohibitedItems: ['drugs', 'weapons', 'counterfeit'],
        restrictedItems: ['electronics', 'batteries'],
        requiresPreInspection: false,
        commonCertificateTypes: ['SIRIM', 'KKM'],
        taxRates: { export: 0, import: 6, duty: 5 },
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

// Detect country from address string
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

