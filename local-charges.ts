// Local Charges Database for Freight Forwarding
// Country-specific destination charges, terminal handling, customs, documentation fees

export interface LocalCharges {
    country: string;
    countryCode: string;
    currency: string;
    charges: {
        destinationCharges: number;
        terminalHandling: number;
        customsClearance: number;
        documentationFee: number;
        portCharges: number;
        deliveryOrder: number;
        inspectionFee?: number;
        quarantineFee?: number;
        securityFee?: number;
    };
    notes?: string;
}

// Major trading countries with typical local charges
export const LOCAL_CHARGES_DATABASE: Record<string, LocalCharges> = {
    // North America
    'US': {
        country: 'United States',
        countryCode: 'US',
        currency: 'USD',
        charges: {
            destinationCharges: 350,
            terminalHandling: 450,
            customsClearance: 125,
            documentationFee: 75,
            portCharges: 200,
            deliveryOrder: 85,
            securityFee: 50
        },
        notes: 'ISF filing fee may apply. Charges vary by port (LA, NY, Houston).'
    },
    'CA': {
        country: 'Canada',
        countryCode: 'CA',
        currency: 'CAD',
        charges: {
            destinationCharges: 400,
            terminalHandling: 380,
            customsClearance: 150,
            documentationFee: 95,
            portCharges: 180,
            deliveryOrder: 90
        },
        notes: 'CBSA fees apply. Vancouver and Montreal have lower charges than Toronto.'
    },
    'MX': {
        country: 'Mexico',
        countryCode: 'MX',
        currency: 'USD',
        charges: {
            destinationCharges: 280,
            terminalHandling: 320,
            customsClearance: 200,
            documentationFee: 100,
            portCharges: 150,
            deliveryOrder: 70
        },
        notes: 'Customs broker mandatory. CFDI electronic invoice required.'
    },

    // Europe
    'GB': {
        country: 'United Kingdom',
        countryCode: 'GB',
        currency: 'GBP',
        charges: {
            destinationCharges: 280,
            terminalHandling: 320,
            customsClearance: 120,
            documentationFee: 80,
            portCharges: 160,
            deliveryOrder: 65
        },
        notes: 'Post-Brexit customs clearance required. Felixstowe and Southampton rates shown.'
    },
    'DE': {
        country: 'Germany',
        countryCode: 'DE',
        currency: 'EUR',
        charges: {
            destinationCharges: 300,
            terminalHandling: 350,
            customsClearance: 95,
            documentationFee: 70,
            portCharges: 140,
            deliveryOrder: 60
        },
        notes: 'Hamburg port charges. EORI number required for EU customs.'
    },
    'FR': {
        country: 'France',
        countryCode: 'FR',
        currency: 'EUR',
        charges: {
            destinationCharges: 320,
            terminalHandling: 360,
            customsClearance: 100,
            documentationFee: 75,
            portCharges: 150,
            deliveryOrder: 65
        },
        notes: 'Le Havre port. EORI and TVA number required.'
    },
    'NL': {
        country: 'Netherlands',
        countryCode: 'NL',
        currency: 'EUR',
        charges: {
            destinationCharges: 290,
            terminalHandling: 340,
            customsClearance: 90,
            documentationFee: 65,
            portCharges: 135,
            deliveryOrder: 60
        },
        notes: 'Rotterdam - Europe\'s largest port. Very competitive rates.'
    },
    'BE': {
        country: 'Belgium',
        countryCode: 'BE',
        currency: 'EUR',
        charges: {
            destinationCharges: 310,
            terminalHandling: 355,
            customsClearance: 95,
            documentationFee: 70,
            portCharges: 145,
            deliveryOrder: 62
        },
        notes: 'Antwerp port charges. Gateway to European market.'
    },
    'ES': {
        country: 'Spain',
        countryCode: 'ES',
        currency: 'EUR',
        charges: {
            destinationCharges: 295,
            terminalHandling: 345,
            customsClearance: 105,
            documentationFee: 80,
            portCharges: 155,
            deliveryOrder: 68
        },
        notes: 'Barcelona and Valencia ports. DUA customs document required.'
    },
    'IT': {
        country: 'Italy',
        countryCode: 'IT',
        currency: 'EUR',
        charges: {
            destinationCharges: 330,
            terminalHandling: 370,
            customsClearance: 110,
            documentationFee: 85,
            portCharges: 165,
            deliveryOrder: 70
        },
        notes: 'Genoa and Naples ports. Higher handling fees than northern EU.'
    },

    // Asia Pacific
    'CN': {
        country: 'China',
        countryCode: 'CN',
        currency: 'USD',
        charges: {
            destinationCharges: 250,
            terminalHandling: 280,
            customsClearance: 150,
            documentationFee: 90,
            portCharges: 120,
            deliveryOrder: 55,
            inspectionFee: 100,
            quarantineFee: 80
        },
        notes: 'Shanghai/Shenzhen rates. CIQ inspection for certain goods. Import license may be required.'
    },
    'JP': {
        country: 'Japan',
        countryCode: 'JP',
        currency: 'USD',
        charges: {
            destinationCharges: 400,
            terminalHandling: 420,
            customsClearance: 180,
            documentationFee: 120,
            portCharges: 200,
            deliveryOrder: 95,
            inspectionFee: 150
        },
        notes: 'Tokyo/Yokohama ports. Japan Customs pre-clearance available. Higher fees but efficient.'
    },
    'KR': {
        country: 'South Korea',
        countryCode: 'KR',
        currency: 'USD',
        charges: {
            destinationCharges: 320,
            terminalHandling: 350,
            customsClearance: 140,
            documentationFee: 95,
            portCharges: 160,
            deliveryOrder: 75
        },
        notes: 'Busan port - Asia\'s major transshipment hub. UNI-PASS customs system.'
    },
    'SG': {
        country: 'Singapore',
        countryCode: 'SG',
        currency: 'USD',
        charges: {
            destinationCharges: 280,
            terminalHandling: 320,
            customsClearance: 100,
            documentationFee: 70,
            portCharges: 140,
            deliveryOrder: 60
        },
        notes: 'World\'s busiest transshipment port. Free trade zone benefits. Very efficient customs.'
    },
    'MY': {
        country: 'Malaysia',
        countryCode: 'MY',
        currency: 'USD',
        charges: {
            destinationCharges: 240,
            terminalHandling: 280,
            customsClearance: 120,
            documentationFee: 80,
            portCharges: 130,
            deliveryOrder: 65
        },
        notes: 'Port Klang - competitive rates. K1, K2 customs forms required.'
    },
    'TH': {
        country: 'Thailand',
        countryCode: 'TH',
        currency: 'USD',
        charges: {
            destinationCharges: 260,
            terminalHandling: 300,
            customsClearance: 130,
            documentationFee: 85,
            portCharges: 140,
            deliveryOrder: 70
        },
        notes: 'Laem Chabang port. BOI certificate can reduce duties.'
    },
    'VN': {
        country: 'Vietnam',
        countryCode: 'VN',
        currency: 'USD',
        charges: {
            destinationCharges: 230,
            terminalHandling: 270,
            customsClearance: 140,
            documentationFee: 90,
            portCharges: 125,
            deliveryOrder: 65,
            inspectionFee: 80
        },
        notes: 'Ho Chi Minh/Haiphong ports. Certificate of Origin important for FTAs.'
    },
    'IN': {
        country: 'India',
        countryCode: 'IN',
        currency: 'USD',
        charges: {
            destinationCharges: 290,
            terminalHandling: 330,
            customsClearance: 160,
            documentationFee: 100,
            portCharges: 150,
            deliveryOrder: 80,
            inspectionFee: 120
        },
        notes: 'Mumbai/Chennai ports. IGST payable at customs. Import license for restricted items.'
    },
    'ID': {
        country: 'Indonesia',
        countryCode: 'ID',
        currency: 'USD',
        charges: {
            destinationCharges: 270,
            terminalHandling: 310,
            customsClearance: 150,
            documentationFee: 95,
            portCharges: 145,
            deliveryOrder: 75,
            inspectionFee: 100
        },
        notes: 'Jakarta/Surabaya ports. API-U/API-P import license may be required.'
    },
    'PH': {
        country: 'Philippines',
        countryCode: 'PH',
        currency: 'USD',
        charges: {
            destinationCharges: 280,
            terminalHandling: 320,
            customsClearance: 145,
            documentationFee: 90,
            portCharges: 140,
            deliveryOrder: 70
        },
        notes: 'Manila port. Bureau of Customs clearance. ICC required for certain goods.'
    },
    'AU': {
        country: 'Australia',
        countryCode: 'AU',
        currency: 'AUD',
        charges: {
            destinationCharges: 420,
            terminalHandling: 460,
            customsClearance: 180,
            documentationFee: 110,
            portCharges: 190,
            deliveryOrder: 95,
            quarantineFee: 150
        },
        notes: 'Sydney/Melbourne ports. Strict biosecurity. AQIS inspection for food/wood. Fumigation may be required.'
    },
    'NZ': {
        country: 'New Zealand',
        countryCode: 'NZ',
        currency: 'NZD',
        charges: {
            destinationCharges: 390,
            terminalHandling: 430,
            customsClearance: 170,
            documentationFee: 105,
            portCharges: 180,
            deliveryOrder: 90,
            quarantineFee: 140
        },
        notes: 'Auckland port. MPI biosecurity inspection. Very strict on agricultural products.'
    },

    // Middle East
    'AE': {
        country: 'United Arab Emirates',
        countryCode: 'AE',
        currency: 'USD',
        charges: {
            destinationCharges: 320,
            terminalHandling: 360,
            customsClearance: 110,
            documentationFee: 85,
            portCharges: 155,
            deliveryOrder: 75
        },
        notes: 'Dubai/Jebel Ali - busiest Middle East port. Free zones available. Certificate of Origin required.'
    },
    'SA': {
        country: 'Saudi Arabia',
        countryCode: 'SA',
        currency: 'USD',
        charges: {
            destinationCharges: 340,
            terminalHandling: 380,
            customsClearance: 150,
            documentationFee: 100,
            portCharges: 170,
            deliveryOrder: 85,
            inspectionFee: 120
        },
        notes: 'Jeddah/Dammam ports. SABER/SASO certification for many products. Fumigation certificate often required.'
    },
    'IL': {
        country: 'Israel',
        countryCode: 'IL',
        currency: 'USD',
        charges: {
            destinationCharges: 380,
            terminalHandling: 410,
            customsClearance: 140,
            documentationFee: 95,
            portCharges: 180,
            deliveryOrder: 85,
            securityFee: 100
        },
        notes: 'Haifa/Ashdod ports. Higher security screening. Import permits for certain categories.'
    },

    // Africa
    'ZA': {
        country: 'South Africa',
        countryCode: 'ZA',
        currency: 'USD',
        charges: {
            destinationCharges: 310,
            terminalHandling: 350,
            customsClearance: 140,
            documentationFee: 95,
            portCharges: 160,
            deliveryOrder: 80
        },
        notes: 'Durban/Cape Town ports. SARS customs clearance. Letter of authority for clearing.'
    },
    'EG': {
        country: 'Egypt',
        countryCode: 'EG',
        currency: 'USD',
        charges: {
            destinationCharges: 290,
            terminalHandling: 330,
            customsClearance: 160,
            documentationFee: 105,
            portCharges: 150,
            deliveryOrder: 75,
            inspectionFee: 110
        },
        notes: 'Alexandria/Port Said. Import license required for many goods. Customs can be slow.'
    },
    'KE': {
        country: 'Kenya',
        countryCode: 'KE',
        currency: 'USD',
        charges: {
            destinationCharges: 280,
            terminalHandling: 320,
            customsClearance: 145,
            documentationFee: 100,
            portCharges: 145,
            deliveryOrder: 75,
            inspectionFee: 95
        },
        notes: 'Mombasa port - East Africa gateway. KRA customs. IDF form required.'
    },
    'NG': {
        country: 'Nigeria',
        countryCode: 'NG',
        currency: 'USD',
        charges: {
            destinationCharges: 320,
            terminalHandling: 360,
            customsClearance: 180,
            documentationFee: 120,
            portCharges: 165,
            deliveryOrder: 85,
            inspectionFee: 140
        },
        notes: 'Lagos/Tin Can Island ports. Form M, PAAR required. Destination inspection mandatory.'
    },

    // South America
    'BR': {
        country: 'Brazil',
        countryCode: 'BR',
        currency: 'USD',
        charges: {
            destinationCharges: 400,
            terminalHandling: 450,
            customsClearance: 200,
            documentationFee: 130,
            portCharges: 190,
            deliveryOrder: 95,
            inspectionFee: 150
        },
        notes: 'Santos port. Complex customs - RADAR registration needed. Import license (LI) for many products.'
    },
    'AR': {
        country: 'Argentina',
        countryCode: 'AR',
        currency: 'USD',
        charges: {
            destinationCharges: 360,
            terminalHandling: 400,
            customsClearance: 180,
            documentationFee: 115,
            portCharges: 175,
            deliveryOrder: 90
        },
        notes: 'Buenos Aires port. CUIT/CUIL required. Import restrictions common.'
    },
    'CL': {
        country: 'Chile',
        countryCode: 'CL',
        currency: 'USD',
        charges: {
            destinationCharges: 330,
            terminalHandling: 370,
            customsClearance: 150,
            documentationFee: 100,
            portCharges: 160,
            deliveryOrder: 80
        },
        notes: 'Valparaiso/San Antonio ports. RUT number needed. Competitive FTA rates.'
    },
    'CO': {
        country: 'Colombia',
        countryCode: 'CO',
        currency: 'USD',
        charges: {
            destinationCharges: 300,
            terminalHandling: 340,
            customsClearance: 155,
            documentationFee: 105,
            portCharges: 150,
            deliveryOrder: 75
        },
        notes: 'Cartagena/Buenaventura ports. DIAN customs clearance. Certificate of Origin important.'
    },
    'PE': {
        country: 'Peru',
        countryCode: 'PE',
        currency: 'USD',
        charges: {
            destinationCharges: 290,
            terminalHandling: 330,
            customsClearance: 145,
            documentationFee: 100,
            portCharges: 145,
            deliveryOrder: 75
        },
        notes: 'Callao port. SUNAT customs. Multiple FTAs - lower duties possible.'
    }
};

