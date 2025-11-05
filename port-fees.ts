/**
 * Vcanship Port Fees & Demurrage Calculator
 * 
 * CRITICAL FEATURE: Shows ALL costs upfront to prevent sticker shock
 * Problem: Users book FCL for $2,800, then get hit with $500 surprise port fees
 * Solution: Display complete cost breakdown BEFORE booking
 * 
 * Features:
 * - Port fees breakdown by major ports
 * - Demurrage calculator (free days + daily rates)
 * - Terminal handling charges
 * - Documentation fees
 * - Real-time warnings (port congestion, strikes, etc.)
 * 
 * Phase 2B Implementation - Nov 2025
 */

import { showToast } from './ui';
import type { DemurrageCalculatorRequest, DemurrageCalculatorResponse } from './carrier-rates-api';
import { calculateDemurrage } from './carrier-rates-api';

/**
 * Major world ports with typical fee structures
 * Based on industry averages (2024-2025)
 */
export const PORT_FEE_DATABASE = {
    // US West Coast
    'USLAX': {
        name: 'Los Angeles',
        country: 'USA',
        portCharges: 180,
        terminalHandling: 220,
        documentation: 75,
        freeDays: 5,
        demurrageRate: 85,
        congestionLevel: 'medium',
        notes: 'Busiest US port - expect delays during peak season'
    },
    'USLGB': {
        name: 'Long Beach',
        country: 'USA',
        portCharges: 175,
        terminalHandling: 215,
        documentation: 70,
        freeDays: 5,
        demurrageRate: 85,
        congestionLevel: 'medium',
        notes: 'Adjacent to LA - similar fees and congestion'
    },
    'USOAK': {
        name: 'Oakland',
        country: 'USA',
        portCharges: 160,
        terminalHandling: 200,
        documentation: 65,
        freeDays: 5,
        demurrageRate: 75,
        congestionLevel: 'low',
        notes: 'Less congested alternative to LA/LB'
    },
    'USSEA': {
        name: 'Seattle',
        country: 'USA',
        portCharges: 150,
        terminalHandling: 190,
        documentation: 60,
        freeDays: 5,
        demurrageRate: 75,
        congestionLevel: 'low',
        notes: 'Gateway to Pacific Northwest'
    },
    
    // US East Coast
    'USNYC': {
        name: 'New York/New Jersey',
        country: 'USA',
        portCharges: 195,
        terminalHandling: 240,
        documentation: 80,
        freeDays: 5,
        demurrageRate: 95,
        congestionLevel: 'high',
        notes: 'Largest East Coast port - higher fees reflect premium location'
    },
    'USSAV': {
        name: 'Savannah',
        country: 'USA',
        portCharges: 165,
        terminalHandling: 205,
        documentation: 70,
        freeDays: 7,
        demurrageRate: 75,
        congestionLevel: 'medium',
        notes: 'Growing East Coast hub - competitive pricing'
    },
    'USMIA': {
        name: 'Miami',
        country: 'USA',
        portCharges: 170,
        terminalHandling: 210,
        documentation: 75,
        freeDays: 5,
        demurrageRate: 80,
        congestionLevel: 'low',
        notes: 'Caribbean and Latin America gateway'
    },
    
    // China Major Ports
    'CNSHA': {
        name: 'Shanghai',
        country: 'China',
        portCharges: 120,
        terminalHandling: 150,
        documentation: 40,
        freeDays: 7,
        demurrageRate: 50,
        congestionLevel: 'medium',
        notes: 'World\'s busiest container port - efficient operations'
    },
    'CNNGB': {
        name: 'Ningbo',
        country: 'China',
        portCharges: 110,
        terminalHandling: 140,
        documentation: 35,
        freeDays: 7,
        demurrageRate: 45,
        congestionLevel: 'low',
        notes: 'Major manufacturing hub - lower fees than Shanghai'
    },
    'CNYTN': {
        name: 'Yantian (Shenzhen)',
        country: 'China',
        portCharges: 115,
        terminalHandling: 145,
        documentation: 38,
        freeDays: 7,
        demurrageRate: 48,
        congestionLevel: 'medium',
        notes: 'Southern China electronics and manufacturing gateway'
    },
    'CNQIN': {
        name: 'Qingdao',
        country: 'China',
        portCharges: 105,
        terminalHandling: 135,
        documentation: 35,
        freeDays: 7,
        demurrageRate: 45,
        congestionLevel: 'low',
        notes: 'Northern China port - competitive rates'
    },
    
    // Europe
    'NLRTM': {
        name: 'Rotterdam',
        country: 'Netherlands',
        portCharges: 210,
        terminalHandling: 260,
        documentation: 85,
        freeDays: 4,
        demurrageRate: 95,
        congestionLevel: 'medium',
        notes: 'Europe\'s largest port - premium pricing'
    },
    'DEHAM': {
        name: 'Hamburg',
        country: 'Germany',
        portCharges: 195,
        terminalHandling: 245,
        documentation: 80,
        freeDays: 5,
        demurrageRate: 90,
        congestionLevel: 'medium',
        notes: 'Major German gateway - efficient operations'
    },
    'GBLON': {
        name: 'London Gateway',
        country: 'UK',
        portCharges: 220,
        terminalHandling: 270,
        documentation: 90,
        freeDays: 4,
        demurrageRate: 100,
        congestionLevel: 'low',
        notes: 'Modern deep-sea port - Brexit may affect customs'
    },
    
    // Asia-Pacific
    'SGSIN': {
        name: 'Singapore',
        country: 'Singapore',
        portCharges: 140,
        terminalHandling: 175,
        documentation: 50,
        freeDays: 5,
        demurrageRate: 65,
        congestionLevel: 'low',
        notes: 'World\'s busiest transshipment hub - highly efficient'
    },
    'HKHKG': {
        name: 'Hong Kong',
        country: 'Hong Kong',
        portCharges: 160,
        terminalHandling: 195,
        documentation: 60,
        freeDays: 5,
        demurrageRate: 75,
        congestionLevel: 'medium',
        notes: 'Premium Asian hub - higher costs reflect location'
    },
    'MYPKG': {
        name: 'Port Klang',
        country: 'Malaysia',
        portCharges: 125,
        terminalHandling: 155,
        documentation: 45,
        freeDays: 7,
        demurrageRate: 55,
        congestionLevel: 'low',
        notes: 'Southeast Asia hub - competitive alternative to Singapore'
    },
    'KRPUS': {
        name: 'Busan',
        country: 'South Korea',
        portCharges: 135,
        terminalHandling: 165,
        documentation: 50,
        freeDays: 5,
        demurrageRate: 60,
        congestionLevel: 'low',
        notes: 'Northeast Asia transshipment hub'
    },
    
    // Middle East
    'AEJEA': {
        name: 'Jebel Ali (Dubai)',
        country: 'UAE',
        portCharges: 155,
        terminalHandling: 190,
        documentation: 65,
        freeDays: 5,
        demurrageRate: 70,
        congestionLevel: 'low',
        notes: 'Middle East mega-hub - efficient operations'
    }
};

