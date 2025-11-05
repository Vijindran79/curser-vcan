/**
 * Vcanship Container Tracking Dashboard
 * 
 * POST-BOOKING FEATURE: Real-time container location tracking
 * Value: Keeps users engaged after booking, reduces support inquiries
 * 
 * Features:
 * - Interactive world map showing container location
 * - Real-time vessel tracking (if container is at sea)
 * - Port status updates (loading, discharged, ready for pickup)
 * - ETA calculations and notifications
 * - Journey timeline with all stops
 * - Document status (BOL, customs clearance, delivery order)
 * 
 * Phase 2C Implementation - Nov 2025
 */

import { State, setState } from './state';
import { showToast } from './ui';
import type { ContainerTrackingRequest, ContainerTrackingResponse } from './carrier-rates-api';

/**
 * Container tracking interface
 */
export interface TrackedContainer {
    containerNumber: string;
    billOfLading: string;
    carrierCode: string;
    carrierName: string;
    status: 'Empty' | 'Loaded' | 'In Transit' | 'Discharged' | 'At Terminal' | 'Delivered';
    currentLocation: {
        lat: number;
        lon: number;
        name: string;
        type: 'port' | 'vessel' | 'terminal' | 'destination';
        arrivalDate?: string;
    };
    vessel?: {
        name: string;
        imo: string;
        mmsi: string;
        flag: string;
        currentSpeed?: number;
        currentHeading?: number;
    };
    journey: Array<{
        location: string;
        date: string;
        status: string;
        description: string;
    }>;
    estimatedArrival: {
        port: string;
        date: string;
        confidence: 'High' | 'Medium' | 'Low';
    };
    documents: {
        billOfLading: 'issued' | 'pending' | 'not-available';
        customsClearance: 'cleared' | 'in-progress' | 'pending' | 'issues';
        deliveryOrder: 'ready' | 'pending' | 'not-available';
    };
    alerts: Array<{
        type: 'delay' | 'arrival' | 'customs' | 'demurrage';
        message: string;
        timestamp: string;
    }>;
}

/**
 * Demo container data for testing (before real API integration)
 */
const DEMO_CONTAINERS: Record<string, TrackedContainer> = {
    'MSCU1234567': {
        containerNumber: 'MSCU1234567',
        billOfLading: 'MSC-SHA-LAX-001234',
        carrierCode: 'MSCU',
        carrierName: 'MSC Mediterranean Shipping',
        status: 'In Transit',
        currentLocation: {
            lat: 35.6762,
            lon: -140.1234,
            name: 'Pacific Ocean (Mid-route)',
            type: 'vessel',
            arrivalDate: '2025-11-20'
        },
        vessel: {
            name: 'MSC GULSUN',
            imo: '9811000',
            mmsi: '355906000',
            flag: 'Liberia',
            currentSpeed: 18.5,
            currentHeading: 85
        },
        journey: [
            {
                location: 'Shanghai, China (CNSHA)',
                date: '2025-11-01',
                status: 'completed',
                description: 'Container loaded onto vessel'
            },
            {
                location: 'Ningbo, China (CNNGB)',
                date: '2025-11-03',
                status: 'completed',
                description: 'Transshipment stop'
            },
            {
                location: 'Pacific Ocean',
                date: '2025-11-15',
                status: 'in-progress',
                description: 'In transit to Los Angeles'
            },
            {
                location: 'Los Angeles, USA (USLAX)',
                date: '2025-11-20',
                status: 'upcoming',
                description: 'Expected arrival at destination port'
            }
        ],
        estimatedArrival: {
            port: 'Los Angeles, USA (USLAX)',
            date: '2025-11-20T08:00:00Z',
            confidence: 'High'
        },
        documents: {
            billOfLading: 'issued',
            customsClearance: 'in-progress',
            deliveryOrder: 'pending'
        },
        alerts: [
            {
                type: 'arrival',
                message: 'Container expected to arrive in Los Angeles on Nov 20, 2025',
                timestamp: '2025-11-15T10:00:00Z'
            }
        ]
    },
    'MAEU7654321': {
        containerNumber: 'MAEU7654321',
        billOfLading: 'MAEU-NYC-SHA-005678',
        carrierCode: 'MAEU',
        carrierName: 'Maersk Line',
        status: 'At Terminal',
        currentLocation: {
            lat: 40.6892,
            lon: -74.0445,
            name: 'APM Terminal, New York/New Jersey',
            type: 'terminal',
            arrivalDate: '2025-11-10'
        },
        journey: [
            {
                location: 'New York, USA (USNYC)',
                date: '2025-10-20',
                status: 'completed',
                description: 'Container loaded at origin'
            },
            {
                location: 'Atlantic Ocean',
                date: '2025-10-30',
                status: 'completed',
                description: 'Crossed Atlantic'
            },
            {
                location: 'Rotterdam, Netherlands (NLRTM)',
                date: '2025-11-05',
                status: 'completed',
                description: 'Transshipment at European hub'
            },
            {
                location: 'Shanghai, China (CNSHA)',
                date: '2025-11-10',
                status: 'completed',
                description: 'Arrived at destination port'
            }
        ],
        estimatedArrival: {
            port: 'Shanghai, China (CNSHA)',
            date: '2025-11-10T14:30:00Z',
            confidence: 'High'
        },
        documents: {
            billOfLading: 'issued',
            customsClearance: 'cleared',
            deliveryOrder: 'ready'
        },
        alerts: [
            {
                type: 'demurrage',
                message: '⚠️ Free storage ends in 2 days! Pick up by Nov 17 to avoid demurrage charges ($95/day)',
                timestamp: '2025-11-15T09:00:00Z'
            },
            {
                type: 'arrival',
                message: 'Container discharged and ready for pickup',
                timestamp: '2025-11-10T16:00:00Z'
            }
        ]
    }
};