/**
 * Get local charges for a specific country
 */
export function getLocalCharges(countryCode: string): LocalCharges | null {
    const code = countryCode.toUpperCase();
    return LOCAL_CHARGES_DATABASE[code] || null;
}

/**
 * Calculate total local charges
 */
export function calculateTotalLocalCharges(charges: LocalCharges['charges']): number {
    return Object.values(charges).reduce((sum, val) => sum + (val || 0), 0);
}

/**
 * Format local charges for display
 */
export function formatLocalChargesBreakdown(charges: LocalCharges): string {
    const items: string[] = [];
    
    if (charges.charges.destinationCharges > 0) {
        items.push(`• Destination Charges: ${charges.currency} ${charges.charges.destinationCharges}`);
    }
    if (charges.charges.terminalHandling > 0) {
        items.push(`• Terminal Handling: ${charges.currency} ${charges.charges.terminalHandling}`);
    }
    if (charges.charges.customsClearance > 0) {
        items.push(`• Customs Clearance: ${charges.currency} ${charges.charges.customsClearance}`);
    }
    if (charges.charges.documentationFee > 0) {
        items.push(`• Documentation Fee: ${charges.currency} ${charges.charges.documentationFee}`);
    }
    if (charges.charges.portCharges > 0) {
        items.push(`• Port Charges: ${charges.currency} ${charges.charges.portCharges}`);
    }
    if (charges.charges.deliveryOrder > 0) {
        items.push(`• Delivery Order: ${charges.currency} ${charges.charges.deliveryOrder}`);
    }
    if (charges.charges.inspectionFee && charges.charges.inspectionFee > 0) {
        items.push(`• Inspection Fee: ${charges.currency} ${charges.charges.inspectionFee}`);
    }
    if (charges.charges.quarantineFee && charges.charges.quarantineFee > 0) {
        items.push(`• Quarantine Fee: ${charges.currency} ${charges.charges.quarantineFee}`);
    }
    if (charges.charges.securityFee && charges.charges.securityFee > 0) {
        items.push(`• Security Fee: ${charges.currency} ${charges.charges.securityFee}`);
    }
    
    return items.join('\n');
}

