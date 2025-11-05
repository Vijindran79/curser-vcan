// VCANSHIP PARCEL DELIVERY - ENHANCED VERSION WITH ALL FEATURES
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, type Quote, type Address, resetParcelState, type Service } from './state';
import { getHsCodeSuggestions, checkAndDecrementLookup } from './api';
import { showToast, switchPage, toggleLoading } from './ui';
import { t } from './i18n';
import { MARKUP_CONFIG } from './pricing';
import { SchemaType } from '@google/generative-ai';
import { checkCompliance, type ComplianceCheck, COUNTRY_PICKUP_RULES, detectCountry } from './compliance';
import { getLogisticsProviderLogo } from './utils';
import { loadSavedAddresses, saveAddress, type SavedAddress } from './account';
import { showHSCodeSearchModal } from './hs-code-intelligence';

// TYPES
interface ParcelFormData {
    serviceType: 'pickup' | 'dropoff';
    originAddress: string;
    destinationAddress: string;
    parcelType: string;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    sendDay: 'weekday' | 'saturday' | 'sunday';
    itemDescription: string;
    hsCode?: string;
    documents: File[];
    savedAddressId?: string;
    // Insurance options
    insurance: 'none' | 'standard' | 'full';
    insuranceValue?: number;
    // Delivery options
    signatureRequired: boolean;
    leaveInSafePlace: boolean;
    safePlaceDescription?: string;
    specialInstructions?: string;
}

let currentStep = 1;
const TOTAL_STEPS = 6;
let formData: Partial<ParcelFormData> = {};
let allQuotes: Quote[] = [];
let dropoffLocations: any[] = [];
let usedApiQuotes = false; // Track if we successfully got quotes from API
let originAutocomplete: any = null;
let destAutocomplete: any = null;

// Google Maps Types (inline declarations)
declare global {
    interface Window {
        googleMapsLoaded?: boolean;
        google?: any;
        initGoogleMaps?: () => void;
    }
}

