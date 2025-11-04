// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { State, type Quote } from './state';
import { getLogisticsProviderLogo } from './utils';

/**
 * Get carrier logo or fallback icon
 */
function getCarrierIcon(carrierName: string): string {
    const logoUrl = getLogisticsProviderLogo(carrierName);
    
    if (logoUrl) {
        return `<img src="${logoUrl}" alt="${carrierName}" class="carrier-logo" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fa-solid fa-box-open\\'></i>';">`;
    }
    
    // Fallback to Font Awesome icon if logo not found
    const carrierLower = carrierName.toLowerCase();
    const iconMap: { [key: string]: string } = {
        'dhl': '<i class="fa-solid fa-box"></i>',
        'fedex': '<i class="fa-solid fa-truck-fast"></i>',
        'ups': '<i class="fa-solid fa-truck"></i>',
        'dpd': '<i class="fa-solid fa-truck-ramp-box"></i>',
        'usps': '<i class="fa-solid fa-envelope"></i>',
        'evri': '<i class="fa-solid fa-parcel"></i>',
        'maersk': '<i class="fa-solid fa-ship"></i>',
        'cma cgm': '<i class="fa-solid fa-ship"></i>',
        'hapag': '<i class="fa-solid fa-ship"></i>',
        'emirates': '<i class="fa-solid fa-plane"></i>',
        'lufthansa': '<i class="fa-solid fa-plane"></i>',
        'cathay': '<i class="fa-solid fa-plane"></i>',
        'atlas': '<i class="fa-solid fa-plane"></i>'
    };
    
    for (const [key, icon] of Object.entries(iconMap)) {
        if (carrierLower.includes(key)) {
            return icon;
        }
    }
    
    return `<i class="fa-solid fa-box-open"></i>`;
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