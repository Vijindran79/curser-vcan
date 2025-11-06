// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { State, type Quote } from './state';
import { getLogoUrl } from './logoMap';

/**
 * Get carrier logo or fallback icon using the new comprehensive logo system
 */
function getCarrierIcon(carrierName: string): string {
    const logoUrl = getLogoUrl(carrierName);
    
    if (logoUrl && logoUrl !== '/logos/default/default-box.svg') {
        return `<img src="${logoUrl}" alt="${carrierName} logo" class="carrier-logo inline-block object-contain" loading="lazy" onerror="this.outerHTML='<i class=\\'fa-solid fa-box-open\\'></i>';">`;
    }
    
    // Enhanced fallback to Font Awesome icon for major carriers
    const carrierLower = carrierName.toLowerCase();
    const iconMap: { [key: string]: string } = {
        'dhl': '<i class="fa-solid fa-box" style="color: #D40511;"></i>',
        'fedex': '<i class="fa-solid fa-truck-fast" style="color: #4D148C;"></i>',
        'ups': '<i class="fa-solid fa-truck" style="color: #8B4513;"></i>',
        'dpd': '<i class="fa-solid fa-truck-ramp-box" style="color: #FF6B35;"></i>',
        'usps': '<i class="fa-solid fa-envelope" style="color: #0066CC;"></i>',
        'evri': '<i class="fa-solid fa-parcel" style="color: #FF6B35;"></i>',
        'maersk': '<i class="fa-solid fa-ship" style="color: #0066CC;"></i>',
        'cma cgm': '<i class="fa-solid fa-ship" style="color: #E31E24;"></i>',
        'hapag': '<i class="fa-solid fa-ship" style="color: #FF6600;"></i>',
        'msc': '<i class="fa-solid fa-ship" style="color: #003f7f;"></i>',
        'evergreen': '<i class="fa-solid fa-ship" style="color: #0066CC;"></i>',
        'one': '<i class="fa-solid fa-ship" style="color: #003f7f;"></i>',
        'cosco': '<i class="fa-solid fa-ship" style="color: #003f7f;"></i>',
        'pil': '<i class="fa-solid fa-ship" style="color: #003f7f;"></i>',
        'emirates': '<i class="fa-solid fa-plane" style="color: #D71920;"></i>',
        'singapore airlines': '<i class="fa-solid fa-plane" style="color: #003f7f;"></i>',
        'lufthansa': '<i class="fa-solid fa-plane" style="color: #FFCC00;"></i>',
        'qatar': '<i class="fa-solid fa-plane" style="color: #8A1538;"></i>',
        'amazon': '<i class="fa-solid fa-store" style="color: #FF9900;"></i>',
        'ebay': '<i class="fa-solid fa-store" style="color: #E53238;"></i>',
        'shopify': '<i class="fa-solid fa-store" style="color: #96BF47;"></i>',
        'default': '<i class="fa-solid fa-box-open" style="color: #6B7280;"></i>'
    };
    
    // Check for exact matches first
    for (const [key, icon] of Object.entries(iconMap)) {
        if (carrierLower === key) {
            return icon;
        }
    }
    
    // Check for partial matches
    for (const [key, icon] of Object.entries(iconMap)) {
        if (carrierLower.includes(key)) {
            return icon;
        }
    }
    
    // Ultimate fallback
    return `<i class="fa-solid fa-box-open" style="color: #6B7280;"></i>`;
}

/**
 * Creates the HTML string for a single quote card.
 * @param quote The quote data object.
 * @returns An HTML string representing the quote card.
 */
export function createQuoteCard(quote: Quote): string {
    const companyName = quote.carrierName || 'Carrier';
    
    // Get carrier logo or icon
    const carrierIcon = getCarrierIcon(companyName);
    
    // Determine if it's an image (logo) or icon (fallback)
    const isLogoImage = carrierIcon.includes('<img');
    const logoContainerClass = isLogoImage ? 'carrier-logo-container' : 'carrier-logo-fallback';
    
    // FIX: Escape double quotes in the JSON string to safely embed it in the HTML data attribute.
    // This prevents "Unterminated string in JSON" errors if the quote data contains special characters.
    const safeQuoteData = JSON.stringify(quote).replace(/"/g, '&quot;');

    return `
        <div class="quote-card ${quote.isSpecialOffer ? 'quote-card-special' : ''}">
            ${quote.isSpecialOffer ? '<div class="special-offer-text">Vcanship Direct</div>' : ''}
            <div class="quote-card-header">
                <div class="${logoContainerClass}">${carrierIcon}</div>
                <div class="carrier-info">
                    <span class="carrier-name">${companyName}</span>
                    <span class="carrier-type">${quote.carrierType}</span>
                </div>
                <div class="quote-provider-badge">via ${quote.serviceProvider}</div>
            </div>
            <div class="quote-card-body">
                 <div class="quote-card-details">
                    <div class="detail-item">
                        <span>Transit Time</span>
                        <strong>${quote.estimatedTransitTime || 'N/A'}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Chargeable Weight</span>
                        <strong>${quote.chargeableWeight} ${quote.chargeableWeightUnit}</strong>
                    </div>
                </div>
                <div class="quote-card-price">
                     <strong>${quote.totalCost ? `${State.currentCurrency.symbol}${quote.totalCost.toFixed(2)}` : 'N/A'}</strong>
                     <span>Total Cost</span>
                </div>
            </div>
            ${quote.notes ? `<div class="quote-card-notes">${quote.notes}</div>` : ''}
            <div class="quote-card-actions">
                 <button class="secondary-btn view-breakdown-btn" data-quote="${safeQuoteData}" ${!quote.costBreakdown ? 'disabled' : ''}>Breakdown</button>
                 <button class="main-submit-btn select-quote-btn" data-quote="${safeQuoteData}" ${!quote.totalCost ? 'disabled' : ''}>Select</button>
            </div>
        </div>
    `;
}