/**
 * Container type multipliers for fees
 */
const CONTAINER_MULTIPLIERS = {
    '20GP': 1.0,    // Standard 20ft
    '20HC': 1.0,    // High cube 20ft
    '40GP': 1.6,    // Standard 40ft
    '40HC': 1.8,    // High cube 40ft (most common)
    '45HC': 2.0,    // 45ft high cube
    '20RF': 1.3,    // 20ft reefer (refrigerated)
    '40RF': 2.0,    // 40ft reefer
    '20OT': 1.2,    // 20ft open top
    '40OT': 1.8,    // 40ft open top
    '20FR': 1.2,    // 20ft flat rack
    '40FR': 1.8     // 40ft flat rack
};

/**
 * Calculate port fees for a specific port and container type
 */
export function calculatePortFees(
    portCode: string,
    containerType: string = '40HC',
    quantity: number = 1
): {
    success: boolean;
    port: { code: string; name: string; country: string };
    fees: {
        portCharges: number;
        terminalHandling: number;
        documentation: number;
        total: number;
        perContainer: number;
    };
    demurrage: {
        freeDays: number;
        ratePerDay: number;
        ratePerDayTotal: number;
    };
    congestion: {
        level: 'low' | 'medium' | 'high';
        warning?: string;
    };
    notes: string;
} {
    const portData = PORT_FEE_DATABASE[portCode as keyof typeof PORT_FEE_DATABASE];
    
    if (!portData) {
        // Return estimated fees for unknown ports
        return {
            success: false,
            port: { code: portCode, name: 'Unknown Port', country: 'Unknown' },
            fees: {
                portCharges: 150,
                terminalHandling: 180,
                documentation: 60,
                total: 390,
                perContainer: 390
            },
            demurrage: {
                freeDays: 5,
                ratePerDay: 70,
                ratePerDayTotal: 70
            },
            congestion: {
                level: 'medium',
                warning: 'Port fees are estimated - actual fees may vary'
            },
            notes: 'Estimated fees for port not in database. Contact port authority for exact rates.'
        };
    }
    
    // Get container multiplier
    const multiplier = CONTAINER_MULTIPLIERS[containerType as keyof typeof CONTAINER_MULTIPLIERS] || 1.8;
    
    // Calculate fees per container
    const portChargesPerContainer = Math.round(portData.portCharges * multiplier);
    const terminalHandlingPerContainer = Math.round(portData.terminalHandling * multiplier);
    const documentationPerContainer = Math.round(portData.documentation * multiplier);
    const totalPerContainer = portChargesPerContainer + terminalHandlingPerContainer + documentationPerContainer;
    
    // Calculate total for all containers
    const totalPortCharges = portChargesPerContainer * quantity;
    const totalTerminalHandling = terminalHandlingPerContainer * quantity;
    const totalDocumentation = documentationPerContainer * quantity;
    const grandTotal = totalPerContainer * quantity;
    
    // Demurrage rates (per container per day)
    const demurragePerDay = Math.round(portData.demurrageRate * multiplier);
    const demurrageTotalPerDay = demurragePerDay * quantity;
    
    // Congestion warning
    const congestionWarning = portData.congestionLevel === 'high' 
        ? `⚠️ High congestion at ${portData.name} - pickup delays likely`
        : portData.congestionLevel === 'medium'
        ? `Port experiencing moderate traffic`
        : undefined;
    
    return {
        success: true,
        port: {
            code: portCode,
            name: portData.name,
            country: portData.country
        },
        fees: {
            portCharges: totalPortCharges,
            terminalHandling: totalTerminalHandling,
            documentation: totalDocumentation,
            total: grandTotal,
            perContainer: totalPerContainer
        },
        demurrage: {
            freeDays: portData.freeDays,
            ratePerDay: demurragePerDay,
            ratePerDayTotal: demurrageTotalPerDay
        },
        congestion: {
            level: portData.congestionLevel,
            warning: congestionWarning
        },
        notes: portData.notes
    };
}