/**
 * Track container by number, BOL, or booking reference
 */
export async function trackContainer(
    identifier: string,
    identifierType: 'container' | 'bol' | 'booking' = 'container'
): Promise<TrackedContainer | null> {
    try {
        // Check if using demo data (for development)
        if (DEMO_CONTAINERS[identifier]) {
            showToast(`📦 Tracking: ${identifier}`, 'info', 3000);
            return DEMO_CONTAINERS[identifier];
        }
        
        // TODO: Real API integration (Phase 2C)
        // const request: ContainerTrackingRequest = {
        //     containerNumber: identifierType === 'container' ? identifier : undefined,
        //     billOfLading: identifierType === 'bol' ? identifier : undefined
        // };
        // const response = await callCarrierRatesAPI<ContainerTrackingResponse>('/container-tracking', request);
        
        showToast(`Container ${identifier} not found in tracking system`, 'error', 5000);
        return null;
    } catch (error) {
        console.error('Container tracking error:', error);
        showToast('Could not retrieve tracking information', 'error');
        return null;
    }
}

/**
 * Show tracking dashboard modal
 */
export async function showTrackingDashboard(containerData?: TrackedContainer): void {
    const container = containerData || State.currentTrackedContainer;
    
    if (!container) {
        showToast('No container selected for tracking', 'error');
        return;
    }
    
    // Store in state for reference
    setState({ currentTrackedContainer: container });
    
    // Create modal overlay
    const modalHTML = `
        <div id="tracking-dashboard-modal" class="modal-overlay" style="display: flex;">
            <div class="modal-content tracking-dashboard" style="max-width: 1200px; width: 95%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 1.5rem; border-radius: 12px 12px 0 0;">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 0.75rem;">
                        <i class="fa-solid fa-map-location-dot"></i>
                        Container Tracking
                    </h2>
                    <p style="margin: 0.5rem 0 0; opacity: 0.95; font-size: 0.9375rem;">
                        Real-time location and status updates
                    </p>
                    <button class="modal-close-btn" onclick="document.getElementById('tracking-dashboard-modal').remove();" style="position: absolute; top: 1rem; right: 1rem; background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.25rem;">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body" style="padding: 1.5rem;">
                    ${renderTrackingHeader(container)}
                    ${renderCurrentStatus(container)}
                    ${renderTrackingMap(container)}
                    ${renderJourneyTimeline(container)}
                    ${renderDocumentStatus(container)}
                    ${renderAlerts(container)}
                </div>
            </div>
        </div>
    `;
    
    // Add to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize map (if Leaflet or similar library available)
    // setTimeout(() => initializeTrackingMap(container), 100);
}

/**
 * Render tracking header with container details
 */
