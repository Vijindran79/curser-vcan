// Comprehensive Carrier Logo System
// Professional SVG logos and branding for major shipping carriers
// Bloomberg-level professional branding system

export interface CarrierLogo {
  name: string;
  code: string;
  color: string;
  secondaryColor?: string;
  svg: string;
  description: string;
  website: string;
  founded: number;
  headquarters: string;
  fleetSize: number;
}

export const carrierLogos: CarrierLogo[] = [
  {
    name: "Maersk",
    code: "MAERSK",
    color: "#003087",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#003087"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">MAERSK</text>
      <circle cx="15" cy="20" r="8" fill="white"/>
      <circle cx="15" cy="20" r="5" fill="#003087"/>
      <circle cx="105" cy="20" r="8" fill="white"/>
      <circle cx="105" cy="20" r="5" fill="#003087"/>
    </svg>`,
    description: "A.P. Moller-Maersk is the world's largest container shipping company",
    website: "https://www.maersk.com",
    founded: 1904,
    headquarters: "Copenhagen, Denmark",
    fleetSize: 700
  },
  {
    name: "MSC",
    code: "MSC",
    color: "#000000",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#000000"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">MSC</text>
      <rect x="10" y="10" width="20" height="20" fill="white"/>
      <text x="20" y="22" text-anchor="middle" fill="black" font-family="Arial, sans-serif" font-size="10" font-weight="bold">M</text>
      <rect x="90" y="10" width="20" height="20" fill="white"/>
      <text x="100" y="22" text-anchor="middle" fill="black" font-family="Arial, sans-serif" font-size="10" font-weight="bold">C</text>
    </svg>`,
    description: "Mediterranean Shipping Company is the world's second largest shipping line",
    website: "https://www.msc.com",
    founded: 1970,
    headquarters: "Geneva, Switzerland",
    fleetSize: 600
  },
  {
    name: "CMA CGM",
    code: "CMA_CGM",
    color: "#E60012",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#E60012"/>
      <text x="60" y="18" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="10" font-weight="bold">CMA CGM</text>
      <text x="60" y="30" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8">THE FRENCH LINE</text>
      <polygon points="10,10 15,20 10,30 5,20" fill="white"/>
      <polygon points="110,10 115,20 110,30 105,20" fill="white"/>
    </svg>`,
    description: "CMA CGM Group is a leading worldwide shipping group",
    website: "https://www.cma-cgm.com",
    founded: 1978,
    headquarters: "Marseille, France",
    fleetSize: 500
  },
  {
    name: "COSCO",
    code: "COSCO",
    color: "#003DA5",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#003DA5"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">COSCO</text>
      <circle cx="20" cy="20" r="6" fill="white"/>
      <circle cx="100" cy="20" r="6" fill="white"/>
      <path d="M10,10 L30,10 L30,30 L10,30 Z" fill="none" stroke="white" stroke-width="2"/>
      <path d="M90,10 L110,10 L110,30 L90,30 Z" fill="none" stroke="white" stroke-width="2"/>
    </svg>`,
    description: "China COSCO Shipping is one of the largest shipping companies globally",
    website: "https://www.coscoshipping.com",
    founded: 2016,
    headquarters: "Shanghai, China",
    fleetSize: 400
  },
  {
    name: "Hapag-Lloyd",
    code: "HAPAG_LLOYD",
    color: "#E2001A",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#E2001A"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">HAPAG-LLOYD</text>
      <rect x="5" y="5" width="10" height="30" fill="white"/>
      <rect x="105" y="5" width="10" height="30" fill="white"/>
      <circle cx="15" cy="20" r="4" fill="#E2001A"/>
      <circle cx="105" cy="20" r="4" fill="#E2001A"/>
    </svg>`,
    description: "Hapag-Lloyd is a leading global liner shipping company",
    website: "https://www.hapag-lloyd.com",
    founded: 1970,
    headquarters: "Hamburg, Germany",
    fleetSize: 250
  },
  {
    name: "ONE",
    code: "ONE",
    color: "#00539F",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#00539F"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">ONE</text>
      <text x="60" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8">OCEAN NETWORK EXPRESS</text>
      <ellipse cx="15" cy="20" rx="8" ry="12" fill="white"/>
          <ellipse cx="105" cy="20" rx="8" ry="12" fill="white"/>
        </svg>`,
    description: "Ocean Network Express is a major Japanese container shipping company",
    website: "https://www.one-line.com",
    founded: 2017,
    headquarters: "Tokyo, Japan",
    fleetSize: 200
  },
  {
    name: "Evergreen",
    code: "EVERGREEN",
    color: "#00873C",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#00873C"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">EVERGREEN</text>
      <path d="M10,10 L20,20 L10,30 L5,20 Z" fill="white"/>
      <path d="M110,10 L100,20 L110,30 L115,20 Z" fill="white"/>
    </svg>`,
    description: "Evergreen Marine is a Taiwanese container transportation and shipping company",
    website: "https://www.evergreen-marine.com",
    founded: 1968,
    headquarters: "Taipei, Taiwan",
    fleetSize: 150
  },
  {
    name: "Yang Ming",
    code: "YANG_MING",
    color: "#C60C30",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#C60C30"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">YANG MING</text>
      <circle cx="15" cy="20" r="6" fill="white"/>
      <circle cx="105" cy="20" r="6" fill="white"/>
      <text x="15" y="22" text-anchor="middle" fill="#C60C30" font-size="8" font-weight="bold">Y</text>
      <text x="105" y="22" text-anchor="middle" fill="#C60C30" font-size="8" font-weight="bold">M</text>
    </svg>`,
    description: "Yang Ming Marine Transport Corporation is a Taiwanese ocean shipping company",
    website: "https://www.yml.com.tw",
    founded: 1972,
    headquarters: "Keelung, Taiwan",
    fleetSize: 100
  },
  {
    name: "ZIM",
    code: "ZIM",
    color: "#FF6600",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#FF6600"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">ZIM</text>
      <rect x="10" y="10" width="15" height="20" fill="white"/>
      <rect x="95" y="10" width="15" height="20" fill="white"/>
      <text x="17.5" y="22" text-anchor="middle" fill="#FF6600" font-size="10" font-weight="bold">Z</text>
      <text x="102.5" y="22" text-anchor="middle" fill="#FF6600" font-size="10" font-weight="bold">M</text>
    </svg>`,
    description: "ZIM Integrated Shipping Services is an Israeli international cargo shipping company",
    website: "https://www.zim.com",
    founded: 1945,
    headquarters: "Haifa, Israel",
    fleetSize: 80
  },
  {
    name: "PIL",
    code: "PIL",
    color: "#0033A0",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#0033A0"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">PIL</text>
      <text x="60" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8">PACIFIC INT'L LINE</text>
      <polygon points="5,10 15,20 5,30" fill="white"/>
      <polygon points="115,10 105,20 115,30" fill="white"/>
    </svg>`,
    description: "Pacific International Lines is a Singapore-based shipping company",
    website: "https://www.pilship.com",
    founded: 1967,
    headquarters: "Singapore",
    fleetSize: 120
  },
  {
    name: "Wan Hai",
    code: "WAN_HAI",
    color: "#0066CC",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#0066CC"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">WAN HAI</text>
      <rect x="8" y="8" width="12" height="24" fill="white"/>
      <rect x="100" y="8" width="12" height="24" fill="white"/>
      <text x="14" y="22" text-anchor="middle" fill="#0066CC" font-size="8" font-weight="bold">W</text>
      <text x="106" y="22" text-anchor="middle" fill="#0066CC" font-size="8" font-weight="bold">H</text>
    </svg>`,
    description: "Wan Hai Lines is a Taiwanese container shipping company",
    website: "https://www.wanhai.com.tw",
    founded: 1965,
    headquarters: "Taipei, Taiwan",
    fleetSize: 90
  },
  {
    name: "OOCL",
    code: "OOCL",
    color: "#FF6600",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#FF6600"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">OOCL</text>
      <circle cx="12" cy="20" r="7" fill="white"/>
      <circle cx="108" cy="20" r="7" fill="white"/>
      <text x="12" y="22" text-anchor="middle" fill="#FF6600" font-size="8" font-weight="bold">O</text>
      <text x="108" y="22" text-anchor="middle" fill="#FF6600" font-size="8" font-weight="bold">L</text>
    </svg>`,
    description: "Orient Overseas Container Line is a Hong Kong-based container shipping company",
    website: "https://www.oocl.com",
    founded: 1969,
    headquarters: "Hong Kong",
    fleetSize: 60
  },
  {
    name: "HMM",
    code: "HMM",
    color: "#C60C30",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#C60C30"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">HMM</text>
      <text x="60" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8">HYUNDAI MERCHANT MARINE</text>
      <path d="M8,8 L16,20 L8,32 L4,20 Z" fill="white"/>
      <path d="M112,8 L104,20 L112,32 L116,20 Z" fill="white"/>
    </svg>`,
    description: "Hyundai Merchant Marine is a South Korean container transportation company",
    website: "https://www.hmm21.com",
    founded: 1976,
    headquarters: "Seoul, South Korea",
    fleetSize: 70
  },
  {
    name: "SM Line",
    code: "SM_LINE",
    color: "#0066B3",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#0066B3"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">SM LINE</text>
      <rect x="6" y="6" width="16" height="28" fill="white"/>
      <rect x="98" y="6" width="16" height="28" fill="white"/>
      <text x="14" y="22" text-anchor="middle" fill="#0066B3" font-size="10" font-weight="bold">SM</text>
      <text x="106" y="22" text-anchor="middle" fill="#0066B3" font-size="10" font-weight="bold">LN</text>
    </svg>`,
    description: "SM Line Corporation is a South Korean container shipping company",
    website: "https://www.smlines.com",
    founded: 2016,
    headquarters: "Seoul, South Korea",
    fleetSize: 50
  },
  {
    name: "KMTC",
    code: "KMTC",
    color: "#0033A0",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#0033A0"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">KMTC</text>
      <text x="60" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="8">KOREA MARINE TRANSPORT</text>
      <polygon points="10,10 20,20 10,30" fill="white"/>
      <polygon points="110,10 100,20 110,30" fill="white"/>
    </svg>`,
    description: "Korea Marine Transport Co. is a South Korean shipping company",
    website: "https://www.kmtc.co.kr",
    founded: 1954,
    headquarters: "Busan, South Korea",
    fleetSize: 60
  },
  {
    name: "Sinokor",
    code: "SINOKOR",
    color: "#FF0000",
    secondaryColor: "#FFFFFF",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#FF0000"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">SINOKOR</text>
      <circle cx="15" cy="20" r="6" fill="white"/>
      <circle cx="105" cy="20" r="6" fill="white"/>
      <text x="15" y="22" text-anchor="middle" fill="#FF0000" font-size="8" font-weight="bold">S</text>
      <text x="105" y="22" text-anchor="middle" fill="#FF0000" font-size="8" font-weight="bold">K</text>
    </svg>`,
    description: "Sinokor Merchant Marine is a South Korean shipping company",
    website: "https://www.sinokor.co.kr",
    founded: 1989,
    headquarters: "Seoul, South Korea",
    fleetSize: 40
  }
];