/**
 * Calculate projected demurrage costs based on pickup date
 */
export function calculateDemurrageCost(
    freeDays: number,
    ratePerDay: number,
    arrivalDate: Date,
    pickupDate: Date
): {
    daysInPort: number;
    freeDaysUsed: number;
    chargeableDays: number;
    totalCost: number;
    warning?: string;
} {
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysInPort = Math.ceil((pickupDate.getTime() - arrivalDate.getTime()) / msPerDay);
    
    if (daysInPort < 0) {
        return {
            daysInPort: 0,
            freeDaysUsed: 0,
            chargeableDays: 0,
            totalCost: 0,
            warning: 'Pickup date is before arrival date'
        };
    }
    
    const freeDaysUsed = Math.min(daysInPort, freeDays);
    const chargeableDays = Math.max(0, daysInPort - freeDays);
    const totalCost = chargeableDays * ratePerDay;
    
    let warning: string | undefined;
    if (chargeableDays > 0) {
        warning = `💰 ${chargeableDays} days of demurrage charges = $${totalCost}`;
    } else if (daysInPort === freeDays) {
        warning = `⚠️ Last free day! Pickup tomorrow to avoid charges.`;
    }
    
    return {
        daysInPort,
        freeDaysUsed,
        chargeableDays,
        totalCost,
        warning
    };
}

/**
 * Get comprehensive cost breakdown for a shipment
 */
export function getCompleteCostBreakdown(
    oceanFreight: number,
    originPortCode: string,
    destinationPortCode: string,
    containerType: string = '40HC',
    quantity: number = 1,
    estimatedArrival?: Date,
    estimatedPickup?: Date
): {
    oceanFreight: number;
    originPortFees: ReturnType<typeof calculatePortFees>;
    destinationPortFees: ReturnType<typeof calculatePortFees>;
    demurrageCost?: ReturnType<typeof calculateDemurrageCost>;
    totalMinimum: number;
    totalWithDemurrage?: number;
    savings?: {
        pickupBy: Date;
        saveAmount: number;
    };
} {
    const originFees = calculatePortFees(originPortCode, containerType, quantity);
    const destFees = calculatePortFees(destinationPortCode, containerType, quantity);
    
    const totalMinimum = oceanFreight + originFees.fees.total + destFees.fees.total;
    
    let demurrageCost: ReturnType<typeof calculateDemurrageCost> | undefined;
    let totalWithDemurrage: number | undefined;
    let savings: { pickupBy: Date; saveAmount: number } | undefined;
    
    if (estimatedArrival && estimatedPickup) {
        demurrageCost = calculateDemurrageCost(
            destFees.demurrage.freeDays,
            destFees.demurrage.ratePerDayTotal,
            estimatedArrival,
            estimatedPickup
        );
        
        totalWithDemurrage = totalMinimum + demurrageCost.totalCost;
        
        // Calculate savings if picked up within free days
        if (demurrageCost.chargeableDays > 0) {
            const lastFreeDay = new Date(estimatedArrival);
            lastFreeDay.setDate(lastFreeDay.getDate() + destFees.demurrage.freeDays);
            
            savings = {
                pickupBy: lastFreeDay,
                saveAmount: demurrageCost.totalCost
            };
        }
    }
    
    return {
        oceanFreight,
        originPortFees: originFees,
        destinationPortFees: destFees,
        demurrageCost,
        totalMinimum,
        totalWithDemurrage,
        savings
    };
}