/**
 * Get destination country from port name or country input
 */
export function detectDestinationCountry(input: string): string | null {
    const inputLower = input.toLowerCase();
    
    // Map common port names to country codes
    const portToCountry: Record<string, string> = {
        // US Ports
        'los angeles': 'US', 'la': 'US', 'long beach': 'US', 'lax': 'US',
        'new york': 'US', 'ny': 'US', 'newark': 'US', 'jfk': 'US',
        'houston': 'US', 'savannah': 'US', 'seattle': 'US', 'oakland': 'US',
        
        // European Ports
        'rotterdam': 'NL', 'hamburg': 'DE', 'antwerp': 'BE', 'felixstowe': 'GB',
        'le havre': 'FR', 'barcelona': 'ES', 'genoa': 'IT', 'piraeus': 'GR',
        
        // Asian Ports
        'shanghai': 'CN', 'shenzhen': 'CN', 'ningbo': 'CN', 'hong kong': 'CN',
        'singapore': 'SG', 'busan': 'KR', 'tokyo': 'JP', 'yokohama': 'JP',
        'dubai': 'AE', 'jebel ali': 'AE', 'port klang': 'MY', 'laem chabang': 'TH',
        
        // Other Major Ports
        'sydney': 'AU', 'melbourne': 'AU', 'auckland': 'NZ', 'santos': 'BR',
        'durban': 'ZA', 'mombasa': 'KE', 'jeddah': 'SA', 'alexandria': 'EG'
    };
    
    // Check port names
    for (const [port, country] of Object.entries(portToCountry)) {
        if (inputLower.includes(port)) {
            return country;
        }
    }
    
    // Check full country names
    for (const [code, data] of Object.entries(LOCAL_CHARGES_DATABASE)) {
        if (inputLower.includes(data.country.toLowerCase())) {
            return code;
        }
    }
    
    // Check country codes
    const upperInput = input.toUpperCase();
    if (LOCAL_CHARGES_DATABASE[upperInput]) {
        return upperInput;
    }
    
    return null;
}