// Helper functions for logo management
export const getCarrierLogo = (carrierCode: string): CarrierLogo | undefined => {
  return carrierLogos.find(logo => 
    logo.code.toLowerCase() === carrierCode.toLowerCase() ||
    logo.name.toLowerCase() === carrierCode.toLowerCase()
  );
};

export const getCarrierLogoByName = (carrierName: string): CarrierLogo | undefined => {
  return carrierLogos.find(logo => 
    logo.name.toLowerCase().includes(carrierName.toLowerCase()) ||
    carrierName.toLowerCase().includes(logo.name.toLowerCase())
  );
};

export const getAllCarrierLogos = (): CarrierLogo[] => {
  return [...carrierLogos];
};

export const getMajorCarriers = (): CarrierLogo[] => {
  return carrierLogos.filter(logo => logo.fleetSize >= 100);
};

export const getRegionalCarriers = (): CarrierLogo[] => {
  return carrierLogos.filter(logo => logo.fleetSize < 100);
};

export const searchCarrierLogos = (query: string): CarrierLogo[] => {
  const lowerQuery = query.toLowerCase();
  return carrierLogos.filter(logo => 
    logo.name.toLowerCase().includes(lowerQuery) ||
    logo.description.toLowerCase().includes(lowerQuery) ||
    logo.headquarters.toLowerCase().includes(lowerQuery)
  );
};

// Bloomberg-style professional logo display
export const getProfessionalLogoStyle = (carrier: CarrierLogo) => {
  return {
    backgroundColor: carrier.color,
    color: carrier.secondaryColor || '#FFFFFF',
    borderRadius: '4px',
    padding: '8px 12px',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'bold',
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    border: `1px solid ${carrier.color}80`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '60px',
    height: '35px'
  };
};

// Default logo for unknown carriers
export const getDefaultLogo = (): CarrierLogo => ({
  name: "Unknown Carrier",
  code: "UNKNOWN",
  color: "#666666",
  secondaryColor: "#FFFFFF",
  svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="40" fill="#666666"/>
    <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="10" font-weight="bold">CARRIER</text>
    <circle cx="15" cy="20" r="4" fill="white"/>
    <circle cx="105" cy="20" r="4" fill="white"/>
  </svg>`,
  description: "Default logo for unknown or unlisted carriers",
  website: "#",
  founded: 2024,
  headquarters: "Unknown",
  fleetSize: 0
});