/**
 * Display port fees information as a toast notification
 */
export function showPortFeesInfo(portCode: string, containerType: string = '40HC'): void {
    const fees = calculatePortFees(portCode, containerType, 1);
    
    if (fees.success) {
        showToast(
            `💰 ${fees.port.name} Port Fees: $${fees.fees.total} (${fees.demurrage.freeDays} free days, then $${fees.demurrage.ratePerDay}/day)`,
            'info',
            8000
        );
    } else {
        showToast(
            `💰 Estimated Port Fees: $${fees.fees.total} (rates vary by port)`,
            'info',
            5000
        );
    }
}

/**
 * Format cost breakdown for display in quote results
 */
export function formatCostBreakdown(breakdown: ReturnType<typeof getCompleteCostBreakdown>): string {
    let html = `
        <div class="cost-breakdown">
            <h4>💰 Complete Cost Breakdown</h4>
            
            <div class="cost-section">
                <div class="cost-line">
                    <span>Ocean Freight</span>
                    <span class="cost-amount">$${breakdown.oceanFreight.toLocaleString()}</span>
                </div>
            </div>
            
            <div class="cost-section">
                <h5>📍 ${breakdown.originPortFees.port.name} (Origin)</h5>
                <div class="cost-line sub">
                    <span>Port Charges</span>
                    <span>$${breakdown.originPortFees.fees.portCharges}</span>
                </div>
                <div class="cost-line sub">
                    <span>Terminal Handling</span>
                    <span>$${breakdown.originPortFees.fees.terminalHandling}</span>
                </div>
                <div class="cost-line sub">
                    <span>Documentation</span>
                    <span>$${breakdown.originPortFees.fees.documentation}</span>
                </div>
            </div>
            
            <div class="cost-section">
                <h5>📍 ${breakdown.destinationPortFees.port.name} (Destination)</h5>
                <div class="cost-line sub">
                    <span>Port Charges</span>
                    <span>$${breakdown.destinationPortFees.fees.portCharges}</span>
                </div>
                <div class="cost-line sub">
                    <span>Terminal Handling</span>
                    <span>$${breakdown.destinationPortFees.fees.terminalHandling}</span>
                </div>
                <div class="cost-line sub">
                    <span>Documentation</span>
                    <span>$${breakdown.destinationPortFees.fees.documentation}</span>
                </div>
                <div class="cost-line highlight">
                    <span>⏰ Free Storage: ${breakdown.destinationPortFees.demurrage.freeDays} days</span>
                    <span>Then $${breakdown.destinationPortFees.demurrage.ratePerDayTotal}/day</span>
                </div>
            </div>
    `;
    
    if (breakdown.demurrageCost && breakdown.demurrageCost.totalCost > 0) {
        html += `
            <div class="cost-section warning">
                <h5>⚠️ Demurrage Charges</h5>
                <div class="cost-line sub">
                    <span>${breakdown.demurrageCost.chargeableDays} days beyond free period</span>
                    <span class="cost-amount">$${breakdown.demurrageCost.totalCost.toLocaleString()}</span>
                </div>
            </div>
        `;
    }
    
    html += `
            <div class="cost-total">
                <div class="cost-line total">
                    <span><strong>Total Minimum Cost</strong></span>
                    <span class="cost-amount"><strong>$${breakdown.totalMinimum.toLocaleString()}</strong></span>
                </div>
    `;
    
    if (breakdown.totalWithDemurrage && breakdown.totalWithDemurrage > breakdown.totalMinimum) {
        html += `
                <div class="cost-line total-with-demurrage">
                    <span><strong>Total With Demurrage</strong></span>
                    <span class="cost-amount warning"><strong>$${breakdown.totalWithDemurrage.toLocaleString()}</strong></span>
                </div>
        `;
    }
    
    if (breakdown.savings) {
        const pickupDate = breakdown.savings.pickupBy.toLocaleDateString();
        html += `
                <div class="savings-tip">
                    💡 <strong>Save $${breakdown.savings.saveAmount}!</strong> Pick up by ${pickupDate} to avoid demurrage.
                </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}