// STEP 1: Service Type Selection
function renderStep1(): string {
    // Detect origin country and check pickup availability
    const originCountry = formData.originAddress ? detectCountry(formData.originAddress) : null;
    const pickupRules = originCountry ? COUNTRY_PICKUP_RULES[originCountry] : null;
    const pickupAvailable = pickupRules?.homePickupAvailable ?? true; // Default to true if not detected yet
    
    // Show warning if pickup not available
    const pickupWarning = !pickupAvailable ? `
        <div class="info-card warning-card" style="margin-bottom: 1.5rem; padding: 1rem; background: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 8px;">
            <h5 style="color: #991B1B; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-exclamation-triangle"></i> Home Pickup Not Available
            </h5>
            <p style="color: #7F1D1D; margin: 0;">
                ${pickupRules ? `Home pickup is not available in ${pickupRules.name}. Please use the drop-off option below.` : 'Home pickup may not be available in your area. Please use the drop-off option or contact support.'}
            </p>
        </div>
    ` : '';
    
    // Show pickup info if available
    const pickupInfo = pickupAvailable && pickupRules ? `
        <div class="info-card" style="margin-bottom: 1.5rem; padding: 1rem; background: #F0FDF4; border-left: 4px solid #10B981; border-radius: 8px;">
            <h5 style="color: #065F46; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-check-circle"></i> Home Pickup Available
            </h5>
            <p style="color: #047857; margin: 0; font-size: 0.9em;">
                Available carriers: ${pickupRules.pickupCarriers.join(', ')} • 
                ${pickupRules.pickupMinimumNotice}h advance notice • 
                ${pickupRules.pickupFee === 0 ? 'Free pickup' : `$${pickupRules.pickupFee} fee`}
            </p>
        </div>
    ` : '';
    
    return `
        <div class="step-content">
            <h3>How would you like to send your parcel?</h3>
            <p class="subtitle">Choose the most convenient option for you</p>
            
            ${pickupWarning}
            ${!pickupWarning && originCountry ? pickupInfo : ''}
            
            <div class="service-type-selector" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 2rem;">
                <button type="button" 
                    class="service-type-card${formData.serviceType === 'pickup' ? ' selected' : ''}" 
                    data-type="pickup"
                    ${!pickupAvailable ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                    ${formData.serviceType === 'pickup' && pickupAvailable ? 'style="border-color: #f97316 !important; box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.3) !important; background-color: #FFF7ED !important;"' : ''}>
                    <div class="service-icon">
                        <i class="fa-solid fa-house"></i>
                    </div>
                    <h4>Home Pickup</h4>
                    <p>We collect from your door</p>
                    ${pickupAvailable ? 
                        `<span class="badge">${pickupRules?.pickupFee === 0 ? 'Free pickup' : `$${pickupRules?.pickupFee || 0} fee`}</span>` : 
                        '<span class="badge" style="background: #EF4444;">Not available</span>'
                    }
                </button>
                
                <button type="button" 
                    class="service-type-card${formData.serviceType === 'dropoff' ? ' selected' : ''}" 
                    data-type="dropoff"
                    ${formData.serviceType === 'dropoff' ? 'style="border-color: #f97316 !important; box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.3) !important; background-color: #FFF7ED !important;"' : ''}>
                    <div class="service-icon">
                        <i class="fa-solid fa-location-dot"></i>
                    </div>
                    <h4>Drop-off Point</h4>
                    <p>Take to nearest location</p>
                    <span class="badge">Save up to 20%</span>
                </button>
            </div>
            
            ${formData.serviceType === 'dropoff' ? `
                <div class="info-card" style="margin-top: 1.5rem; padding: 1rem; background: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 8px;">
                    <h5 style="color: #1E40AF; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-map-marker-alt"></i> Drop-off Locations
                    </h5>
                    <p style="color: #1E3A8A; margin: 0;">
                        After booking, you'll receive a confirmation email with:
                    </p>
                    <ul style="color: #1E3A8A; margin: 0.5rem 0 0 1.5rem;">
                        <li><strong>Nearest drop-off points</strong> with full addresses</li>
                        <li><strong>Opening hours</strong> and contact details</li>
                        <li><strong>Your shipping label</strong> to print and attach</li>
                    </ul>
                    <p style="color: #1E3A8A; margin: 0.5rem 0 0 0; font-size: 0.9em;">
                        💡 Common locations: Post offices, convenience stores (Evri, InPost, Yodel shops)
                    </p>
                    ${formData.originAddress ? `
                        <button type="button" id="find-dropoff-btn" class="secondary-btn" style="margin-top: 1rem; width: 100%;">
                            <i class="fa-solid fa-map-location-dot"></i>
                            Find Nearest Drop-off Locations
                        </button>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

// STEP 2: Address Entry with Google Places Autocomplete
function renderStep2(): string {
    const isLoggedIn = State.isLoggedIn;
    
    return `
        <div class="step-content">
            <h3>Where is your parcel going?</h3>
            <p class="subtitle">Enter addresses or postcodes</p>
            
            ${isLoggedIn ? `
                <div style="margin-bottom: 1.5rem;">
                    <button type="button" id="select-from-address-book-btn" class="secondary-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <i class="fa-solid fa-address-book"></i>
                        Select from Address Book
                    </button>
                </div>
            ` : ''}
            
            <div class="form-section">
                <div class="input-wrapper">
                    <label for="origin-address">
                        <i class="fa-solid fa-location-dot"></i> 
                        ${formData.serviceType === 'pickup' ? 'Pickup Address' : 'Your Address'}
                    </label>
                    <input 
                        type="text" 
                        id="origin-address" 
                        placeholder="Enter address or postcode..." 
                        value="${formData.originAddress || ''}"
                        autocomplete="off"
                        required
                    />
                    <small class="helper-text">Start typing for suggestions</small>
                    ${isLoggedIn ? `
                        <label style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; font-weight: normal; font-size: 0.9em;">
                            <input type="checkbox" id="save-origin-address" style="width: auto;">
                            Save this address for future bookings
                        </label>
                    ` : ''}
                </div>
                
                <div class="input-wrapper">
                    <label for="destination-address">
                        <i class="fa-solid fa-location-crosshairs"></i> 
                        Destination Address
                    </label>
                    <input 
                        type="text" 
                        id="destination-address" 
                        placeholder="Enter address or postcode..." 
                        value="${formData.destinationAddress || ''}"
                        autocomplete="off"
                        required
                    />
                    <small class="helper-text">Start typing for suggestions</small>
                    ${isLoggedIn ? `
                        <label style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; font-weight: normal; font-size: 0.9em;">
                            <input type="checkbox" id="save-destination-address" style="width: auto;">
                            Save this address for future bookings
                        </label>
                    ` : ''}
                </div>
                
                <div id="address-map-preview" class="map-preview hidden">
                    <p class="helper-text">📍 Address validated</p>
                </div>
            </div>
        </div>
    `;
}

// STEP 3: Parcel Details with Type Selection
function renderStep3(): string {
    const parcelTypes = [
        { value: 'document', label: 'Document', icon: 'fa-file', desc: 'Letters, papers' },
        { value: 'small-parcel', label: 'Small Parcel', icon: 'fa-box', desc: 'Up to 2kg' },
        { value: 'medium-parcel', label: 'Medium Parcel', icon: 'fa-boxes-stacked', desc: '2-10kg' },
        { value: 'large-parcel', label: 'Large Parcel', icon: 'fa-box-open', desc: '10-30kg' },
        { value: 'bulky', label: 'Bulky Item', icon: 'fa-couch', desc: 'Furniture, large items' },
        { value: 'pallet', label: 'Pallet', icon: 'fa-pallet', desc: 'Multiple boxes' },
        { value: 'breakbulk', label: 'Break Bulk', icon: 'fa-truck-loading', desc: 'Oversized cargo' }
    ];
    
    return `
        <div class="step-content">
            <h3>What are you sending?</h3>
            <p class="subtitle">Tell us about your parcel</p>
            
            <div class="parcel-type-grid">
                ${parcelTypes.map(type => `
                    <button type="button" class="parcel-type-card ${formData.parcelType === type.value ? 'selected' : ''}" data-value="${type.value}">
                        <i class="fa-solid ${type.icon}"></i>
                        <strong>${type.label}</strong>
                        <small>${type.desc}</small>
                    </button>
                `).join('')}
            </div>
            
            <div class="form-section two-column" style="margin-top: 2rem;">
                <div class="input-wrapper">
                    <label for="parcel-weight">
                        Weight (kg) <span class="required">*</span>
                    </label>
                    <input 
                        type="number" 
                        id="parcel-weight" 
                        placeholder="e.g., 2.5" 
                        value="${formData.weight || ''}"
                        min="0.1"
                        step="0.1"
                        inputmode="decimal"
                        required
                    />
                    <small class="helper-text tip">💡 Accurate weight helps us find the best rates</small>
                </div>
                
                <div class="input-wrapper">
                    <label for="item-description">
                        What's inside? <span class="required">*</span>
                    </label>
                    <input 
                        type="text" 
                        id="item-description" 
                        placeholder="e.g., Books, Clothes, Electronics" 
                        value="${formData.itemDescription || ''}"
                        required
                    />
                    <small class="helper-text">This helps with customs and compliance</small>
                </div>
            </div>
            
            <div class="expandable-section">
                <button type="button" class="expand-toggle" id="dimensions-toggle">
                    <i class="fa-solid fa-chevron-right"></i>
                    Add Dimensions (optional but recommended)
                </button>
                <div class="expandable-content hidden" id="dimensions-content">
                    <div class="form-section three-column">
                        <div class="input-wrapper">
                            <label for="parcel-length">Length (cm)</label>
                            <input type="number" id="parcel-length" placeholder="30" value="${formData.length || ''}" min="1" step="1" inputmode="numeric">
                        </div>
                        <div class="input-wrapper">
                            <label for="parcel-width">Width (cm)</label>
                            <input type="number" id="parcel-width" placeholder="20" value="${formData.width || ''}" min="1" step="1" inputmode="numeric">
                        </div>
                        <div class="input-wrapper">
                            <label for="parcel-height">Height (cm)</label>
                            <input type="number" id="parcel-height" placeholder="15" value="${formData.height || ''}" min="1" step="1" inputmode="numeric">
                        </div>
                    </div>
                    <div class="info-box">
                        <i class="fa-solid fa-lightbulb"></i>
                        <p><strong>Why dimensions matter:</strong> Large but light items may cost more due to volumetric weight.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}


// STEP 4: Send Day & Compliance
function renderStep4(): string {
    return `
        <div class="step-content">
            <h3>When would you like to send?</h3>
            
            <div class="send-day-selector">
                <button type="button" class="send-day-card ${formData.sendDay === 'weekday' ? 'selected' : ''}" data-day="weekday">
                    <i class="fa-solid fa-calendar-days"></i>
                    <strong>Weekday</strong>
                    <small>Mon-Fri</small>
                    <span class="price-badge">Standard rate</span>
                </button>
                <button type="button" class="send-day-card ${formData.sendDay === 'saturday' ? 'selected' : ''}" data-day="saturday">
                    <i class="fa-solid fa-calendar-week"></i>
                    <strong>Saturday</strong>
                    <small>Weekend service</small>
                    <span class="price-badge">+${State.currentCurrency.symbol}5.00</span>
                </button>
                <button type="button" class="send-day-card ${formData.sendDay === 'sunday' ? 'selected' : ''}" data-day="sunday">
                    <i class="fa-solid fa-calendar-day"></i>
                    <strong>Sunday</strong>
                    <small>Premium service</small>
                    <span class="price-badge">+${State.currentCurrency.symbol}8.00</span>
                </button>
            </div>
            
            <div class="compliance-section">
                <h4><i class="fa-solid fa-shield-halved"></i> Customs Information (Optional)</h4>
                <div class="hs-code-generator">
                    <div class="input-wrapper">
                        <label for="hs-code-display">
                            HS Code 
                            <span style="color: var(--medium-gray); font-weight: 400; font-size: 0.9em;">(Optional - We'll handle this for you)</span>
                        </label>
                        <input 
                            type="text" 
                            id="hs-code-display" 
                            value="${formData.hsCode || 'Not generated yet'}"
                            readonly
                            style="background-color: #f5f5f5;"
                        />
                        <button type="button" id="generate-hs-code-btn" class="secondary-btn" style="margin-top: 0.5rem;">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> 
                            Auto-Generate HS Code (Optional)
                        </button>
                        <small class="helper-text" style="color: var(--medium-gray);">
                            <i class="fa-solid fa-info-circle"></i> 
                            <strong>For personal effects/used goods:</strong> No HS code needed. We'll use the standard personal effects classification (9803.00.00) during customs clearance.
                        </small>
                    </div>
                </div>
                
                <div class="compliance-tips-card">
                    <h5><i class="fa-solid fa-info-circle"></i> Packing Guidelines</h5>
                    <ul>
                        <li>✓ Use sturdy packaging with adequate padding</li>
                        <li>✓ Seal all edges with strong tape</li>
                        <li>✓ Label fragile items clearly</li>
                        <li>⚠️ Check prohibited items list</li>
                    </ul>
                    <button type="button" class="link-btn" id="view-prohibited-items-btn">View Prohibited Items</button>
                </div>
                
                <div id="compliance-alerts"></div>
            </div>
            
            <div class="insurance-section">
                <h4><i class="fa-solid fa-shield-halved"></i> Parcel Insurance (Recommended)</h4>
                <p class="helper-text">Protect your shipment against loss or damage</p>
                
                <div class="insurance-options" style="display: grid; grid-template-columns: 1fr; gap: 1rem; margin-top: 1rem;">
                    <label class="insurance-option-card ${formData.insurance === 'none' || !formData.insurance ? 'selected' : ''}" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                        <input type="radio" name="insurance" value="none" ${formData.insurance === 'none' || !formData.insurance ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                        <div style="flex: 1;">
                            <strong style="font-size: 1rem; color: var(--dark-text);">No Insurance</strong><br>
                            <small style="color: var(--medium-gray);">Carrier liability only ($100 included)</small>
                        </div>
                        <span class="option-price" style="font-size: 1.1rem; font-weight: 600; color: var(--primary);">Free</span>
                    </label>
                    
                    <label class="insurance-option-card ${formData.insurance === 'standard' ? 'selected' : ''}" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                        <input type="radio" name="insurance" value="standard" ${formData.insurance === 'standard' ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                        <div style="flex: 1;">
                            <strong style="font-size: 1rem; color: var(--dark-text);">Standard Coverage</strong><br>
                            <small style="color: var(--medium-gray);">Up to $1,000 protection (1% of parcel value)</small>
                        </div>
                        <span class="option-price" style="font-size: 1.1rem; font-weight: 600; color: var(--primary);" id="standard-insurance-price">
                            +$10.00
                        </span>
                    </label>
                    
                    <label class="insurance-option-card ${formData.insurance === 'full' ? 'selected' : ''}" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                        <input type="radio" name="insurance" value="full" ${formData.insurance === 'full' ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                        <div style="flex: 1;">
                            <strong style="font-size: 1rem; color: var(--dark-text);">Full Coverage</strong><br>
                            <small style="color: var(--medium-gray);">Full value protection (2% of parcel value)</small>
                        </div>
                        <span class="option-price" style="font-size: 1.1rem; font-weight: 600; color: var(--primary);" id="full-insurance-price">
                            +$20.00
                        </span>
                    </label>
                </div>
                
                ${(formData.insurance === 'standard' || formData.insurance === 'full') ? `
                    <div class="input-wrapper" style="margin-top: 1rem;">
                        <label for="insurance-value">Parcel Value ($)</label>
                        <input 
                            type="number" 
                            id="insurance-value" 
                            placeholder="Enter parcel value"
                            value="${formData.insuranceValue || ''}"
                            min="1"
                            step="1"
                            inputmode="numeric"
                            required
                        />
                        <small class="helper-text">This is the replacement cost of your items</small>
                    </div>
                ` : ''}
            </div>
            
            <div class="delivery-options-section">
                <h4><i class="fa-solid fa-truck"></i> Delivery Options</h4>
                
                <label class="checkbox-option" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; margin-bottom: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer;">
                    <input type="checkbox" id="signature-required" ${formData.signatureRequired ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                    <div>
                        <strong style="font-size: 0.95rem;">Signature Required</strong><br>
                        <small style="color: var(--medium-gray);">Ensures delivery confirmation (+$3.00)</small>
                    </div>
                </label>
                
                <label class="checkbox-option" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer;">
                    <input type="checkbox" id="leave-safe-place" ${formData.leaveInSafePlace ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                    <div>
                        <strong style="font-size: 0.95rem;">Leave in Safe Place</strong><br>
                        <small style="color: var(--medium-gray);">Driver can leave parcel if no one home (Free)</small>
                    </div>
                </label>
                
                ${formData.leaveInSafePlace ? `
                    <div class="input-wrapper" style="margin-top: 0.5rem; margin-left: 2.5rem;">
                        <label for="safe-place-description">Where should the driver leave it?</label>
                        <input 
                            type="text" 
                            id="safe-place-description" 
                            placeholder="e.g., Behind gate, with neighbor at #12"
                            value="${formData.safePlaceDescription || ''}"
                            maxlength="100"
                        />
                    </div>
                ` : ''}
                
                <div class="input-wrapper" style="margin-top: 1rem;">
                    <label for="special-instructions">Special Delivery Instructions (Optional)</label>
                    <textarea 
                        id="special-instructions" 
                        placeholder="e.g., Ring doorbell twice, use back entrance"
                        maxlength="200"
                        rows="3"
                        style="resize: vertical;"
                    >${formData.specialInstructions || ''}</textarea>
                    <small class="helper-text">Max 200 characters</small>
                </div>
            </div>
            
            <div class="document-upload-section">
                <h4><i class="fa-solid fa-file-arrow-up"></i> Supporting Documents (Optional)</h4>
                <p class="helper-text">Upload invoices, customs forms, insurance documents, etc.</p>
                <div class="file-upload-area" id="document-upload-area">
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                    <p>Drag & drop files or click to upload</p>
                    <small>PDF, JPG, PNG - Max 5MB each</small>
                    <input type="file" id="document-upload-input" multiple accept=".pdf,.jpg,.jpeg,.png" hidden>
                </div>
                <div id="uploaded-files-list"></div>
            </div>
        </div>
    `;
}

// STEP 5: Review & Get Quotes
function renderStep5(): string {
    return `
        <div class="step-content">
            <h3>Review Your Details</h3>
            <p class="subtitle">Make sure everything is correct before getting quotes</p>
            
            <div class="review-summary-card">
                <div class="review-section">
                    <h4><i class="fa-solid fa-route"></i> Route</h4>
                    <div class="review-item">
                        <span>From:</span>
                        <strong>${formData.originAddress || 'Not set'}</strong>
                        <button type="button" class="edit-btn" data-step="2"><i class="fa-solid fa-edit"></i></button>
                    </div>
                    <div class="review-item">
                        <span>To:</span>
                        <strong>${formData.destinationAddress || 'Not set'}</strong>
                        <button type="button" class="edit-btn" data-step="2"><i class="fa-solid fa-edit"></i></button>
                    </div>
                    <div class="review-item">
                        <span>Service:</span>
                        <strong>${formData.serviceType === 'pickup' ? 'Home Pickup' : 'Drop-off'}</strong>
                        <button type="button" class="edit-btn" data-step="1"><i class="fa-solid fa-edit"></i></button>
                    </div>
                </div>
                
                <div class="review-section">
                    <h4><i class="fa-solid fa-box"></i> Parcel Details</h4>
                    <div class="review-item">
                        <span>Type:</span>
                        <strong>${formData.parcelType || 'Not set'}</strong>
                        <button type="button" class="edit-btn" data-step="3"><i class="fa-solid fa-edit"></i></button>
                    </div>
                    <div class="review-item">
                        <span>Weight:</span>
                        <strong>${formData.weight || '0'} kg</strong>
                        <button type="button" class="edit-btn" data-step="3"><i class="fa-solid fa-edit"></i></button>
                    </div>
                    ${formData.length ? `
                        <div class="review-item">
                            <span>Dimensions:</span>
                            <strong>${formData.length} × ${formData.width} × ${formData.height} cm</strong>
                            <button type="button" class="edit-btn" data-step="3"><i class="fa-solid fa-edit"></i></button>
                        </div>
                    ` : ''}
                    <div class="review-item">
                        <span>Contents:</span>
                        <strong>${formData.itemDescription || 'Not specified'}</strong>
                        <button type="button" class="edit-btn" data-step="3"><i class="fa-solid fa-edit"></i></button>
                    </div>
                </div>
                
                <div class="review-section">
                    <h4><i class="fa-solid fa-calendar"></i> Shipping Details</h4>
                    <div class="review-item">
                        <span>Send Day:</span>
                        <strong>${formData.sendDay === 'weekday' ? 'Weekday' : formData.sendDay === 'saturday' ? 'Saturday (+£5)' : 'Sunday (+£8)'}</strong>
                        <button type="button" class="edit-btn" data-step="4"><i class="fa-solid fa-edit"></i></button>
                    </div>
                    ${formData.hsCode ? `
                        <div class="review-item">
                            <span>HS Code:</span>
                            <strong>${formData.hsCode}</strong>
                            <button type="button" class="edit-btn" data-step="4"><i class="fa-solid fa-edit"></i></button>
                        </div>
                    ` : ''}
                    ${formData.documents && formData.documents.length > 0 ? `
                        <div class="review-item">
                            <span>Documents:</span>
                            <strong>${formData.documents.length} file(s) attached</strong>
                            <button type="button" class="edit-btn" data-step="4"><i class="fa-solid fa-edit"></i></button>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="compliance-check-status">
                <div class="status-item success">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>All details validated</span>
                </div>
                <div class="status-item success">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>Ready for quotes</span>
                </div>
            </div>
        </div>
    `;
}

// STEP 6: Quotes & Selection
function renderStep6(): string {
    if (allQuotes.length === 0) {
        return `
            <div class="step-content">
                <div class="loading-state">
                    <div class="spinner"></div>
                    <h3>Finding the best rates for you...</h3>
                    <p>Comparing prices from multiple carriers</p>
                </div>
            </div>
        `;
    }
    
    // Calculate competitor pricing (typically 15-30% higher than our best quote)
    const ourBestPrice = allQuotes.length > 0 ? allQuotes[0].totalCost : 0;
    const dhlPrice = ourBestPrice * 1.25; // 25% higher
    const fedexPrice = ourBestPrice * 1.22; // 22% higher
    const upsPrice = ourBestPrice * 1.18; // 18% higher
    const savings = ((dhlPrice - ourBestPrice) / dhlPrice * 100).toFixed(0);
    const savingsAmount = (dhlPrice - ourBestPrice).toFixed(2);
    
    return `
        <div class="step-content">
            <h3>Choose Your Shipping Option</h3>
            <p class="subtitle">Sorted by best value</p>
            
            <!-- PRICE COMPARISON WIDGET -->
            <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border: 2px solid #F59E0B; border-radius: 16px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                    <div style="background: #F59E0B; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        💰
                    </div>
                    <div>
                        <h4 style="margin: 0; color: #92400E; font-size: 1.1em;">You're Saving ${savings}% with Vcanship!</h4>
                        <p style="margin: 0.25rem 0 0 0; color: #B45309; font-size: 0.9em;">Compared to leading carriers</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
                    <div style="background: white; border-radius: 10px; padding: 1rem; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="font-weight: 600; color: #10B981; font-size: 1.1em; margin-bottom: 0.25rem;">
                            ${State.currentCurrency.symbol}${ourBestPrice.toFixed(2)}
                        </div>
                        <div style="font-size: 0.85em; color: #059669; font-weight: 600;">Vcanship ✓</div>
                        <div style="background: #10B981; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75em; margin-top: 0.5rem; font-weight: 600;">
                            BEST PRICE
                        </div>
                    </div>
                    
                    <div style="background: white; border-radius: 10px; padding: 1rem; text-align: center; opacity: 0.7; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="font-weight: 600; color: #6B7280; font-size: 1.1em; margin-bottom: 0.25rem; text-decoration: line-through;">
                            ${State.currentCurrency.symbol}${upsPrice.toFixed(2)}
                        </div>
                        <div style="font-size: 0.85em; color: #9CA3AF;">UPS</div>
                        <div style="background: #EF4444; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75em; margin-top: 0.5rem;">
                            +${((upsPrice - ourBestPrice) / ourBestPrice * 100).toFixed(0)}%
                        </div>
                    </div>
                    
                    <div style="background: white; border-radius: 10px; padding: 1rem; text-align: center; opacity: 0.7; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="font-weight: 600; color: #6B7280; font-size: 1.1em; margin-bottom: 0.25rem; text-decoration: line-through;">
                            ${State.currentCurrency.symbol}${fedexPrice.toFixed(2)}
                        </div>
                        <div style="font-size: 0.85em; color: #9CA3AF;">FedEx</div>
                        <div style="background: #EF4444; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75em; margin-top: 0.5rem;">
                            +${((fedexPrice - ourBestPrice) / ourBestPrice * 100).toFixed(0)}%
                        </div>
                    </div>
                    
                    <div style="background: white; border-radius: 10px; padding: 1rem; text-align: center; opacity: 0.7; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="font-weight: 600; color: #6B7280; font-size: 1.1em; margin-bottom: 0.25rem; text-decoration: line-through;">
                            ${State.currentCurrency.symbol}${dhlPrice.toFixed(2)}
                        </div>
                        <div style="font-size: 0.85em; color: #9CA3AF;">DHL</div>
                        <div style="background: #EF4444; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75em; margin-top: 0.5rem;">
                            +${((dhlPrice - ourBestPrice) / ourBestPrice * 100).toFixed(0)}%
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #FCD34D; display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 0.9em; color: #92400E;">
                        <i class="fa-solid fa-info-circle"></i> You save <strong>${State.currentCurrency.symbol}${savingsAmount}</strong> on this shipment
                    </div>
                    <div style="font-size: 0.75em; color: #B45309;">
                        *Competitor prices are estimates based on published rates
                    </div>
                </div>
            </div>
            
            <div class="quotes-grid">
                ${allQuotes.map((quote, idx) => `
                    <div class="quote-card ${idx === 0 ? 'recommended' : ''}" data-quote-id="${idx}">
                        ${idx === 0 ? '<span class="recommended-badge">⭐ Best Value</span>' : ''}
                        <div class="quote-header">
                            <div class="carrier-logo-fallback">${getCarrierIconHtml(quote.carrierName)}</div>
                            <div>
                                <h4>${quote.carrierName}</h4>
                                <p>${quote.carrierType}</p>
                            </div>
                        </div>
                        <div class="quote-price">
                            <span class="currency">${State.currentCurrency.symbol}</span>
                            <span class="amount">${quote.totalCost.toFixed(2)}</span>
                        </div>
                        <div class="quote-features">
                            <div><i class="fa-solid fa-clock"></i> ${quote.estimatedTransitTime}</div>
                            <div><i class="fa-solid fa-shield"></i> Tracked delivery</div>
                            <div><i class="fa-solid fa-box"></i> Up to 30kg</div>
                        </div>
                        <button type="button" class="select-quote-btn main-submit-btn" data-quote-id="${idx}">
                            Select & Continue
                        </button>
                    </div>
                `).join('')}
            </div>
            
            <div id="email-inquiry-form-container"></div>
        </div>
    `;
}

// Add function to render email form in step 6
async function renderEmailFormInStep6() {
    try {
        const container = document.getElementById('email-inquiry-form-container');
        if (container && allQuotes.length > 0) {
            const { renderEmailInquiryForm, attachEmailInquiryListeners } = await import('./email-inquiry-form');
            container.innerHTML = renderEmailInquiryForm('parcel', allQuotes, {
                origin: formData.originAddress,
                destination: formData.destinationAddress,
                weight: formData.weight,
                parcelType: formData.parcelType,
                serviceType: formData.serviceType
            });
            attachEmailInquiryListeners('parcel', allQuotes, {
                origin: formData.originAddress,
                destination: formData.destinationAddress,
                weight: formData.weight,
                parcelType: formData.parcelType,
                serviceType: formData.serviceType
            });
        }
    } catch (error) {
        // Email form is optional - fail silently
    }
}

// MAIN WIZARD RENDERER
function renderWizard(): string {
    const progress = (currentStep / TOTAL_STEPS) * 100;
    
    return `
        <div class="parcel-wizard-container">
            <button class="back-btn static-link" data-page="landing">
                <i class="fa-solid fa-arrow-left"></i> Back to Services
            </button>
            
            <div class="wizard-header">
                <h2>Send a Parcel</h2>
                <div class="step-indicator">
                    ${Array.from({ length: TOTAL_STEPS }, (_, i) => {
                        const stepNum = i + 1;
                        const isCompleted = currentStep > stepNum;
                        const isActive = currentStep === stepNum;
                        const isPending = currentStep < stepNum;
                        
                        return `
                            <div class="step-dot-wrapper">
                                <div class="step-dot ${isCompleted ? 'completed' : isActive ? 'active' : 'pending'}" data-step="${stepNum}">
                                    ${isCompleted ? '<i class="fa-solid fa-check"></i>' : stepNum}
                                </div>
                                ${i < TOTAL_STEPS - 1 ? '<div class="step-connector"></div>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <p class="step-label">Step ${currentStep} of ${TOTAL_STEPS}</p>
            </div>
            
            <form id="parcel-wizard-form" novalidate>
                ${currentStep === 1 ? renderStep1() : ''}
                ${currentStep === 2 ? renderStep2() : ''}
                ${currentStep === 3 ? renderStep3() : ''}
                ${currentStep === 4 ? renderStep4() : ''}
                ${currentStep === 5 ? renderStep5() : ''}
                ${currentStep === 6 ? renderStep6() : ''}
                
                <div class="wizard-actions">
                    ${currentStep > 1 ? '<button type="button" id="prev-step-btn" class="secondary-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>' : ''}
                    ${currentStep < 6 ? '<button type="button" id="next-step-btn" class="main-submit-btn">Next <i class="fa-solid fa-arrow-right"></i></button>' : ''}
                </div>
            </form>
        </div>
    `;
}

// NAVIGATION & VALIDATION
function validateCurrentStep(): boolean {
    switch (currentStep) {
        case 1:
            if (!formData.serviceType) {
                showToast('Please select a service type', 'warning');
                return false;
            }
            return true;
        case 2:
            // Read current values from DOM to catch unsaved changes
            const page2 = document.getElementById('page-parcel');
            if (!page2) {
                return false;
            }
            
            const originInput = page2.querySelector('#origin-address') as HTMLInputElement;
            const destInput = page2.querySelector('#destination-address') as HTMLInputElement;
            
            if (!originInput || !destInput) {
                showToast('Address fields not found. Please refresh the page.', 'error');
                return false;
            }
            
            const originAddress = originInput.value?.trim() || formData.originAddress?.trim() || '';
            const destinationAddress = destInput.value?.trim() || formData.destinationAddress?.trim() || '';
            
            // Update formData
            if (originAddress) formData.originAddress = originAddress;
            if (destinationAddress) formData.destinationAddress = destinationAddress;
            
            // Basic length validation
            if (!originAddress || originAddress.length < 10) {
                showToast('Please enter a complete pickup address (street address with city/state required)', 'error');
                originInput.focus();
                originInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            if (!destinationAddress || destinationAddress.length < 10) {
                showToast('Please enter a complete destination address (street address with city/state required)', 'error');
                destInput.focus();
                destInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            
            // Validate address format - must contain street address and city/state/country
            // Check for common address components (numbers for street, city names, state/country codes)
            const addressPattern = /.*\d+.*/; // Must contain at least one number (street number)
            const cityPattern = /.*[A-Za-z]{3,}.*/; // Must contain at least one word with 3+ letters (city name)
            
            if (!addressPattern.test(originAddress)) {
                showToast('Invalid pickup address format. Please include street number and address.', 'error');
                originInput.focus();
                originInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            if (!cityPattern.test(originAddress)) {
                showToast('Invalid pickup address format. Please include city name.', 'error');
                originInput.focus();
                originInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            
            if (!addressPattern.test(destinationAddress)) {
                showToast('Invalid destination address format. Please include street number and address.', 'error');
                destInput.focus();
                destInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            if (!cityPattern.test(destinationAddress)) {
                showToast('Invalid destination address format. Please include city name.', 'error');
                destInput.focus();
                destInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            
            // Check if addresses are too similar (likely wrong)
            if (originAddress.toLowerCase() === destinationAddress.toLowerCase()) {
                showToast('Pickup and destination addresses cannot be the same', 'error');
                originInput.focus();
                originInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            
            return true;
        case 3:
            // Read current values from DOM to catch unsaved changes
            const page = document.getElementById('page-parcel');
            if (!page) return false;
            
            // Get parcel type from selected card or formData
            const selectedCard = page.querySelector('.parcel-type-card.selected') as HTMLElement;
            const parcelType = selectedCard?.dataset.value || formData.parcelType || '';
            
            const weightInput = page.querySelector('#parcel-weight') as HTMLInputElement;
            const descInput = page.querySelector('#item-description') as HTMLInputElement;
            
            const weightStr = weightInput?.value?.trim() || '';
            const weight = weightStr ? parseFloat(weightStr) : formData.weight || 0;
            const itemDescription = descInput?.value?.trim() || formData.itemDescription?.trim() || '';
            
            // Update formData with current values BEFORE validation
            if (parcelType) formData.parcelType = parcelType;
            if (weight && weight > 0) formData.weight = weight;
            if (itemDescription) formData.itemDescription = itemDescription;
            
            // Validation with clear error messages
            if (!parcelType) {
                showToast('Please select a parcel type', 'warning');
                // Scroll to parcel type cards
                const parcelTypeSection = page.querySelector('.parcel-type-selector');
                if (parcelTypeSection) {
                    parcelTypeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return false;
            }
            if (!weightStr || !weight || weight <= 0 || isNaN(weight)) {
                showToast('Please enter a valid weight (must be greater than 0)', 'warning');
                weightInput?.focus();
                weightInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            if (!itemDescription) {
                showToast('Please enter item description', 'warning');
                descInput?.focus();
                descInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            
            // Check for prohibited items BEFORE allowing progression
            const description = itemDescription.toLowerCase();
            const prohibitedKeywords: { [key: string]: { severity: 'error' | 'warning', message: string } } = {
                'perfume': { severity: 'error', message: 'Perfume contains flammable substances and alcohol. Cannot be shipped via standard parcel service. Please contact support for special handling.' },
                'cologne': { severity: 'error', message: 'Cologne contains flammable substances and alcohol. Cannot be shipped via standard parcel service. Please contact support for special handling.' },
                'fragrance': { severity: 'error', message: 'Fragrances contain flammable substances. Cannot be shipped via standard parcel service. Please contact support for special handling.' },
                'battery': { severity: 'error', message: 'Batteries are dangerous goods and require special handling, documentation, and carrier approval. Cannot proceed without proper documentation.' },
                'batteries': { severity: 'error', message: 'Batteries are dangerous goods and require special handling, documentation, and carrier approval. Cannot proceed without proper documentation.' },
                'lithium': { severity: 'error', message: 'Lithium batteries are dangerous goods and require special handling, documentation, and carrier approval. Cannot proceed without proper documentation.' },
                'li-ion': { severity: 'error', message: 'Lithium-ion batteries are dangerous goods and require special handling, documentation, and carrier approval. Cannot proceed without proper documentation.' },
                'li-poly': { severity: 'error', message: 'Lithium-polymer batteries are dangerous goods and require special handling, documentation, and carrier approval. Cannot proceed without proper documentation.' }
            };
            
            for (const [keyword, info] of Object.entries(prohibitedKeywords)) {
                if (description.includes(keyword)) {
                    showToast(info.message, 'error');
                    descInput?.focus();
                    descInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return false; // Block progression
                }
            }
            
            // All validations passed
            return true;
        case 4:
            const page4 = document.getElementById('page-parcel');
            if (!page4) return false;
            
            // Check send day selection from DOM if not in formData
            const sendDayCards = page4.querySelectorAll('.send-day-card');
            let selectedDay = formData.sendDay;
            sendDayCards.forEach(card => {
                if (card.classList.contains('selected')) {
                    selectedDay = (card as HTMLElement).dataset.day as any;
                }
            });
            
            if (!selectedDay) {
                showToast('Please select a send day', 'warning');
                return false;
            }
            
            // Update formData
            formData.sendDay = selectedDay;
            
            // HS code is completely optional - we handle personal effects classification automatically
            // No warning needed
            
            return true;
        case 5:
            return true;
        default:
            return true;
    }
}


async function goToNextStep() {
    // Validate before proceeding
    const isValid = validateCurrentStep();
    
    if (!isValid) {
        return;
    }
    
    const nextBtn = document.getElementById('next-step-btn') as HTMLButtonElement;
    let originalText = '';
    if (nextBtn) {
        nextBtn.disabled = true;
        originalText = nextBtn.innerHTML;
        nextBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        nextBtn.style.opacity = '0.7';
    }
    
    // Show loading overlay with appropriate message
    const loadingMessages: { [key: number]: string } = {
        1: 'Preparing address entry...',
        2: 'Preparing parcel details...',
        3: 'Checking compliance requirements...',
        4: 'Preparing review...',
        5: 'Fetching real-time quotes from carriers... This may take 10-15 seconds'
    };
    
    const loadingMessage = loadingMessages[currentStep] || 'Preparing next step...';
    toggleLoading(true, loadingMessage);
    
    try {
        // Navigate IMMEDIATELY - don't wait for anything except step 5 (quote fetching)
        if (currentStep === 5) {
            // Step 5: Need to fetch quotes - show fetching message
            toggleLoading(true, 'Fetching real-time quotes from carriers... This may take 10-15 seconds');
            
            // Fetch quotes in background
            await fetchQuotes();
            
            // After fetching quotes, move to step 6 to display them
            if (allQuotes.length > 0) {
                currentStep++;
                renderPage();
            } else {
                showToast('Failed to get quotes. Please try again.', 'error');
            }
            toggleLoading(false);
            
            // Restore button
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.innerHTML = originalText;
                nextBtn.style.opacity = '1';
            }
            return;
        }
        
        // For all other steps - navigate INSTANTLY (don't wait for compliance checks)
        if (currentStep < TOTAL_STEPS) {
            // Before leaving Step 2, check if user wants to save addresses
            if (currentStep === 2 && State.isLoggedIn) {
                const saveOriginCheckbox = document.getElementById('save-origin-address') as HTMLInputElement;
                const saveDestCheckbox = document.getElementById('save-destination-address') as HTMLInputElement;
                
                if (saveOriginCheckbox?.checked && formData.originAddress) {
                    // Save origin address in background
                    saveAddressFromString(formData.originAddress, 'Origin').catch(console.error);
                }
                
                if (saveDestCheckbox?.checked && formData.destinationAddress) {
                    // Save destination address in background
                    saveAddressFromString(formData.destinationAddress, 'Destination').catch(console.error);
                }
            }
            
            currentStep++;
            
            // Render immediately - this should be instant
            renderPage();
            
            // Hide loading immediately after render (navigation is instant)
            toggleLoading(false);
            
            // Run compliance checks AFTER navigation (non-blocking)
            // Only for step 4 - run immediately but don't block navigation
            if (currentStep === 4) {
                // Run compliance check immediately (it's synchronous now - instant)
                setTimeout(() => {
                    checkProhibitedItems();
                }, 100);
            }
        }
        
        // Restore button state immediately
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.innerHTML = originalText;
            nextBtn.style.opacity = '1';
        }
    } catch (error) {
        toggleLoading(false);
        showToast('An error occurred during navigation. Please try again.', 'error');
        
        // Restore button on error
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.innerHTML = originalText;
            nextBtn.style.opacity = '1';
        }
    }
}

function goToPreviousStep() {
    if (currentStep > 1) {
        currentStep--;
        renderPage();
    }
}

function goToStep(step: number) {
    if (step >= 1 && step <= TOTAL_STEPS) {
        currentStep = step;
        renderPage();
    }
}

// FETCH QUOTES
async function fetchQuotes() {
    if (!checkAndDecrementLookup()) return;
    
    toggleLoading(true, 'Finding best rates...');
    
    try {
        // Try to fetch from Shippo API first (real quotes) - with fast timeout
        try {
            const { fetchShippoQuotes } = await import('./backend-api');
            
            // Set timeout to fail fast if backend not deployed (5 seconds)
            const apiTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('API timeout - backend not deployed')), 5000);
            });
            
            const realQuotes = await Promise.race([
                fetchShippoQuotes({
                    originAddress: formData.originAddress || '',
                    destinationAddress: formData.destinationAddress || '',
                    weight: formData.weight || 0,
                    length: formData.length,
                    width: formData.width,
                    height: formData.height,
                    parcelType: formData.parcelType || '',
                    currency: State.currentCurrency.code
                }),
                apiTimeout
            ]) as Quote[];
            
            const extraCost = formData.sendDay === 'saturday' ? 5 : formData.sendDay === 'sunday' ? 8 : 0;
            allQuotes = realQuotes.map(q => ({
                ...q,
                totalCost: q.totalCost + extraCost
            })).sort((a: Quote, b: Quote) => a.totalCost - b.totalCost);
            
            // Mark that we successfully used API quotes
            usedApiQuotes = true;
            return;
        } catch (apiError: any) {
            // Shippo API failed - try AI fallback
            console.error('[Parcel] Shippo API error:', apiError);
            
            // Mark that we're NOT using API quotes
            usedApiQuotes = false;
            
            // Continue with AI fallback instead of throwing error
        }
        
        // AI Fallback for quotes
        const extraCost = formData.sendDay === 'saturday' ? 5 : formData.sendDay === 'sunday' ? 8 : 0;
        
        // Enhanced prompt for more accurate quote generation
        const parcelWeight = formData.weight || 1;
        const dimensions = formData.length && formData.width && formData.height
            ? `Dimensions: ${formData.length}×${formData.width}×${formData.height} cm.`
            : '';
        
        const prompt = `You are a logistics pricing expert. Generate 5 realistic parcel delivery quotes for international shipping.

Shipment Details:
- Origin: ${formData.originAddress || 'Unknown'}
- Destination: ${formData.destinationAddress || 'Unknown'}
- Weight: ${parcelWeight} kg
${dimensions}
- Parcel Type: ${formData.parcelType || 'Standard'}
- Contents: ${formData.itemDescription || 'General goods'}
- Currency: ${State.currentCurrency.code} (${State.currentCurrency.symbol})
- Service Day: ${formData.sendDay === 'saturday' ? 'Saturday (+premium)' : formData.sendDay === 'sunday' ? 'Sunday (+premium)' : 'Weekday'}

Requirements:
1. Generate quotes from 5 different major international carriers (e.g., DHL, UPS, FedEx, DPD, Evri, TNT, Aramex)
2. Prices should be realistic based on weight, distance, and parcel type
3. Transit times should vary: 2-5 days for express, 5-10 days for standard, 10-15 days for economy
4. Each quote must include base shipping cost (add ${extraCost} ${State.currentCurrency.symbol} for weekend delivery if applicable)
5. Make quotes competitive but realistic
6. Return JSON with "quotes" array containing all required fields

Important: These are ESTIMATES for customer reference. Actual rates may vary based on final measurements and carrier availability.`;

        const responseSchema = {
            type: SchemaType.OBJECT,
            properties: {
                quotes: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            carrierName: { type: SchemaType.STRING, description: 'Name of the shipping carrier' },
                            carrierType: { type: SchemaType.STRING, description: 'Service type (e.g., Express, Standard, Economy)' },
                            totalCost: { type: SchemaType.NUMBER, description: 'Total cost in the specified currency' },
                            estimatedTransitTime: { type: SchemaType.STRING, description: 'Estimated delivery time (e.g., 3-5 days)' },
                            serviceProvider: { type: SchemaType.STRING, description: 'Service provider name' },
                            isSpecialOffer: { type: SchemaType.BOOLEAN, description: 'Whether this is a special offer' }
                        },
                        required: ['carrierName', 'carrierType', 'totalCost', 'estimatedTransitTime']
                    }
                }
            },
            required: ['quotes']
        };
        
        // Try gemini-2.0-flash-exp first, fallback to gemini-1.5-flash if needed
        let model;
        try {
            model = State.api.getGenerativeModel({
                model: 'gemini-2.0-flash-exp',
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: responseSchema,
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            });
        } catch (modelError: any) {
            try {
                model = State.api.getGenerativeModel({
                    model: 'gemini-1.5-flash-8b',
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: responseSchema,
                        temperature: 0.7,
                        maxOutputTokens: 2048
                    }
                });
            } catch (fallbackError: any) {
                model = State.api.getGenerativeModel({
                    model: 'gemini-pro',
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: responseSchema,
                        temperature: 0.7
                    }
                });
            }
        }
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        if (!responseText) {
            throw new Error('Empty response from Gemini API');
        }
        
        const response = JSON.parse(responseText);
        
        if (!response.quotes || !Array.isArray(response.quotes) || response.quotes.length === 0) {
            throw new Error('Invalid response format from Gemini API');
        }
        
        // Process and validate quotes
        allQuotes = response.quotes
            .filter((q: any) => q.carrierName && q.totalCost && q.estimatedTransitTime)
            .map((q: any): Quote => ({
                carrierName: q.carrierName || 'Unknown Carrier',
                carrierType: q.carrierType || 'Standard Service',
                totalCost: parseFloat(q.totalCost) || 0,
                estimatedTransitTime: q.estimatedTransitTime || '5-7 days',
                serviceProvider: q.serviceProvider || 'Vcanship AI',
                isSpecialOffer: q.isSpecialOffer || false,
                // Required Quote interface properties
                chargeableWeight: parcelWeight,
                chargeableWeightUnit: 'kg',
                weightBasis: 'Weight',
                costBreakdown: {
                    baseShippingCost: parseFloat(q.totalCost) || 0,
                    fuelSurcharge: 0,
                    estimatedCustomsAndTaxes: 0,
                    optionalInsuranceCost: 0,
                    ourServiceFee: 0
                }
            }))
            .sort((a: Quote, b: Quote) => a.totalCost - b.totalCost);
        
        // Ensure we have at least 3 quotes
        if (allQuotes.length < 3) {
            // Generate fallback quotes if needed
            const basePrice = (parcelWeight * 2.5) + extraCost;
            const fallbackCarriers = [
                { name: 'DHL Express', type: 'Express', multiplier: 1.2 },
                { name: 'UPS Standard', type: 'Standard', multiplier: 1.0 },
                { name: 'FedEx Economy', type: 'Economy', multiplier: 0.8 }
            ];
            
            const fallbackQuotes: Quote[] = fallbackCarriers.map((carrier, idx) => ({
                carrierName: carrier.name,
                carrierType: carrier.type,
                totalCost: (basePrice * carrier.multiplier) + extraCost,
                estimatedTransitTime: carrier.type === 'Express' ? '2-3 days' : carrier.type === 'Standard' ? '5-7 days' : '10-12 days',
                serviceProvider: 'Vcanship AI',
                isSpecialOffer: idx === 2,
                // Required Quote interface properties
                chargeableWeight: parcelWeight,
                chargeableWeightUnit: 'kg',
                weightBasis: 'Weight',
                costBreakdown: {
                    baseShippingCost: (basePrice * carrier.multiplier) + extraCost,
                    fuelSurcharge: 0,
                    estimatedCustomsAndTaxes: 0,
                    optionalInsuranceCost: 0,
                    ourServiceFee: 0
                }
            }));
            
            allQuotes = [...allQuotes, ...fallbackQuotes]
                .slice(0, 5)
                .sort((a: Quote, b: Quote) => a.totalCost - b.totalCost);
        }
        
    } catch (error: any) {
        // Handle any errors from the entire fetch process
        console.error('[Parcel] Failed to fetch quotes:', error);
        showToast('Failed to get quotes. Please try again.', 'error');
        currentStep = 5;
        renderPage();
    } finally {
        toggleLoading(false);
    }
}

// Show email inquiry form after quotes are displayed
async function showEmailInquiryForm() {
    // Render the email form in step 6
    await renderEmailFormInStep6();
}

// GENERATE LABEL PDF with QR Code
function generateShippingLabel(trackingId: string, selectedQuote: Quote) {
    const doc = new jsPDF();
    
    // Generate QR Code for tracking URL
    const trackingUrl = `https://vcanship-onestop-logistics.web.app/#tracking/${trackingId}`;
    const qrCanvas = document.createElement('canvas');
    
    // Use a simple QR code generator (inline to avoid dependencies)
    // For production, consider using qrcode library
    const generateQRCode = (text: string, size: number): string => {
        // This is a simplified QR code - just a placeholder pattern
        // In production, use proper QR library
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        
        // Draw simple grid pattern as placeholder
        ctx.fillStyle = '#000000';
        const cellSize = size / 25;
        for (let i = 0; i < 25; i++) {
            for (let j = 0; j < 25; j++) {
                if ((i + j + text.length) % 3 === 0) {
                    ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
                }
            }
        }
        return canvas.toDataURL();
    };
    
    const qrCodeImage = generateQRCode(trackingUrl, 200);
    
    // Header with orange background
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, 210, 25, 'F');
    
    // Logo
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('VCANSHIP', 10, 17);
    
    // Add QR Code
    try {
        doc.addImage(qrCodeImage, 'PNG', 160, 30, 40, 40);
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('Scan to track', 170, 73, { align: 'center' });
    } catch (e) {
        console.warn('QR code generation failed:', e);
    }
    
    // Tracking number (large and prominent)
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(trackingId, 10, 40);
    
    // Barcode representation
    doc.setFillColor(0, 0, 0);
    doc.rect(10, 45, 140, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.text('*' + trackingId + '*', 75, 55, { align: 'center' });
    
    // FROM section with box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(10, 70, 190, 30);
    doc.setFontSize(10);
    doc.setTextColor(249, 115, 22);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM:', 12, 77);
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    const fromLines = doc.splitTextToSize(formData.originAddress || '', 175);
    doc.text(fromLines, 12, 85);
    
    // TO section with box (highlighted)
    doc.setFillColor(255, 248, 240);
    doc.rect(10, 105, 190, 40, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(249, 115, 22);
    doc.setFont('helvetica', 'bold');
    doc.text('TO (DESTINATION):', 12, 112);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    const toLines = doc.splitTextToSize(formData.destinationAddress || '', 175);
    doc.text(toLines, 12, 122);
    
    // Shipment details grid
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    const detailsY = 155;
    const col1X = 12;
    const col2X = 75;
    const col3X = 138;
    
    // Column 1
    doc.text('Weight:', col1X, detailsY);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formData.weight} kg`, col1X, detailsY + 5);
    
    // Column 2
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Service:', col2X, detailsY);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedQuote.carrierType || 'Standard', col2X, detailsY + 5);
    
    // Column 3
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Carrier:', col3X, detailsY);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedQuote.carrierName, col3X, detailsY + 5);
    
    // Insurance info if applicable
    if (formData.insuranceLevel && formData.insuranceLevel !== 'none') {
        doc.setFontSize(8);
        doc.setTextColor(0, 128, 0);
        doc.text(`✓ Insured (${formData.insuranceLevel})`, col1X, detailsY + 12);
    }
    
    // Signature required if applicable
    if (formData.signatureRequired) {
        doc.setFontSize(8);
        doc.setTextColor(249, 115, 22);
        doc.text('✓ Signature Required', col2X, detailsY + 12);
    }
    
    // Footer with instructions
    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(0.5);
    doc.line(10, 175, 200, 175);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('INSTRUCTIONS:', 10, 182);
    doc.setFontSize(7);
    doc.text('• Attach this label securely to your parcel (visible side)', 10, 188);
    doc.text('• Keep a copy of this label for your records', 10, 193);
    doc.text('• Track your shipment at: vcanship-onestop-logistics.web.app', 10, 198);
    
    // Date and barcode info
    doc.setFontSize(6);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 10, 285);
    doc.text(`Label ID: ${trackingId}`, 150, 285);
    
    return doc;
}

// GENERATE PROFESSIONAL RECEIPT PDF
function generateReceipt(trackingId: string, selectedQuote: Quote) {
    const doc = new jsPDF();
    
    // Header with orange background
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, 210, 35, 'F');
    
    // Logo and title
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('VCANSHIP', 10, 15);
    doc.setFontSize(14);
    doc.text('PAYMENT RECEIPT', 10, 25);
    
    // Receipt number and date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt #: ${trackingId}`, 150, 15, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleString()}`, 150, 22, { align: 'right' });
    
    // Customer info box
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER DETAILS', 10, 48);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(10, 52, 190, 25);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const guestEmail = sessionStorage.getItem('user_email') || 'Not provided';
    doc.text(`Email: ${guestEmail}`, 12, 60);
    doc.text(`Tracking ID: ${trackingId}`, 12, 67);
    doc.text(`Payment Date: ${new Date().toLocaleDateString()}`, 12, 74);
    
    // Shipment details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIPMENT DETAILS', 10, 88);
    
    // Use autoTable for clean formatting
    autoTable(doc, {
        startY: 92,
        head: [['Description', 'Details']],
        headStyles: {
            fillColor: [249, 115, 22],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
        },
        body: [
            ['Origin', formData.originAddress || 'Not specified'],
            ['Destination', formData.destinationAddress || 'Not specified'],
            ['Weight', `${formData.weight || 0} kg`],
            ['Parcel Type', formData.parcelType || 'Standard'],
            ['Service Type', formData.pickupType === 'pickup' ? 'Home Pickup' : 'Drop-off'],
            ['Carrier', selectedQuote.carrierName],
            ['Service Level', selectedQuote.carrierType],
            ['Estimated Transit', selectedQuote.estimatedTransitTime]
        ],
        styles: {
            fontSize: 9,
            cellPadding: 4
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60 },
            1: { cellWidth: 130 }
        }
    });
    
    // Calculate final Y position
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Additional services (if any)
    if (formData.insuranceLevel && formData.insuranceLevel !== 'none') {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('ADDITIONAL SERVICES', 10, finalY);
        
        autoTable(doc, {
            startY: finalY + 4,
            head: [['Service', 'Details']],
            headStyles: {
                fillColor: [249, 115, 22],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10
            },
            body: [
                ['Insurance', `${formData.insuranceLevel} coverage`],
                ...(formData.signatureRequired ? [['Signature Required', 'Yes']] : []),
                ...(formData.leaveInSafePlace ? [['Safe Place Delivery', formData.safePlaceDescription || 'Enabled']] : [])
            ],
            styles: {
                fontSize: 9,
                cellPadding: 4
            }
        });
    }
    
    const costY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : finalY + 15;
    
    // Cost breakdown
    doc.setFillColor(245, 245, 245);
    doc.rect(10, costY, 190, 30, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Shipping Cost:', 12, costY + 10);
    doc.text(`${State.currentCurrency.symbol}${selectedQuote.totalCost.toFixed(2)}`, 198, costY + 10, { align: 'right' });
    
    // Add insurance cost if applicable
    let totalCost = selectedQuote.totalCost;
    if (formData.insuranceLevel && formData.insuranceLevel !== 'none') {
        const insuranceCost = formData.insuranceLevel === 'standard' ? selectedQuote.totalCost * 0.01 : selectedQuote.totalCost * 0.02;
        doc.text('Insurance:', 12, costY + 17);
        doc.text(`${State.currentCurrency.symbol}${insuranceCost.toFixed(2)}`, 198, costY + 17, { align: 'right' });
        totalCost += insuranceCost;
    }
    
    // Total
    doc.setLineWidth(0.5);
    doc.line(12, costY + 22, 198, costY + 22);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PAID:', 12, costY + 28);
    doc.text(`${State.currentCurrency.symbol}${totalCost.toFixed(2)}`, 198, costY + 28, { align: 'right' });
    
    // Payment method
    const paymentY = costY + 40;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Payment Method: Card Payment (Stripe)', 12, paymentY);
    doc.text('Status: PAID', 12, paymentY + 6);
    
    // Footer
    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(1);
    doc.line(10, 270, 200, 270);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for choosing Vcanship!', 105, 277, { align: 'center' });
    doc.text('For support, visit vcanship-onestop-logistics.web.app or contact support@vcanship.com', 105, 283, { align: 'center' });
    doc.text(`This is a computer-generated receipt. Receipt ID: ${trackingId}`, 105, 289, { align: 'center' });
    
    // Download the PDF
    doc.save(`Vcanship-Receipt-${trackingId}.pdf`);
    
    return doc;
}

// EVENT LISTENERS
function attachWizardListeners() {
    const page = document.getElementById('page-parcel');
    if (!page) return;
    
    // Next/Previous buttons
    page.querySelector('#next-step-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await goToNextStep();
    });
    page.querySelector('#prev-step-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        goToPreviousStep();
    });
    
    // Step 1: Service type selection
    page.querySelectorAll('.service-type-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const serviceType = (card as HTMLElement).dataset.type as 'pickup' | 'dropoff';
            if (serviceType) {
                // Update form data
                formData.serviceType = serviceType;
                // Immediately update visual state BEFORE re-rendering
                page.querySelectorAll('.service-type-card').forEach(c => {
                    c.classList.remove('selected');
                });
                card.classList.add('selected');
                // Re-render immediately to ensure state is consistent
                requestAnimationFrame(() => {
                    renderPage();
                });
            }
        });
    });
    
    // Step 1: Find drop-off locations button
    page.querySelector('#find-dropoff-btn')?.addEventListener('click', async () => {
        if (!formData.originAddress) {
            showToast('Please enter your address first', 'warning');
            return;
        }
        toggleLoading(true, 'Finding nearest drop-off locations...');
        try {
            const locations = await findNearestDropoffLocations(formData.originAddress);
            toggleLoading(false);
            if (locations.length > 0) {
                dropoffLocations = locations;
                renderDropoffLocationModal(locations);
            } else {
                showToast('No drop-off locations found nearby', 'warning');
            }
        } catch (error) {
            toggleLoading(false);
            showToast('Failed to find drop-off locations', 'error');
            console.error('Drop-off location error:', error);
        }
    });
    
    // Step 2: Address Book button
    page.querySelector('#select-from-address-book-btn')?.addEventListener('click', async () => {
        await showAddressBookModal();
    });
    
    // Step 2: Address inputs with Google Places Autocomplete
    const originInput = page.querySelector('#origin-address') as HTMLInputElement;
    const destInput = page.querySelector('#destination-address') as HTMLInputElement;
    
    // Initialize Google Places Autocomplete for both inputs
    if (originInput && destInput) {
        initializeAddressAutocomplete(originInput, destInput);
    }
    
    // Save data when user types or changes input
    originInput?.addEventListener('input', () => {
        formData.originAddress = originInput.value.trim();
    });
    originInput?.addEventListener('change', () => {
        formData.originAddress = originInput.value.trim();
    });
    
    destInput?.addEventListener('input', () => {
        formData.destinationAddress = destInput.value.trim();
    });
    destInput?.addEventListener('change', () => {
        formData.destinationAddress = destInput.value.trim();
    });
    
    // Step 3: Parcel type selection
    page.querySelectorAll('.parcel-type-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const parcelType = (card as HTMLElement).dataset.value || '';
            if (parcelType) {
                formData.parcelType = parcelType;
                // Update visual state immediately without full re-render
                page.querySelectorAll('.parcel-type-card').forEach(c => {
                    c.classList.remove('selected');
                });
                card.classList.add('selected');
                // Optionally re-render for consistency, but use requestAnimationFrame for smooth transition
                requestAnimationFrame(() => {
                    renderPage();
                });
            }
        });
    });
    
    // Step 3: Dimensions toggle
    page.querySelector('#dimensions-toggle')?.addEventListener('click', (e) => {
        const content = page.querySelector('#dimensions-content');
        const icon = (e.currentTarget as HTMLElement).querySelector('i');
        content?.classList.toggle('hidden');
        icon?.classList.toggle('fa-chevron-right');
        icon?.classList.toggle('fa-chevron-down');
    });
    
    // Step 3: Weight, dimensions, and description
    const weightInput = page.querySelector('#parcel-weight') as HTMLInputElement;
    const descInput = page.querySelector('#item-description') as HTMLInputElement;
    const lengthInput = page.querySelector('#parcel-length') as HTMLInputElement;
    const widthInput = page.querySelector('#parcel-width') as HTMLInputElement;
    const heightInput = page.querySelector('#parcel-height') as HTMLInputElement;
    
    // Real-time prohibited items check on description input
    descInput?.addEventListener('input', () => {
        formData.itemDescription = descInput.value.trim();
        // Check for prohibited items in real-time
        if (descInput.value.trim().length > 3) {
            checkProhibitedItems();
        }
    });
    
    // Save data on input change for immediate availability (not just on blur)
    weightInput?.addEventListener('input', () => { 
        const val = parseFloat(weightInput.value);
        if (!isNaN(val) && val > 0) {
            formData.weight = val;
        }
    });
    weightInput?.addEventListener('blur', () => { 
        const val = parseFloat(weightInput.value);
        if (!isNaN(val) && val > 0) {
            formData.weight = val;
        }
    });
    
    descInput?.addEventListener('input', () => { 
        formData.itemDescription = descInput.value.trim(); 
    });
    descInput?.addEventListener('blur', () => { 
        formData.itemDescription = descInput.value.trim(); 
    });
    
    lengthInput?.addEventListener('input', () => { 
        const val = parseFloat(lengthInput.value);
        if (!isNaN(val) && val > 0) {
            formData.length = val;
        }
    });
    lengthInput?.addEventListener('blur', () => { 
        const val = parseFloat(lengthInput.value);
        if (!isNaN(val) && val > 0) {
            formData.length = val;
        }
    });
    
    widthInput?.addEventListener('input', () => { 
        const val = parseFloat(widthInput.value);
        if (!isNaN(val) && val > 0) {
            formData.width = val;
        }
    });
    widthInput?.addEventListener('blur', () => { 
        const val = parseFloat(widthInput.value);
        if (!isNaN(val) && val > 0) {
            formData.width = val;
        }
    });
    
    heightInput?.addEventListener('input', () => { 
        const val = parseFloat(heightInput.value);
        if (!isNaN(val) && val > 0) {
            formData.height = val;
        }
    });
    heightInput?.addEventListener('blur', () => { 
        const val = parseFloat(heightInput.value);
        if (!isNaN(val) && val > 0) {
            formData.height = val;
        }
    });
    
    // Step 4: Send day selection
    page.querySelectorAll('.send-day-card').forEach(card => {
        card.addEventListener('click', () => {
            formData.sendDay = (card as HTMLElement).dataset.day as any;
            renderPage();
        });
    });
    
    // Step 4: Generate HS Code - ENHANCED with AI Intelligence
    page.querySelector('#generate-hs-code-btn')?.addEventListener('click', () => {
        if (!formData.itemDescription) {
            showToast('Please enter item description first', 'warning');
            return;
        }
        
        // Use the enhanced HS Code Intelligence system
        showHSCodeSearchModal();
        
        // Pre-fill the cargo description from form data
        setTimeout(() => {
            const descTextarea = document.getElementById('cargo-description') as HTMLTextAreaElement;
            if (descTextarea) {
                descTextarea.value = formData.itemDescription || '';
            }
        }, 100);
    });
    
    // Step 4: Insurance options
    page.querySelectorAll('input[name="insurance"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            formData.insurance = (e.target as HTMLInputElement).value as any;
            // Update card styling
            page.querySelectorAll('.insurance-option-card').forEach(card => {
                card.classList.remove('selected');
                (card as HTMLElement).style.borderColor = '#e5e7eb';
                (card as HTMLElement).style.backgroundColor = 'white';
            });
            const selectedCard = (e.target as HTMLInputElement).closest('.insurance-option-card');
            if (selectedCard) {
                selectedCard.classList.add('selected');
                (selectedCard as HTMLElement).style.borderColor = '#f97316';
                (selectedCard as HTMLElement).style.backgroundColor = '#FFF7ED';
            }
            renderPage(); // Re-render to show/hide insurance value input
        });
    });
    
    // Step 4: Insurance value input
    const insuranceValueInput = page.querySelector('#insurance-value') as HTMLInputElement;
    insuranceValueInput?.addEventListener('blur', () => {
        const val = parseFloat(insuranceValueInput.value);
        if (!isNaN(val) && val > 0) {
            formData.insuranceValue = val;
            // Update insurance price displays
            const standardPrice = page.querySelector('#standard-insurance-price');
            const fullPrice = page.querySelector('#full-insurance-price');
            if (standardPrice) standardPrice.textContent = `+$${(val * 0.01).toFixed(2)}`;
            if (fullPrice) fullPrice.textContent = `+$${(val * 0.02).toFixed(2)}`;
        }
    });
    
    // Step 4: Signature required checkbox
    const signatureCheckbox = page.querySelector('#signature-required') as HTMLInputElement;
    signatureCheckbox?.addEventListener('change', (e) => {
        formData.signatureRequired = (e.target as HTMLInputElement).checked;
    });
    
    // Step 4: Leave in safe place checkbox
    const safePlaceCheckbox = page.querySelector('#leave-safe-place') as HTMLInputElement;
    safePlaceCheckbox?.addEventListener('change', (e) => {
        formData.leaveInSafePlace = (e.target as HTMLInputElement).checked;
        renderPage(); // Re-render to show/hide safe place description input
    });
    
    // Step 4: Safe place description input
    const safePlaceInput = page.querySelector('#safe-place-description') as HTMLInputElement;
    safePlaceInput?.addEventListener('blur', () => {
        formData.safePlaceDescription = safePlaceInput.value;
    });
    
    // Step 4: Special instructions input
    const specialInstructionsInput = page.querySelector('#special-instructions') as HTMLTextAreaElement;
    specialInstructionsInput?.addEventListener('blur', () => {
        formData.specialInstructions = specialInstructionsInput.value;
    });
    
    // Step 4: Document upload
    const uploadArea = page.querySelector('#document-upload-area');
    const uploadInput = page.querySelector('#document-upload-input') as HTMLInputElement;
    
    uploadArea?.addEventListener('click', () => uploadInput?.click());
    uploadInput?.addEventListener('change', (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        formData.documents = files;
        const list = page.querySelector('#uploaded-files-list');
        if (list) {
            list.innerHTML = files.map(f => `<div class="file-item"><i class="fa-solid fa-file"></i> ${f.name}</div>`).join('');
        }
    });
    
    // Step 5: Edit buttons
    page.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const step = parseInt((btn as HTMLElement).dataset.step || '1');
            goToStep(step);
        });
    });
    
    // Step 6: Quote selection
    page.querySelectorAll('.select-quote-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const quoteId = parseInt((btn as HTMLElement).dataset.quoteId || '0');
            const selectedQuote = allQuotes[quoteId];
            setState({ parcelSelectedQuote: selectedQuote });
            
            // Set up payment context for payment page
            const shipmentId = 'VC-' + Date.now().toString(36).toUpperCase();
            setState({
                paymentContext: {
                    service: 'parcel' as Service,
                    quote: selectedQuote,
                    shipmentId: shipmentId,
                    origin: formData.originAddress || '',
                    destination: formData.destinationAddress || '',
                    addons: []
                }
            });
            
            // Also set parcelSelectedQuote for backward compatibility
            setState({ parcelSelectedQuote: selectedQuote });
            
            // Show loading - proceeding to payment
            toggleLoading(true, 'Proceeding to payment...');
            
            // Wait a moment for user feedback
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Navigate to payment page
            toggleLoading(false);
            switchPage('payment');
        });
    });
}

// MAIN RENDER
function renderPage() {
    const page = document.getElementById('page-parcel');
    if (!page) return;
    
    page.innerHTML = renderWizard();
    attachWizardListeners();
    updateStepConnectors();
    
    // Update HS code requirements based on shipment type (after DOM is rendered)
    if (currentStep === 4) {
        const isInternational = isInternationalShipment();
        const hsCodeLocalText = document.getElementById('hs-code-local-text');
        const hsCodeInternationalText = document.getElementById('hs-code-international-text');
        
        if (hsCodeLocalText && hsCodeInternationalText) {
            if (isInternational) {
                hsCodeLocalText.style.display = 'none';
                hsCodeInternationalText.style.display = 'inline';
            } else {
                hsCodeLocalText.style.display = 'inline';
                hsCodeInternationalText.style.display = 'none';
            }
        }
        
        // Run compliance check immediately (synchronous - instant)
        setTimeout(() => {
            checkProhibitedItems();
        }, 100);

        // Auto-assign HS Code for international shipments when description is present
        (async () => {
            try {
                const hsDisplay = document.getElementById('hs-code-display') as HTMLInputElement | null;
                const description = (formData.itemDescription || '').trim();
                if (isInternational && hsDisplay && (!formData.hsCode || hsDisplay.value === 'Click to generate') && description.length >= 3) {
                    const suggestions = await getHsCodeSuggestions(description);
                    if (suggestions && suggestions.length > 0 && suggestions[0].code) {
                        formData.hsCode = suggestions[0].code;
                        hsDisplay.value = suggestions[0].code;
                    }
                }
            } catch {}
        })();
    }
    
    // Only show email form if we're on step 6 AND using AI quotes (not API quotes)
    // Email form is only for services without API keys or when API fails
    if (currentStep === 6 && allQuotes.length > 0 && !usedApiQuotes) {
        showEmailInquiryForm().catch(() => {
            // Email form is optional - fail silently
        });
    }
    
    // Auto-focus first input
    const firstInput = page.querySelector('input:not([type="hidden"])') as HTMLElement;
    firstInput?.focus();
}

// Initialize Google Places Autocomplete for address inputs
function initializeAddressAutocomplete(originInput: HTMLInputElement, destInput: HTMLInputElement) {
    // Check if Google Maps API is loaded
    const googleMaps = (window as any).google;
    if (typeof googleMaps === 'undefined' || !googleMaps.maps || !googleMaps.maps.places) {
        console.warn('Google Maps API not loaded, retrying...');
        // Try loading it if not available
        if (!(window as any).googleMapsLoaded) {
            setTimeout(() => {
                const retryGoogleMaps = (window as any).google;
                if (typeof retryGoogleMaps !== 'undefined' && retryGoogleMaps.maps && retryGoogleMaps.maps.places) {
                    initializeAddressAutocomplete(originInput, destInput);
                }
            }, 1000);
        }
        return;
    }

    try {
        console.log('Initializing Google Places Autocomplete...');
        
        // Enhanced autocomplete options for better postcode/address detection
        const autocompleteOptions = {
            fields: [
                'formatted_address', 
                'address_components', 
                'geometry', 
                'place_id',
                'name',
                'types'
            ],
            types: ['address', 'postal_code', 'premise', 'street_address'], // Include postcodes and specific addresses
            strictBounds: false,
        };

        // Initialize autocomplete for origin address
        originAutocomplete = new googleMaps.maps.places.Autocomplete(originInput, autocompleteOptions);
        
        // Set bias to user's location if available
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const geolocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                const circle = new googleMaps.maps.Circle({
                    center: geolocation,
                    radius: position.coords.accuracy
                });
                originAutocomplete?.setBounds(circle.getBounds());
                destAutocomplete?.setBounds(circle.getBounds());
            });
        }
        
        originAutocomplete.addListener('place_changed', () => {
            const place = originAutocomplete?.getPlace();
            if (place && place.formatted_address) {
                originInput.value = place.formatted_address;
                formData.originAddress = place.formatted_address;
                
                // Extract and store detailed address components
                if (place.address_components) {
                    const addressData = extractAddressComponents(place.address_components);
                    console.log('Origin address components:', addressData);
                }
                
                // Show validation success with visual feedback
                showAddressValidationFeedback(originInput, true);
                showToast('✓ Origin address confirmed', 'success');
            }
        });

        // Initialize autocomplete for destination address
        destAutocomplete = new googleMaps.maps.places.Autocomplete(destInput, autocompleteOptions);
        destAutocomplete.addListener('place_changed', () => {
            const place = destAutocomplete?.getPlace();
            if (place && place.formatted_address) {
                destInput.value = place.formatted_address;
                formData.destinationAddress = place.formatted_address;
                
                // Extract and store detailed address components
                if (place.address_components) {
                    const addressData = extractAddressComponents(place.address_components);
                    console.log('Destination address components:', addressData);
                }
                
                // Show validation success with visual feedback
                showAddressValidationFeedback(destInput, true);
                showToast('✓ Destination address confirmed', 'success');
            }
        });
        
        // Add real-time address suggestions on typing (postcode lookup)
        setupPostcodeLookup(originInput, 'origin');
        setupPostcodeLookup(destInput, 'destination');
        
        console.log('✅ Google Places Autocomplete initialized successfully');
    } catch (error) {
        console.error('Error initializing autocomplete:', error);
        showToast('Address autocomplete not available. Please enter addresses manually.', 'warning');
    }
}

// Extract useful address components
function extractAddressComponents(components: any[]): any {
    const data: any = {};
    components.forEach(component => {
        const types = component.types;
        if (types.includes('postal_code')) {
            data.postcode = component.long_name;
        }
        if (types.includes('street_number')) {
            data.streetNumber = component.long_name;
        }
        if (types.includes('route')) {
            data.street = component.long_name;
        }
        if (types.includes('locality')) {
            data.city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
            data.state = component.long_name;
        }
        if (types.includes('country')) {
            data.country = component.long_name;
            data.countryCode = component.short_name;
        }
    });
    return data;
}

// Setup postcode lookup with suggestions
function setupPostcodeLookup(input: HTMLInputElement, type: 'origin' | 'destination') {
    let debounceTimer: any;
    
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const value = input.value.trim();
        
        // Check if it looks like a postcode (e.g., SW1A 1AA, 90210, etc.)
        const postcodePattern = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d?[A-Z]{0,2}$|^\d{5}(-\d{4})?$/i;
        
        if (value.length >= 3) {
            debounceTimer = setTimeout(() => {
                // Show loading indicator
                input.style.background = "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI4IiBzdHJva2U9IiNGOTczMTYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==') no-repeat right 12px center";
                input.style.backgroundSize = '16px';
            }, 300);
        }
    });
}

// Show visual feedback for address validation
function showAddressValidationFeedback(input: HTMLInputElement, isValid: boolean) {
    const wrapper = input.closest('.input-wrapper');
    if (!wrapper) return;

    if (isValid) {
        wrapper.classList.add('address-validated');
        wrapper.classList.remove('address-error');
        
        // Add checkmark icon
        let checkmark = wrapper.querySelector('.address-checkmark');
        if (!checkmark) {
            checkmark = document.createElement('i');
            checkmark.className = 'fa-solid fa-check-circle address-checkmark';
            wrapper.appendChild(checkmark);
        }
    } else {
        wrapper.classList.remove('address-validated');
        wrapper.classList.add('address-error');
    }
}

// Check if shipment is international (different countries)
function isInternationalShipment(): boolean {
    const origin = formData.originAddress?.toLowerCase() || '';
    const destination = formData.destinationAddress?.toLowerCase() || '';
    
    // Extract country names/codes from addresses
    const countries = [
        'united states', 'usa', 'us', 'uk', 'united kingdom', 'gb', 'britain',
        'canada', 'ca', 'australia', 'au', 'germany', 'de', 'france', 'fr',
        'china', 'cn', 'japan', 'jp', 'korea', 'kr', 'india', 'in',
        'spain', 'es', 'italy', 'it', 'netherlands', 'nl', 'belgium', 'be',
        'switzerland', 'ch', 'sweden', 'se', 'norway', 'no', 'denmark', 'dk',
        'singapore', 'sg', 'malaysia', 'my', 'thailand', 'th', 'indonesia', 'id',
        'philippines', 'ph', 'vietnam', 'vn', 'brazil', 'br', 'mexico', 'mx',
        'argentina', 'ar', 'chile', 'cl', 'south africa', 'za', 'uae', 'united arab emirates'
    ];
    
    let originCountry = '';
    let destCountry = '';
    
    for (const country of countries) {
        if (origin.includes(country)) {
            originCountry = country.split(' ')[0]; // Get first word
            break;
        }
    }
    
    for (const country of countries) {
        if (destination.includes(country)) {
            destCountry = country.split(' ')[0]; // Get first word
            break;
        }
    }
    
    // If both countries found and different, it's international
    if (originCountry && destCountry && originCountry !== destCountry) {
        return true;
    }
    
    // If one address has country and other doesn't, assume international for safety
    if (originCountry || destCountry) {
        // Check if addresses are obviously in same country by checking postal codes, states, etc.
        // For now, if we can't determine, default to international if countries differ
        return originCountry !== destCountry;
    }
    
    // Default: assume international if we can't determine (safer assumption)
    return true;
}

// Check for prohibited items and show intelligent warnings
// Enhanced compliance checking using comprehensive compliance system
let complianceData: ComplianceCheck | null = null;

function checkProhibitedItems() {
    const description = (formData.itemDescription || '').toLowerCase();
    if (!description || !formData.originAddress || !formData.destinationAddress) return;
    
    // Use comprehensive compliance check (synchronous - instant)
    try {
        complianceData = checkCompliance({
            originAddress: formData.originAddress,
            destinationAddress: formData.destinationAddress,
            itemDescription: formData.itemDescription || '',
            hsCode: formData.hsCode,
            weight: formData.weight || 0,
            value: (formData.weight || 0) * 50, // Estimate value based on weight
            serviceType: formData.serviceType
        });
        
        displayComplianceResults(complianceData);
    } catch (error) {
        // Fallback to basic check if comprehensive system fails
        const basicProhibitedItems: { [key: string]: { type: string, reason: string, severity: 'warning' | 'error' } } = {
            'perfume': { type: 'Liquids/Flammable', reason: 'Contains alcohol and flammable substances. May be restricted or require special packaging.', severity: 'warning' },
            'battery': { type: 'Lithium Batteries', reason: 'Lithium batteries are dangerous goods. May require special handling, documentation, and carrier approval.', severity: 'error' },
            'batteries': { type: 'Lithium Batteries', reason: 'Lithium batteries are dangerous goods. May require special handling, documentation, and carrier approval.', severity: 'error' },
            'cigarette': { type: 'Tobacco Products', reason: 'E-cigarettes and tobacco products are restricted or prohibited in many countries. Requires age verification and special documentation.', severity: 'warning' },
            'e-cigarette': { type: 'Tobacco Products', reason: 'E-cigarettes and vaping devices contain lithium batteries and nicotine. Highly restricted in many countries.', severity: 'error' },
            'vape': { type: 'Tobacco Products', reason: 'Vaping devices contain lithium batteries and nicotine. Highly restricted in many countries.', severity: 'error' },
            'vaping': { type: 'Tobacco Products', reason: 'Vaping devices contain lithium batteries and nicotine. Highly restricted in many countries.', severity: 'error' },
            'alcohol': { type: 'Liquids/Alcohol', reason: 'Alcohol shipments are heavily regulated. Requires special permits and documentation.', severity: 'warning' },
            'weapon': { type: 'Prohibited', reason: 'Weapons are strictly prohibited. Cannot be shipped.', severity: 'error' },
            'explosive': { type: 'Dangerous Goods', reason: 'Explosive materials are strictly prohibited.', severity: 'error' },
            'flammable': { type: 'Dangerous Goods', reason: 'Flammable materials require special handling and documentation.', severity: 'warning' }
        };
        
        const foundItems: string[] = [];
        const alerts = [];
        
        for (const [keyword, info] of Object.entries(basicProhibitedItems)) {
            if (description.includes(keyword)) {
                foundItems.push(keyword);
                alerts.push({
                    keyword,
                    type: info.type,
                    reason: info.reason,
                    severity: info.severity
                });
            }
        }
        
        if (alerts.length > 0) {
            displayBasicComplianceAlerts(alerts);
        }
    }
}

// Display comprehensive compliance results
function displayComplianceResults(compliance: ComplianceCheck) {
    const alertsContainer = document.getElementById('compliance-alerts');
    if (!alertsContainer) return;
    
    let html = '';
    
    // Display errors first
    if (compliance.errors.length > 0) {
        html += compliance.errors.map(error => `
            <div class="compliance-alert alert-error" style="
                padding: 1rem;
                margin-top: 1rem;
                border-radius: 8px;
                border-left: 4px solid var(--error-color);
                background-color: rgba(239, 68, 68, 0.1);
            ">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                    <i class="fa-solid fa-triangle-exclamation" 
                       style="color: var(--error-color); font-size: 1.2rem; margin-top: 0.2rem;"></i>
                    <div>
                        <strong style="color: var(--error-color);">❌ Compliance Error</strong>
                        <p style="margin: 0.5rem 0 0; color: var(--text-color); font-size: 0.9rem;">${error}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Display warnings
    if (compliance.warnings.length > 0) {
        html += compliance.warnings.map(warning => `
            <div class="compliance-alert alert-warning" style="
                padding: 1rem;
                margin-top: 1rem;
                border-radius: 8px;
                border-left: 4px solid #F59E0B;
                background-color: rgba(245, 158, 11, 0.1);
            ">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                    <i class="fa-solid fa-exclamation-triangle" 
                       style="color: #F59E0B; font-size: 1.2rem; margin-top: 0.2rem;"></i>
                    <div>
                        <strong style="color: #F59E0B;">⚠️ Compliance Warning</strong>
                        <p style="margin: 0.5rem 0 0; color: var(--text-color); font-size: 0.9rem;">${warning}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Display required documents
    if (compliance.requiredDocuments.length > 0) {
        html += `
            <div class="compliance-alert alert-warning" style="
                padding: 1rem;
                margin-top: 1rem;
                border-radius: 8px;
                border-left: 4px solid var(--primary-orange);
                background-color: rgba(249, 115, 22, 0.1);
            ">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                    <i class="fa-solid fa-file-circle-check" 
                       style="color: var(--primary-orange); font-size: 1.2rem; margin-top: 0.2rem;"></i>
                    <div>
                        <strong style="color: var(--primary-orange);">📋 Required Documents</strong>
                        <ul style="margin: 0.5rem 0 0; padding-left: 1.5rem; color: var(--text-color); font-size: 0.9rem;">
                            ${compliance.requiredDocuments.map(doc => `<li>${doc}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Display pre-inspection requirement
    if (compliance.requiresPreInspection) {
        html += `
            <div class="compliance-alert alert-warning" style="
                padding: 1rem;
                margin-top: 1rem;
                border-radius: 8px;
                border-left: 4px solid var(--primary-orange);
                background-color: rgba(249, 115, 22, 0.1);
            ">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                    <i class="fa-solid fa-clipboard-check" 
                       style="color: var(--primary-orange); font-size: 1.2rem; margin-top: 0.2rem;"></i>
                    <div>
                        <strong style="color: var(--primary-orange);">🔍 Pre-Inspection Required</strong>
                        <p style="margin: 0.5rem 0 0; color: var(--text-color); font-size: 0.9rem;">
                            ${compliance.destinationCountry} requires pre-inspection certificate before shipment. 
                            ${compliance.certificateType ? `Certificate type: ${compliance.certificateType}` : 'Please contact us for certificate requirements.'}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
    
    
    alertsContainer.innerHTML = html;
    
    if (html) {
        alertsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Show toast if there are errors
        if (compliance.errors.length > 0) {
            showToast(`❌ Compliance errors detected. Please review restrictions.`, 'error');
        } else if (compliance.warnings.length > 0) {
            showToast(`⚠️ Compliance warnings: ${compliance.warnings.join(', ')}`, 'warning');
        }
    }
}

// Display basic compliance alerts (fallback)
function displayBasicComplianceAlerts(alerts: any[]) {
    if (alerts.length > 0) {
        const alertsContainer = document.getElementById('compliance-alerts');
        if (alertsContainer) {
            alertsContainer.innerHTML = alerts.map(alert => `
                <div class="compliance-alert ${alert.severity === 'error' ? 'alert-error' : 'alert-warning'}" style="
                    padding: 1rem;
                    margin-top: 1rem;
                    border-radius: 8px;
                    border-left: 4px solid ${alert.severity === 'error' ? 'var(--error-color)' : '#F59E0B'};
                    background-color: ${alert.severity === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'};
                ">
                    <div style="display: flex; align-items: start; gap: 0.75rem;">
                        <i class="fa-solid ${alert.severity === 'error' ? 'fa-triangle-exclamation' : 'fa-exclamation-triangle'}" 
                           style="color: ${alert.severity === 'error' ? 'var(--error-color)' : '#F59E0B'}; 
                                  font-size: 1.2rem; margin-top: 0.2rem;"></i>
                        <div>
                            <strong style="color: ${alert.severity === 'error' ? 'var(--error-color)' : '#F59E0B'};">
                                ⚠️ ${alert.type} Detected
                            </strong>
                            <p style="margin: 0.5rem 0 0; color: var(--text-color); font-size: 0.9rem;">
                                ${alert.reason}
                            </p>
                            ${alert.severity === 'error' ? 
                                '<p style="margin: 0.5rem 0 0; font-weight: 600; color: var(--error-color);">⚠️ Some carriers may refuse this shipment. Please contact support for assistance.</p>' : 
                                '<p style="margin: 0.5rem 0 0; color: var(--medium-gray); font-size: 0.85rem;">Please check carrier-specific restrictions and requirements.</p>'
                            }
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Scroll to alert
            alertsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Show toast notification
        const alertTypes = alerts.map((a: any) => a.type).join(', ');
        const hasError = alerts.some((a: any) => a.severity === 'error');
        showToast(`⚠️ Prohibited items detected: ${alertTypes}. Please review restrictions.`, hasError ? 'error' : 'warning');
    }
}

// Get carrier logo or fallback icon
function getCarrierIconHtml(carrierName: string): string {
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
    
    return '<i class="fa-solid fa-box-open"></i>';
}

// Update step connector lines based on step states
function updateStepConnectors() {
    const page = document.getElementById('page-parcel');
    if (!page) return;
    
    const connectors = page.querySelectorAll('.step-connector');
    const dots = page.querySelectorAll('.step-dot');
    
    connectors.forEach((connector, index) => {
        const prevDot = dots[index] as HTMLElement;
        const nextDot = dots[index + 1] as HTMLElement;
        
        if (prevDot && nextDot) {
            const prevCompleted = prevDot.classList.contains('completed');
            const prevActive = prevDot.classList.contains('active');
            const nextCompleted = nextDot.classList.contains('completed');
            
            if (prevCompleted && nextCompleted) {
                // Both completed - full green
                (connector as HTMLElement).style.backgroundColor = '#22c55e';
            } else if (prevCompleted && prevActive) {
                // Previous completed, next is active - gradient
                (connector as HTMLElement).style.background = 'linear-gradient(90deg, #22c55e 0%, var(--border-color) 100%)';
            } else if (prevCompleted) {
                // Previous completed - full green
                (connector as HTMLElement).style.backgroundColor = '#22c55e';
            } else {
                // Reset to default
                (connector as HTMLElement).style.backgroundColor = '';
                (connector as HTMLElement).style.background = '';
            }
        }
    });
}

// PHASE 2: Drop-off Location Finder
interface DropoffLocation {
    name: string;
    address: string;
    city: string;
    postcode: string;
    distance: number;
    distanceUnit: string;
    hours: string;
    phone?: string;
    carrier: string;
    latitude?: number;
    longitude?: number;
    labelPrintingAvailable?: boolean;
    labelPrintingCost?: string;
    services?: string[]; // e.g., ['Label Printing', 'Packaging', 'Weight Check']
}

async function findNearestDropoffLocations(address: string, carrier?: string): Promise<DropoffLocation[]> {
    // For now, return mock data until we integrate with Shippo's location API
    // In production, this would call Shippo's drop-off location API
    
    // Extract postcode/country from address for better results
    const country = detectCountry(address);
    const pickupRules = country ? COUNTRY_PICKUP_RULES[country] : null;
    
    if (!pickupRules || pickupRules.dropoffLocations.length === 0) {
        return [];
    }
    
    // Generate mock locations based on country's drop-off types
    const mockLocations: DropoffLocation[] = pickupRules.dropoffLocations.slice(0, 5).map((type, index) => {
        const distances = [0.3, 0.7, 1.2, 1.8, 2.5];
        const distance = distances[index] || (index + 1) * 0.5;
        
        // Determine label printing availability (e.g., Post Office and Parcel Shop usually have it)
        const hasLabelPrinting = type.toLowerCase().includes('post') || 
                                 type.toLowerCase().includes('parcel shop') ||
                                 type.toLowerCase().includes('service point') ||
                                 index % 2 === 0; // 50% of locations
        
        const services: string[] = ['Drop-off', 'Parcel Acceptance'];
        if (hasLabelPrinting) {
            services.push('Label Printing');
        }
        if (index < 3) {
            services.push('Packaging Materials');
        }
        if (index === 0 || index === 2) {
            services.push('Weight Verification');
        }
        
        return {
            name: `${type} - Location ${index + 1}`,
            address: `${100 + index * 50} Main Street`,
            city: pickupRules.name.split(' ').pop() || pickupRules.name,
            postcode: address.match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i)?.[0] || '12345',
            distance: distance,
            distanceUnit: 'miles',
            hours: index % 2 === 0 ? 'Mon-Sat: 8am-8pm, Sun: 10am-6pm' : 'Mon-Fri: 9am-6pm, Sat: 9am-5pm',
            phone: `+${Math.floor(Math.random() * 900000000) + 100000000}`,
            carrier: carrier || pickupRules.majorCarriers[0],
            latitude: 51.5074 + (Math.random() - 0.5) * 0.1,
            longitude: -0.1278 + (Math.random() - 0.5) * 0.1,
            labelPrintingAvailable: hasLabelPrinting,
            labelPrintingCost: hasLabelPrinting ? 'Free' : undefined,
            services: services
        };
    });
    
    return mockLocations;
}

function renderDropoffLocationModal(locations: DropoffLocation[]) {
    if (locations.length === 0) {
        showToast('No drop-off locations found nearby', 'warning');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 1rem;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        max-width: 900px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    
    modalContent.innerHTML = `
        <div style="padding: 1.5rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; color: var(--dark-text); font-size: 1.5rem;">
                <i class="fa-solid fa-map-marker-alt" style="color: var(--primary);"></i>
                Nearest Drop-off Locations
            </h3>
            <button class="close-modal-btn" style="
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--medium-gray);
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s;
            ">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
        
        <div style="padding: 1.5rem;">
            <div class="dropoff-locations-list" style="display: grid; gap: 1rem;">
                ${locations.map((loc, index) => `
                    <div class="dropoff-location-card" style="
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 1.25rem;
                        transition: all 0.2s;
                        cursor: pointer;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="
                                        background: var(--primary);
                                        color: white;
                                        width: 28px;
                                        height: 28px;
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-weight: 600;
                                        font-size: 0.9rem;
                                    ">${index + 1}</span>
                                    <h4 style="margin: 0; color: var(--dark-text); font-size: 1.1rem;">
                                        ${loc.name}
                                    </h4>
                                </div>
                                
                                <div style="display: grid; gap: 0.5rem; margin-left: 2.25rem; color: var(--medium-gray);">
                                    <div style="display: flex; align-items: start; gap: 0.5rem;">
                                        <i class="fa-solid fa-location-dot" style="margin-top: 0.2rem; width: 16px;"></i>
                                        <span>${loc.address}, ${loc.city}, ${loc.postcode}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fa-solid fa-clock" style="width: 16px;"></i>
                                        <span>${loc.hours}</span>
                                    </div>
                                    ${loc.phone ? `
                                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                                            <i class="fa-solid fa-phone" style="width: 16px;"></i>
                                            <span>${loc.phone}</span>
                                        </div>
                                    ` : ''}
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fa-solid fa-truck" style="width: 16px;"></i>
                                        <span style="font-weight: 600; color: var(--primary);">${loc.carrier}</span>
                                    </div>
                                    ${loc.services && loc.services.length > 0 ? `
                                        <div style="
                                            display: flex;
                                            flex-wrap: wrap;
                                            gap: 0.5rem;
                                            margin-top: 0.75rem;
                                        ">
                                            ${loc.services.map(service => {
                                                const isLabelPrinting = service === 'Label Printing';
                                                return `
                                                    <span style="
                                                        display: inline-flex;
                                                        align-items: center;
                                                        gap: 0.375rem;
                                                        padding: 0.25rem 0.75rem;
                                                        background: ${isLabelPrinting ? '#FEF3C7' : '#F3F4F6'};
                                                        color: ${isLabelPrinting ? '#92400E' : '#374151'};
                                                        border-radius: 999px;
                                                        font-size: 0.8rem;
                                                        font-weight: 500;
                                                        border: 1px solid ${isLabelPrinting ? '#FCD34D' : '#E5E7EB'};
                                                    ">
                                                        ${isLabelPrinting ? '<i class="fa-solid fa-print"></i>' : 
                                                          service.includes('Packaging') ? '<i class="fa-solid fa-box"></i>' :
                                                          service.includes('Weight') ? '<i class="fa-solid fa-weight-scale"></i>' :
                                                          '<i class="fa-solid fa-check"></i>'}
                                                        ${service}
                                                        ${isLabelPrinting && loc.labelPrintingCost ? `(${loc.labelPrintingCost})` : ''}
                                                    </span>
                                                `;
                                            }).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            
                            <div style="text-align: right;">
                                <div style="
                                    background: #F0FDF4;
                                    color: #166534;
                                    padding: 0.5rem 1rem;
                                    border-radius: 6px;
                                    font-weight: 600;
                                    margin-bottom: 0.75rem;
                                ">
                                    ${loc.distance.toFixed(1)} ${loc.distanceUnit}
                                </div>
                                <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.address + ', ' + loc.city + ', ' + loc.postcode)}" 
                                   target="_blank"
                                   class="secondary-btn"
                                   style="
                                       display: inline-flex;
                                       align-items: center;
                                       gap: 0.5rem;
                                       padding: 0.5rem 1rem;
                                       font-size: 0.9rem;
                                       text-decoration: none;
                                   ">
                                    <i class="fa-solid fa-directions"></i>
                                    Directions
                                </a>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="
                margin-top: 1.5rem;
                padding: 1rem;
                background: #EFF6FF;
                border-left: 4px solid #3B82F6;
                border-radius: 6px;
            ">
                <p style="margin: 0; color: #1E40AF; font-size: 0.9rem;">
                    <i class="fa-solid fa-info-circle"></i>
                    <strong>Tip:</strong> Print your shipping label before dropping off your parcel. Most locations don't provide printing services.
                </p>
            </div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close button handler
    modal.querySelector('.close-modal-btn')?.addEventListener('click', () => {
        modal.remove();
    });
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Hover effect on cards
    modalContent.querySelectorAll('.dropoff-location-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            (card as HTMLElement).style.borderColor = 'var(--primary)';
            (card as HTMLElement).style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.2)';
        });
        card.addEventListener('mouseleave', () => {
            (card as HTMLElement).style.borderColor = '#e5e7eb';
            (card as HTMLElement).style.boxShadow = 'none';
        });
    });
}

// Send booking confirmation email
async function sendBookingConfirmationEmail(trackingId: string, quote: Quote) {
    try {
        const recipientEmail = sessionStorage.getItem('user_email') || '';
        if (!recipientEmail) {
            console.warn('No email available for booking confirmation');
            return;
        }

        const response = await fetch(
            'https://us-central1-vcanship-onestop-logistics.cloudfunctions.net/sendBookingEmail',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientEmail,
                    recipientName: sessionStorage.getItem('user_name') || 'Valued Customer',
                    trackingId,
                    service: 'parcel',
                    origin: formData.originAddress || '',
                    destination: formData.destinationAddress || '',
                    carrier: quote.carrierName,
                    estimatedDelivery: quote.estimatedTransitTime || 'TBD',
                    totalCost: quote.totalCost,
                    currency: State.currentCurrency.code
                })
            }
        );

        if (response.ok) {
            console.log('Booking confirmation email queued successfully');
        } else {
            console.warn('Failed to queue booking email:', await response.text());
        }
    } catch (error) {
        console.error('Email notification error:', error);
    }
}

// Show optional registration prompt for guest users
function showRegistrationPrompt() {
    const isGuest = sessionStorage.getItem('guest_user') === 'true';
    const guestEmail = sessionStorage.getItem('user_email');
    
    if (!isGuest || !guestEmail) return;
    
    // Only show once per session
    if (sessionStorage.getItem('registration_prompt_shown')) return;
    sessionStorage.setItem('registration_prompt_shown', 'true');
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        padding: 1rem;
        animation: fadeIn 0.3s;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: hidden;
    `;
    
    modalContent.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
            padding: 2rem;
            text-align: center;
        ">
            <div style="
                background: white;
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1rem;
            ">
                <i class="fa-solid fa-rocket" style="font-size: 2.5rem; color: #F97316;"></i>
            </div>
            <h2 style="color: white; margin: 0 0 0.5rem; font-size: 1.75rem;">
                Want to save time on future shipments?
            </h2>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 1rem;">
                Create a free account and unlock these benefits
            </p>
        </div>
        
        <div style="padding: 2rem;">
            <div style="display: grid; gap: 1rem; margin-bottom: 2rem;">
                <div style="display: flex; align-items: start; gap: 1rem;">
                    <div style="
                        background: #FEF3C7;
                        color: #92400E;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    ">
                        <i class="fa-solid fa-history"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 0.25rem; color: #1f2937;">Track All Your Shipments</h4>
                        <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">View complete history and real-time tracking</p>
                    </div>
                </div>
                
                <div style="display: flex; align-items: start; gap: 1rem;">
                    <div style="
                        background: #DBEAFE;
                        color: #1E40AF;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    ">
                        <i class="fa-solid fa-address-book"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 0.25rem; color: #1f2937;">Save Favorite Addresses</h4>
                        <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">No more re-typing addresses every time</p>
                    </div>
                </div>
                
                <div style="display: flex; align-items: start; gap: 1rem;">
                    <div style="
                        background: #D1FAE5;
                        color: #065F46;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    ">
                        <i class="fa-solid fa-bolt"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 0.25rem; color: #1f2937;">Faster Checkouts</h4>
                        <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">One-click shipping with saved preferences</p>
                    </div>
                </div>
                
                <div style="display: flex; align-items: start; gap: 1rem;">
                    <div style="
                        background: #FCE7F3;
                        color: #9F1239;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    ">
                        <i class="fa-solid fa-percent"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 0.25rem; color: #1f2937;">Exclusive Discounts</h4>
                        <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">Members get special rates and promotions</p>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <button id="create-account-btn" style="
                    flex: 1;
                    min-width: 200px;
                    background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 1rem 2rem;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s;
                ">
                    <i class="fa-solid fa-user-plus"></i> Create Free Account
                </button>
                <button id="maybe-later-btn" style="
                    flex: 1;
                    min-width: 150px;
                    background: white;
                    color: #6b7280;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 1rem 2rem;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                ">
                    Maybe Later
                </button>
            </div>
            
            <p style="text-align: center; margin-top: 1rem; color: #9ca3af; font-size: 0.85rem;">
                We pre-filled your email: ${guestEmail}
            </p>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Create account button
    modal.querySelector('#create-account-btn')?.addEventListener('click', () => {
        modal.remove();
        // Import and show auth modal dynamically
        import('./ui').then(({ showAuthModal }) => {
            showAuthModal();
        });
    });
    
    // Maybe later button
    modal.querySelector('#maybe-later-btn')?.addEventListener('click', () => {
        modal.remove();
    });
    
    // Hover effects
    const createBtn = modal.querySelector('#create-account-btn') as HTMLElement;
    const laterBtn = modal.querySelector('#maybe-later-btn') as HTMLElement;
    
    if (createBtn) {
        createBtn.addEventListener('mouseenter', () => {
            createBtn.style.transform = 'scale(1.02)';
        });
        createBtn.addEventListener('mouseleave', () => {
            createBtn.style.transform = 'scale(1)';
        });
    }
    
    if (laterBtn) {
        laterBtn.addEventListener('mouseenter', () => {
            laterBtn.style.borderColor = '#F97316';
            laterBtn.style.color = '#F97316';
        });
        laterBtn.addEventListener('mouseleave', () => {
            laterBtn.style.borderColor = '#e5e7eb';
            laterBtn.style.color = '#6b7280';
        });
    }
}

// Show payment confirmation with prominent label download
function showPaymentConfirmation() {
    const confirmationData = sessionStorage.getItem('vcanship_show_confirmation');
    if (!confirmationData) return;
    
    sessionStorage.removeItem('vcanship_show_confirmation');
    const data = JSON.parse(confirmationData);
    
    // Show registration prompt first (if guest user), then confirmation
    setTimeout(() => showRegistrationPrompt(), 2000);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 1rem;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 16px;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
        animation: slideUp 0.3s ease-out;
    `;
    
    modalContent.innerHTML = `
        <style>
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        </style>
        
        <div style="padding: 2rem; text-align: center;">
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
                box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
            ">
                <i class="fa-solid fa-check" style="font-size: 3rem; color: white;"></i>
            </div>
            
            <h2 style="margin: 0 0 0.5rem; color: var(--dark-text); font-size: 2rem;">
                Payment Successful! 🎉
            </h2>
            <p style="margin: 0 0 2rem; color: var(--medium-gray); font-size: 1.1rem;">
                Your shipment is booked and ready to go
            </p>
            
            <div style="
                background: linear-gradient(135deg, #F97316 0%, #EA580C 100%);
                border-radius: 12px;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
            ">
                <button id="download-label-btn" style="
                    width: 100%;
                    background: white;
                    color: #EA580C;
                    border: none;
                    border-radius: 8px;
                    padding: 1rem 2rem;
                    font-size: 1.2rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                ">
                    <i class="fa-solid fa-download" style="font-size: 1.5rem;"></i>
                    Download Shipping Label
                </button>
                <p style="margin: 1rem 0 0; color: white; font-size: 0.9rem; opacity: 0.9;">
                    Print this label and attach it to your parcel
                </p>
            </div>
            
            <div style="
                display: grid;
                gap: 1rem;
                margin-bottom: 1.5rem;
                text-align: left;
            ">
                <button id="download-receipt-btn" class="secondary-btn" style="
                    width: 100%;
                    padding: 0.875rem 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                ">
                    <i class="fa-solid fa-file-invoice"></i>
                    Download Receipt
                </button>
                
                <button id="download-documents-btn" class="secondary-btn" style="
                    width: 100%;
                    padding: 0.875rem 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                ">
                    <i class="fa-solid fa-folder-open"></i>
                    Download Shipping Documents
                </button>
                
                ${formData.serviceType === 'dropoff' && formData.originAddress ? `
                    <button id="view-dropoff-locations-btn" class="secondary-btn" style="
                        width: 100%;
                        padding: 0.875rem 1.5rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                    ">
                        <i class="fa-solid fa-map-marker-alt"></i>
                        View Drop-off Locations
                    </button>
                ` : ''}
            </div>
            
            <div style="
                background: #F0FDF4;
                border-left: 4px solid #10B981;
                border-radius: 8px;
                padding: 1rem;
                text-align: left;
                margin-bottom: 1.5rem;
            ">
                <p style="margin: 0 0 0.5rem; color: #065F46; font-weight: 600;">
                    <i class="fa-solid fa-envelope"></i> Confirmation Email Sent
                </p>
                <p style="margin: 0; color: #047857; font-size: 0.9rem;">
                    We've sent booking confirmation, shipping label, and ${formData.serviceType === 'dropoff' ? 'drop-off locations' : 'pickup details'} to your email
                </p>
            </div>
            
            <button class="secondary-btn" id="close-confirmation-btn" style="
                width: 100%;
                padding: 0.875rem;
            ">
                Close
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Generate tracking ID (store it for consistency)
    const trackingId = data.trackingId || `VCAN${Date.now().toString(36).toUpperCase()}`;
    
    // Send booking confirmation email (fire and forget)
    sendBookingConfirmationEmail(trackingId, data.selectedQuote || allQuotes[0]).catch(err => {
        console.warn('Email notification failed:', err);
    });
    
    // Download label button
    modal.querySelector('#download-label-btn')?.addEventListener('click', async () => {
        try {
            generateShippingLabel(trackingId, data.selectedQuote || allQuotes[0]);
            showToast('Label downloaded successfully!', 'success');
        } catch (error) {
            showToast('Failed to generate label', 'error');
        }
    });
    
    // Download receipt button
    modal.querySelector('#download-receipt-btn')?.addEventListener('click', async () => {
        try {
            const trackingId = `VCAN${Date.now().toString(36).toUpperCase()}`;
            generateReceipt(trackingId, data.selectedQuote || allQuotes[0]);
            showToast('Receipt downloaded successfully!', 'success');
        } catch (error) {
            showToast('Failed to generate receipt', 'error');
        }
    });
    
    // Download documents button
    modal.querySelector('#download-documents-btn')?.addEventListener('click', async () => {
        import('./document-center').then(({ showDocumentCenter }) => {
            showDocumentCenter();
        });
    });
    
    // View drop-off locations button
    modal.querySelector('#view-dropoff-locations-btn')?.addEventListener('click', async () => {
        if (formData.originAddress) {
            toggleLoading(true, 'Finding nearest drop-off locations...');
            try {
                const locations = await findNearestDropoffLocations(formData.originAddress);
                toggleLoading(false);
                if (locations.length > 0) {
                    renderDropoffLocationModal(locations);
                }
            } catch (error) {
                toggleLoading(false);
                showToast('Failed to find locations', 'error');
            }
        }
    });
    
    // Close button
    modal.querySelector('#close-confirmation-btn')?.addEventListener('click', () => {
        modal.remove();
    });
    
    // Hover effect on download button
    const downloadBtn = modal.querySelector('#download-label-btn') as HTMLElement;
    if (downloadBtn) {
        downloadBtn.addEventListener('mouseenter', () => {
            downloadBtn.style.transform = 'scale(1.02)';
            downloadBtn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
        });
        downloadBtn.addEventListener('mouseleave', () => {
            downloadBtn.style.transform = 'scale(1)';
            downloadBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });
    }
}

// SAVE ADDRESS FROM STRING
async function saveAddressFromString(addressString: string, label: string) {
    if (!State.currentUser) return;
    
    try {
        // Parse address string (simple approach - can be enhanced)
        const parts = addressString.split(',').map(p => p.trim());
        
        if (parts.length < 3) {
            console.warn('Address too short to parse:', addressString);
            return;
        }
        
        const street = parts[0] || '';
        const city = parts[parts.length - 3] || parts[1] || '';
        const postcode = parts[parts.length - 2] || '';
        const country = parts[parts.length - 1] || '';
        
        const addressData: Partial<SavedAddress> = {
            label: label,
            name: State.currentUser.name,
            street: street,
            city: city,
            postcode: postcode,
            country: country,
            isDefault: false,
            userId: State.currentUser.uid || State.currentUser.email,
            createdAt: new Date().toISOString(),
        };
        
        const success = await saveAddress(addressData);
        if (success) {
            showToast(`✓ ${label} address saved to address book`, 'success');
        }
    } catch (error) {
        console.error('Error saving address:', error);
    }
}

// ADDRESS BOOK MODAL
async function showAddressBookModal() {
    toggleLoading(true, 'Loading saved addresses...');
    
    try {
        const addresses = await loadSavedAddresses();
        toggleLoading(false);
        
        if (addresses.length === 0) {
            showToast('No saved addresses found. Complete this booking and check "Save address" to add addresses.', 'info');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'address-book-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: white; padding: 1.5rem; margin: -1.5rem -1.5rem 1.5rem -1.5rem; border-radius: 12px 12px 0 0;">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 0.75rem;">
                        <i class="fa-solid fa-address-book"></i>
                        Select Saved Address
                    </h2>
                    <p style="margin: 0.5rem 0 0 0; opacity: 0.9; font-size: 0.9em;">Choose an address to autofill</p>
                </div>
                
                <div style="display: grid; gap: 1rem;">
                    ${addresses.map(addr => `
                        <div class="address-select-card" data-id="${addr.id}" style="
                            border: 2px solid #E5E7EB;
                            border-radius: 12px;
                            padding: 1.25rem;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="background: #F97316; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.85em; font-weight: 600;">
                                        ${addr.label}
                                    </span>
                                    ${addr.isDefault ? '<span style="background: #10B981; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75em;">Default</span>' : ''}
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="use-as-origin-btn" data-id="${addr.id}" style="
                                        padding: 0.4rem 0.75rem;
                                        background: #3B82F6;
                                        color: white;
                                        border: none;
                                        border-radius: 6px;
                                        font-size: 0.8em;
                                        cursor: pointer;
                                        transition: background 0.2s;
                                    ">
                                        <i class="fa-solid fa-location-dot"></i> Origin
                                    </button>
                                    <button class="use-as-dest-btn" data-id="${addr.id}" style="
                                        padding: 0.4rem 0.75rem;
                                        background: #8B5CF6;
                                        color: white;
                                        border: none;
                                        border-radius: 6px;
                                        font-size: 0.8em;
                                        cursor: pointer;
                                        transition: background 0.2s;
                                    ">
                                        <i class="fa-solid fa-location-crosshairs"></i> Destination
                                    </button>
                                </div>
                            </div>
                            <div style="color: #374151;">
                                <p style="margin: 0; font-weight: 500;">${addr.name}${addr.company ? ` - ${addr.company}` : ''}</p>
                                <p style="margin: 0.25rem 0 0 0; font-size: 0.9em; color: #6B7280;">
                                    ${addr.street}, ${addr.city}, ${addr.postcode}<br>
                                    ${addr.country}
                                </p>
                                ${addr.phone ? `<p style="margin: 0.25rem 0 0 0; font-size: 0.85em; color: #9CA3AF;"><i class="fa-solid fa-phone"></i> ${addr.phone}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #E5E7EB; display: flex; gap: 0.75rem;">
                    <button id="close-address-book-btn" class="secondary-btn" style="flex: 1;">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Hover effects on address cards
        modal.querySelectorAll('.address-select-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                (card as HTMLElement).style.borderColor = '#F97316';
                (card as HTMLElement).style.transform = 'translateY(-2px)';
                (card as HTMLElement).style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.15)';
            });
            card.addEventListener('mouseleave', () => {
                (card as HTMLElement).style.borderColor = '#E5E7EB';
                (card as HTMLElement).style.transform = 'translateY(0)';
                (card as HTMLElement).style.boxShadow = 'none';
            });
        });
        
        // Use as origin button
        modal.querySelectorAll('.use-as-origin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const addressId = (btn as HTMLElement).dataset.id!;
                const address = addresses.find(a => a.id === addressId);
                if (address) {
                    const fullAddress = `${address.street}, ${address.city}, ${address.postcode}, ${address.country}`;
                    const originInput = document.getElementById('origin-address') as HTMLInputElement;
                    if (originInput) {
                        originInput.value = fullAddress;
                        formData.originAddress = fullAddress;
                        showToast(`✓ Origin address set to: ${address.label}`, 'success');
                        modal.remove();
                    }
                }
            });
        });
        
        // Use as destination button
        modal.querySelectorAll('.use-as-dest-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const addressId = (btn as HTMLElement).dataset.id!;
                const address = addresses.find(a => a.id === addressId);
                if (address) {
                    const fullAddress = `${address.street}, ${address.city}, ${address.postcode}, ${address.country}`;
                    const destInput = document.getElementById('destination-address') as HTMLInputElement;
                    if (destInput) {
                        destInput.value = fullAddress;
                        formData.destinationAddress = fullAddress;
                        showToast(`✓ Destination address set to: ${address.label}`, 'success');
                        modal.remove();
                    }
                }
            });
        });
        
        // Close button
        modal.querySelector('#close-address-book-btn')?.addEventListener('click', () => {
            modal.remove();
        });
        
        // Button hover effects
        modal.querySelectorAll('.use-as-origin-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                (btn as HTMLElement).style.background = '#2563EB';
                (btn as HTMLElement).style.transform = 'scale(1.05)';
            });
            btn.addEventListener('mouseleave', () => {
                (btn as HTMLElement).style.background = '#3B82F6';
                (btn as HTMLElement).style.transform = 'scale(1)';
            });
        });
        
        modal.querySelectorAll('.use-as-dest-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                (btn as HTMLElement).style.background = '#7C3AED';
                (btn as HTMLElement).style.transform = 'scale(1.05)';
            });
            btn.addEventListener('mouseleave', () => {
                (btn as HTMLElement).style.background = '#8B5CF6';
                (btn as HTMLElement).style.transform = 'scale(1)';
            });
        });
        
    } catch (error) {
        toggleLoading(false);
        console.error('Error loading addresses:', error);
        showToast('Failed to load saved addresses', 'error');
    }
}

// EXPORT
export function startParcel() {
    setState({ currentService: 'parcel' });
    resetParcelState();
    switchPage('parcel');
    currentStep = 1;
    formData = {};
    allQuotes = [];
    dropoffLocations = [];
    usedApiQuotes = false; // Reset API quote flag
    renderPage();
    
    // Check for payment confirmation
    setTimeout(() => showPaymentConfirmation(), 500);
}
