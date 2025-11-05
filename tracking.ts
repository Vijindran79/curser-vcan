// VCANSHIP REAL-TIME TRACKING SYSTEM
import { State } from './state';
import { showToast } from './ui';
import { DOMElements } from './dom';

// Types
interface TrackingEvent {
    timestamp: string;
    status: string;
    location: string;
    description: string;
    icon: string;
}

interface ShipmentTracking {
    trackingId: string;
    service: string;
    status: 'booked' | 'picked-up' | 'in-transit' | 'out-for-delivery' | 'delivered' | 'exception';
    origin: string;
    destination: string;
    currentLocation: string;
    estimatedDelivery: string;
    carrierName: string;
    carrierLogo?: string;
    weight: string;
    events: TrackingEvent[];
    packageInfo?: {
        dimensions?: string;
        description?: string;
        value?: string;
    };
}

// Mock tracking data generator (replace with real API later)
function generateMockTrackingData(trackingId: string): ShipmentTracking | null {
    // Check if tracking ID matches pattern
    if (!trackingId.match(/^(VCAN|PAR|FCL|LCL|AIR|BGG)-[A-Z0-9]+$/i)) {
        return null;
    }

    const statuses: ShipmentTracking['status'][] = ['booked', 'picked-up', 'in-transit', 'out-for-delivery', 'delivered'];
    const carriers = ['DHL Express', 'FedEx', 'UPS', 'DPD', 'Aramex', 'TNT'];
    const locations = [
        'London, UK',
        'Paris, FR',
        'Berlin, DE',
        'Amsterdam, NL',
        'New York, US',
        'Singapore, SG',
        'Tokyo, JP',
        'Sydney, AU'
    ];

    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const carrier = carriers[Math.floor(Math.random() * carriers.length)];
    const origin = locations[Math.floor(Math.random() * locations.length)];
    let destination = locations[Math.floor(Math.random() * locations.length)];
    while (destination === origin) {
        destination = locations[Math.floor(Math.random() * locations.length)];
    }

    // Generate events based on status
    const events: TrackingEvent[] = [];
    const now = new Date();

    // Always add booked event
    events.push({
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Booked',
        location: origin,
        description: 'Shipment booked and label generated',
        icon: 'fa-check-circle'
    });

    if (['picked-up', 'in-transit', 'out-for-delivery', 'delivered'].includes(randomStatus)) {
        events.push({
            timestamp: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Picked Up',
            location: origin,
            description: `Package picked up by ${carrier}`,
            icon: 'fa-box'
        });
    }

    if (['in-transit', 'out-for-delivery', 'delivered'].includes(randomStatus)) {
        events.push({
            timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'In Transit',
            location: 'Sorting Facility',
            description: 'Package arrived at sorting facility',
            icon: 'fa-warehouse'
        });

        events.push({
            timestamp: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'In Transit',
            location: 'International Hub',
            description: 'Package departed international hub',
            icon: 'fa-plane'
        });
    }

    if (['out-for-delivery', 'delivered'].includes(randomStatus)) {
        events.push({
            timestamp: new Date(now.getTime() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Out for Delivery',
            location: destination,
            description: 'Package out for delivery',
            icon: 'fa-truck-fast'
        });
    }

    if (randomStatus === 'delivered') {
        events.push({
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'Delivered',
            location: destination,
            description: 'Package delivered successfully',
            icon: 'fa-check-double'
        });
    }

    return {
        trackingId,
        service: 'parcel',
        status: randomStatus,
        origin,
        destination,
        currentLocation: events[events.length - 1].location,
        estimatedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        carrierName: carrier,
        weight: `${(Math.random() * 10 + 1).toFixed(1)} kg`,
        events: events.reverse(), // Most recent first
        packageInfo: {
            dimensions: '30 × 20 × 15 cm',
            description: 'Documents & Electronics',
            value: `${State.currentCurrency.symbol}${(Math.random() * 500 + 100).toFixed(2)}`
        }
    };
}

// Get status color
function getStatusColor(status: ShipmentTracking['status']): string {
    const colors: Record<ShipmentTracking['status'], string> = {
        'booked': '#3b82f6',      // Blue
        'picked-up': '#8b5cf6',    // Purple
        'in-transit': '#f59e0b',   // Orange
        'out-for-delivery': '#10b981', // Green
        'delivered': '#059669',    // Dark Green
        'exception': '#ef4444'     // Red
    };
    return colors[status] || '#6b7280';
}

// Get status icon
function getStatusIcon(status: ShipmentTracking['status']): string {
    const icons: Record<ShipmentTracking['status'], string> = {
        'booked': 'fa-clipboard-check',
        'picked-up': 'fa-box',
        'in-transit': 'fa-truck',
        'out-for-delivery': 'fa-truck-fast',
        'delivered': 'fa-check-double',
        'exception': 'fa-triangle-exclamation'
    };
    return icons[status] || 'fa-circle-info';
}

// Format timestamp
function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
        return 'Just now';
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Render tracking page
export function renderTrackingPage(trackingId?: string) {
    const container = document.getElementById('app');
    if (!container) return;

    let trackingData: ShipmentTracking | null = null;

    if (trackingId) {
        // If tracking ID provided, fetch data
        trackingData = generateMockTrackingData(trackingId);

        if (!trackingData) {
            showToast('Invalid tracking number', 'error');
        }
    }

    const statusColor = trackingData ? getStatusColor(trackingData.status) : '#f97316';
    const statusIcon = trackingData ? getStatusIcon(trackingData.status) : 'fa-magnifying-glass';

    container.innerHTML = `
        <div class="tracking-page" style="
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 1rem;
        ">
            <!-- Header -->
            <div style="
                text-align: center;
                margin-bottom: 3rem;
            ">
                <h1 style="
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: #1f2937;
                    margin-bottom: 0.5rem;
                ">
                    <i class="fa-solid fa-location-dot" style="color: #f97316;"></i>
                    Track Your Shipment
                </h1>
                <p style="
                    color: #6b7280;
                    font-size: 1.125rem;
                ">
                    Enter your tracking number to see real-time updates
                </p>
            </div>

            <!-- Search Box -->
            <div style="
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                margin-bottom: 2rem;
            ">
                <form id="tracking-search-form" style="
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                ">
                    <input
                        type="text"
                        id="tracking-id-search"
                        placeholder="Enter tracking number (e.g., VCAN-ABC123)"
                        value="${trackingId || ''}"
                        style="
                            flex: 1;
                            min-width: 300px;
                            padding: 1rem 1.5rem;
                            border: 2px solid #e5e7eb;
                            border-radius: 0.75rem;
                            font-size: 1rem;
                            transition: border-color 0.3s;
                        "
                        required
                    />
                    <button type="submit" style="
                        padding: 1rem 2.5rem;
                        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                        color: white;
                        border: none;
                        border-radius: 0.75rem;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s;
                        white-space: nowrap;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fa-solid fa-magnifying-glass"></i> Track
                    </button>
                </form>
            </div>

            ${trackingData ? `
                <!-- Tracking Results -->
                <div class="tracking-results">
                    <!-- Status Overview -->
                    <div style="
                        background: white;
                        padding: 2.5rem;
                        border-radius: 1rem;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                        margin-bottom: 2rem;
                    ">
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 1.5rem;
                            margin-bottom: 2rem;
                            flex-wrap: wrap;
                        ">
                            <div style="
                                width: 80px;
                                height: 80px;
                                background: ${statusColor}15;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i class="fa-solid ${statusIcon}" style="
                                    font-size: 2rem;
                                    color: ${statusColor};
                                "></i>
                            </div>
                            <div style="flex: 1;">
                                <h2 style="
                                    font-size: 1.875rem;
                                    font-weight: 700;
                                    color: #1f2937;
                                    margin-bottom: 0.5rem;
                                    text-transform: capitalize;
                                ">
                                    ${trackingData.status.replace('-', ' ')}
                                </h2>
                                <p style="
                                    color: #6b7280;
                                    font-size: 1.125rem;
                                ">
                                    Tracking: <strong>${trackingData.trackingId}</strong>
                                </p>
                            </div>
                        </div>

                        <!-- Route -->
                        <div style="
                            display: grid;
                            grid-template-columns: 1fr auto 1fr;
                            gap: 1.5rem;
                            align-items: center;
                            margin-bottom: 2rem;
                        ">
                            <div>
                                <p style="
                                    color: #6b7280;
                                    font-size: 0.875rem;
                                    margin-bottom: 0.25rem;
                                ">Origin</p>
                                <p style="
                                    color: #1f2937;
                                    font-weight: 600;
                                    font-size: 1.125rem;
                                ">${trackingData.origin}</p>
                            </div>
                            <div style="text-align: center;">
                                <i class="fa-solid fa-arrow-right" style="
                                    font-size: 1.5rem;
                                    color: #f97316;
                                "></i>
                            </div>
                            <div style="text-align: right;">
                                <p style="
                                    color: #6b7280;
                                    font-size: 0.875rem;
                                    margin-bottom: 0.25rem;
                                ">Destination</p>
                                <p style="
                                    color: #1f2937;
                                    font-weight: 600;
                                    font-size: 1.125rem;
                                ">${trackingData.destination}</p>
                            </div>
                        </div>

                        <!-- Details Grid -->
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                            gap: 1.5rem;
                            padding-top: 1.5rem;
                            border-top: 1px solid #e5e7eb;
                        ">
                            <div>
                                <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">
                                    <i class="fa-solid fa-building"></i> Carrier
                                </p>
                                <p style="color: #1f2937; font-weight: 600;">${trackingData.carrierName}</p>
                            </div>
                            <div>
                                <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">
                                    <i class="fa-solid fa-weight-scale"></i> Weight
                                </p>
                                <p style="color: #1f2937; font-weight: 600;">${trackingData.weight}</p>
                            </div>
                            <div>
                                <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">
                                    <i class="fa-solid fa-calendar"></i> Est. Delivery
                                </p>
                                <p style="color: #1f2937; font-weight: 600;">
                                    ${new Date(trackingData.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                            <div>
                                <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.25rem;">
                                    <i class="fa-solid fa-location-dot"></i> Current Location
                                </p>
                                <p style="color: #1f2937; font-weight: 600;">${trackingData.currentLocation}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Timeline -->
                    <div style="
                        background: white;
                        padding: 2.5rem;
                        border-radius: 1rem;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    ">
                        <h3 style="
                            font-size: 1.5rem;
                            font-weight: 700;
                            color: #1f2937;
                            margin-bottom: 2rem;
                        ">
                            <i class="fa-solid fa-clock-rotate-left"></i> Tracking History
                        </h3>

                        <div style="position: relative;">
                            <!-- Timeline line -->
                            <div style="
                                position: absolute;
                                left: 20px;
                                top: 30px;
                                bottom: 30px;
                                width: 2px;
                                background: #e5e7eb;
                            "></div>

                            ${trackingData.events.map((event, index) => `
                                <div style="
                                    position: relative;
                                    padding-left: 4rem;
                                    padding-bottom: ${index < trackingData!.events.length - 1 ? '2rem' : '0'};
                                ">
                                    <!-- Icon -->
                                    <div style="
                                        position: absolute;
                                        left: 0;
                                        top: 0;
                                        width: 40px;
                                        height: 40px;
                                        background: ${index === 0 ? statusColor : 'white'};
                                        border: 3px solid ${index === 0 ? statusColor : '#e5e7eb'};
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        z-index: 1;
                                    ">
                                        <i class="fa-solid ${event.icon}" style="
                                            color: ${index === 0 ? 'white' : '#9ca3af'};
                                            font-size: 0.875rem;
                                        "></i>
                                    </div>

                                    <!-- Content -->
                                    <div>
                                        <h4 style="
                                            font-size: 1.125rem;
                                            font-weight: 600;
                                            color: #1f2937;
                                            margin-bottom: 0.25rem;
                                        ">${event.status}</h4>
                                        <p style="
                                            color: #6b7280;
                                            margin-bottom: 0.5rem;
                                        ">${event.description}</p>
                                        <div style="
                                            display: flex;
                                            gap: 1.5rem;
                                            font-size: 0.875rem;
                                            color: #9ca3af;
                                        ">
                                            <span>
                                                <i class="fa-solid fa-location-dot"></i> ${event.location}
                                            </span>
                                            <span>
                                                <i class="fa-solid fa-clock"></i> ${formatTimestamp(event.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    // Attach event listener
    const form = document.getElementById('tracking-search-form') as HTMLFormElement;
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('tracking-id-search') as HTMLInputElement;
            if (input && input.value.trim()) {
                renderTrackingPage(input.value.trim().toUpperCase());
                // Update URL without page reload
                window.history.pushState({}, '', `#tracking/${input.value.trim().toUpperCase()}`);
            }
        });
    }

    // Style input focus
    const input = document.getElementById('tracking-id-search') as HTMLInputElement;
    if (input) {
        input.addEventListener('focus', () => {
            input.style.borderColor = '#f97316';
            input.style.outline = 'none';
        });
        input.addEventListener('blur', () => {
            input.style.borderColor = '#e5e7eb';
        });
    }
}

// Export function to track from header
export function trackShipment(trackingId: string) {
    renderTrackingPage(trackingId);
}