function renderTrackingHeader(container: TrackedContainer): string {
    const statusColors: Record<typeof container.status, string> = {
        'Empty': '#9ca3af',
        'Loaded': '#3b82f6',
        'In Transit': '#10b981',
        'Discharged': '#f59e0b',
        'At Terminal': '#f59e0b',
        'Delivered': '#22c55e'
    };
    
    const statusColor = statusColors[container.status];
    
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div style="padding: 1rem; background: var(--card-bg); border-radius: 8px; border-left: 4px solid ${statusColor};">
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Container Number</div>
                <div style="font-size: 1.125rem; font-weight: 600; color: var(--text-color); font-family: monospace;">${container.containerNumber}</div>
            </div>
            
            <div style="padding: 1rem; background: var(--card-bg); border-radius: 8px; border-left: 4px solid ${statusColor};">
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Bill of Lading</div>
                <div style="font-size: 1.125rem; font-weight: 600; color: var(--text-color); font-family: monospace;">${container.billOfLading}</div>
            </div>
            
            <div style="padding: 1rem; background: var(--card-bg); border-radius: 8px; border-left: 4px solid ${statusColor};">
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Carrier</div>
                <div style="font-size: 1.125rem; font-weight: 600; color: var(--text-color);">${container.carrierName}</div>
            </div>
            
            <div style="padding: 1rem; background: ${statusColor}; color: white; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <div style="font-size: 0.875rem; opacity: 0.95; margin-bottom: 0.25rem;">Status</div>
                <div style="font-size: 1.25rem; font-weight: 700;">${container.status}</div>
            </div>
        </div>
    `;
}

/**
 * Render current location and vessel info
 */
function renderCurrentStatus(container: TrackedContainer): string {
    const location = container.currentLocation;
    const vessel = container.vessel;
    
    let locationIcon = '';
    switch (location.type) {
        case 'port':
            locationIcon = 'fa-anchor';
            break;
        case 'vessel':
            locationIcon = 'fa-ship';
            break;
        case 'terminal':
            locationIcon = 'fa-warehouse';
            break;
        case 'destination':
            locationIcon = 'fa-location-dot';
            break;
    }
    
    return `
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid ${locationIcon}"></i>
                Current Location
            </h3>
            
            <div style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem;">
                ${location.name}
            </div>
            
            <div style="font-size: 0.875rem; opacity: 0.95; margin-bottom: 0.5rem;">
                Coordinates: ${location.lat.toFixed(4)}°N, ${Math.abs(location.lon).toFixed(4)}°${location.lon < 0 ? 'W' : 'E'}
            </div>
            
            ${vessel ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.2);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                        <div>
                            <div style="font-size: 0.75rem; opacity: 0.9; margin-bottom: 0.25rem;">Vessel Name</div>
                            <div style="font-weight: 600;">${vessel.name}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; opacity: 0.9; margin-bottom: 0.25rem;">Flag</div>
                            <div style="font-weight: 600;">${vessel.flag}</div>
                        </div>
                        ${vessel.currentSpeed ? `
                            <div>
                                <div style="font-size: 0.75rem; opacity: 0.9; margin-bottom: 0.25rem;">Speed</div>
                                <div style="font-weight: 600;">${vessel.currentSpeed} knots</div>
                            </div>
                        ` : ''}
                        <div>
                            <div style="font-size: 0.75rem; opacity: 0.9; margin-bottom: 0.25rem;">IMO Number</div>
                            <div style="font-weight: 600; font-family: monospace;">${vessel.imo}</div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${location.arrivalDate ? `
                <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(255,255,255,0.15); border-radius: 8px; display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fa-solid fa-calendar-check" style="font-size: 1.5rem;"></i>
                    <div>
                        <div style="font-size: 0.8125rem; opacity: 0.9;">Expected Arrival</div>
                        <div style="font-size: 1.0625rem; font-weight: 600;">${new Date(location.arrivalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render interactive map placeholder
 */
function renderTrackingMap(container: TrackedContainer): string {
    return `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem; color: var(--text-color); display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-globe"></i>
                Route Map
            </h3>
            
            <div id="tracking-map-container" style="background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); border-radius: 12px; padding: 3rem; text-align: center; border: 2px dashed #0ea5e9;">
                <i class="fa-solid fa-map-marked-alt" style="font-size: 3rem; color: #0369a1; margin-bottom: 1rem;"></i>
                <div style="font-size: 1.125rem; font-weight: 600; color: #0c4a6e; margin-bottom: 0.5rem;">
                    Interactive Map Coming Soon
                </div>
                <div style="font-size: 0.875rem; color: #075985;">
                    Real-time vessel tracking on world map with route visualization
                </div>
                <div style="margin-top: 1rem; padding: 0.75rem; background: white; border-radius: 8px; display: inline-block;">
                    <strong>Current Position:</strong> ${container.currentLocation.lat.toFixed(4)}°N, ${Math.abs(container.currentLocation.lon).toFixed(4)}°${container.currentLocation.lon < 0 ? 'W' : 'E'}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render journey timeline
 */
function renderJourneyTimeline(container: TrackedContainer): string {
    const timeline = container.journey.map((event, index) => {
        let statusIcon = '';
        let statusColor = '';
        
        switch (event.status) {
            case 'completed':
                statusIcon = 'fa-check-circle';
                statusColor = '#22c55e';
                break;
            case 'in-progress':
                statusIcon = 'fa-spinner fa-spin';
                statusColor = '#3b82f6';
                break;
            case 'upcoming':
                statusIcon = 'fa-clock';
                statusColor = '#9ca3af';
                break;
        }
        
        const isLast = index === container.journey.length - 1;
        
        return `
            <div style="display: flex; gap: 1rem; position: relative;">
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: ${statusColor}; color: white; display: flex; align-items: center; justify-content: center; z-index: 1;">
                        <i class="fa-solid ${statusIcon}"></i>
                    </div>
                    ${!isLast ? `<div style="width: 2px; flex-grow: 1; background: ${statusColor}; opacity: 0.3; margin: 0.5rem 0;"></div>` : ''}
                </div>
                
                <div style="flex-grow: 1; padding-bottom: ${!isLast ? '2rem' : '0'};">
                    <div style="font-weight: 600; color: var(--text-color); margin-bottom: 0.25rem;">
                        ${event.location}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                        ${new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style="font-size: 0.8125rem; color: var(--text-secondary);">
                        ${event.description}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem; color: var(--text-color); display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-route"></i>
                Journey Timeline
            </h3>
            
            <div style="background: var(--card-bg); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
                ${timeline}
            </div>
        </div>
    `;
}

/**
 * Render document status
 */
function renderDocumentStatus(container: TrackedContainer): string {
    const docs = container.documents;
    
    const getDocIcon = (status: string) => {
        switch (status) {
            case 'issued':
            case 'cleared':
            case 'ready':
                return { icon: 'fa-check-circle', color: '#22c55e' };
            case 'in-progress':
            case 'pending':
                return { icon: 'fa-clock', color: '#f59e0b' };
            case 'issues':
                return { icon: 'fa-exclamation-triangle', color: '#ef4444' };
            default:
                return { icon: 'fa-circle', color: '#9ca3af' };
        }
    };
    
    const bolIcon = getDocIcon(docs.billOfLading);
    const customsIcon = getDocIcon(docs.customsClearance);
    const doIcon = getDocIcon(docs.deliveryOrder);
    
    return `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem; color: var(--text-color); display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-file-lines"></i>
                Document Status
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div style="padding: 1rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <i class="fa-solid ${bolIcon.icon}" style="color: ${bolIcon.color}; font-size: 1.25rem;"></i>
                        <div>
                            <div style="font-weight: 600; color: var(--text-color);">Bill of Lading</div>
                            <div style="font-size: 0.8125rem; color: ${bolIcon.color}; text-transform: capitalize;">${docs.billOfLading.replace('-', ' ')}</div>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 1rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <i class="fa-solid ${customsIcon.icon}" style="color: ${customsIcon.color}; font-size: 1.25rem;"></i>
                        <div>
                            <div style="font-weight: 600; color: var(--text-color);">Customs Clearance</div>
                            <div style="font-size: 0.8125rem; color: ${customsIcon.color}; text-transform: capitalize;">${docs.customsClearance.replace('-', ' ')}</div>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 1rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <i class="fa-solid ${doIcon.icon}" style="color: ${doIcon.color}; font-size: 1.25rem;"></i>
                        <div>
                            <div style="font-weight: 600; color: var(--text-color);">Delivery Order</div>
                            <div style="font-size: 0.8125rem; color: ${doIcon.color}; text-transform: capitalize;">${docs.deliveryOrder.replace('-', ' ')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render alerts and notifications
 */
function renderAlerts(container: TrackedContainer): string {
    if (!container.alerts || container.alerts.length === 0) {
        return '';
    }
    
    const alertsHTML = container.alerts.map(alert => {
        let alertColor = '';
        let alertIcon = '';
        
        switch (alert.type) {
            case 'delay':
                alertColor = '#ef4444';
                alertIcon = 'fa-exclamation-circle';
                break;
            case 'arrival':
                alertColor = '#22c55e';
                alertIcon = 'fa-check-circle';
                break;
            case 'customs':
                alertColor = '#3b82f6';
                alertIcon = 'fa-file-import';
                break;
            case 'demurrage':
                alertColor = '#f59e0b';
                alertIcon = 'fa-triangle-exclamation';
                break;
        }
        
        return `
            <div style="padding: 1rem; background: rgba(${alertColor === '#ef4444' ? '239, 68, 68' : alertColor === '#22c55e' ? '34, 197, 94' : alertColor === '#3b82f6' ? '59, 130, 246' : '245, 158, 11'}, 0.1); border-left: 4px solid ${alertColor}; border-radius: 8px; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                    <i class="fa-solid ${alertIcon}" style="color: ${alertColor}; font-size: 1.25rem; margin-top: 0.125rem;"></i>
                    <div style="flex-grow: 1;">
                        <div style="font-weight: 600; color: var(--text-color); margin-bottom: 0.25rem;">
                            ${alert.message}
                        </div>
                        <div style="font-size: 0.8125rem; color: var(--text-secondary);">
                            ${new Date(alert.timestamp).toLocaleString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem; color: var(--text-color); display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-bell"></i>
                Recent Alerts
            </h3>
            
            <div>
                ${alertsHTML}
            </div>
        </div>
    `;
}

/**
 * Add tracking number to user's dashboard
 */
export function saveTrackedContainer(container: TrackedContainer): void {
    const tracked = State.trackedContainers || [];
    
    // Check if already tracking this container
    const existingIndex = tracked.findIndex(c => c.containerNumber === container.containerNumber);
    
    if (existingIndex >= 0) {
        // Update existing
        tracked[existingIndex] = container;
    } else {
        // Add new
        tracked.push(container);
    }
    
    setState({ trackedContainers: tracked });
    showToast(`📦 Now tracking: ${container.containerNumber}`, 'success');
}

/**
 * Show tracking input modal
 */
export function showTrackingInput(): void {
    const modalHTML = `
        <div id="tracking-input-modal" class="modal-overlay" style="display: flex;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Track Your Container</h2>
                    <button class="modal-close-btn" onclick="document.getElementById('tracking-input-modal').remove();">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">
                        Enter your container number, bill of lading, or booking reference to track your shipment in real-time.
                    </p>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
                            Tracking Number
                        </label>
                        <input 
                            type="text" 
                            id="tracking-number-input" 
                            placeholder="e.g., MSCU1234567" 
                            style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); font-family: monospace; font-size: 1rem;"
                        />
                        <div style="margin-top: 0.5rem; font-size: 0.8125rem; color: var(--text-secondary);">
                            Try demo: <code style="background: var(--card-bg); padding: 0.125rem 0.375rem; border-radius: 4px; cursor: pointer;" onclick="document.getElementById('tracking-number-input').value = 'MSCU1234567';">MSCU1234567</code> or 
                            <code style="background: var(--card-bg); padding: 0.125rem 0.375rem; border-radius: 4px; cursor: pointer;" onclick="document.getElementById('tracking-number-input').value = 'MAEU7654321';">MAEU7654321</code>
                        </div>
                    </div>
                    
                    <button 
                        id="track-container-btn" 
                        class="main-submit-btn" 
                        style="width: 100%; margin-top: 1rem;"
                    >
                        <i class="fa-solid fa-search"></i> Track Container
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Attach event listeners
    setTimeout(() => {
        const input = document.getElementById('tracking-number-input') as HTMLInputElement;
        const btn = document.getElementById('track-container-btn');
        
        const handleTrack = async () => {
            const identifier = input?.value.trim().toUpperCase();
            if (!identifier) {
                showToast('Please enter a tracking number', 'error');
                return;
            }
            
            // Close input modal
            document.getElementById('tracking-input-modal')?.remove();
            
            // Track container
            const container = await trackContainer(identifier);
            if (container) {
                saveTrackedContainer(container);
                showTrackingDashboard(container);
            }
        };
        
        btn?.addEventListener('click', handleTrack);
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleTrack();
        });
        
        // Auto-focus input
        input?.focus();
    }, 100);
}
