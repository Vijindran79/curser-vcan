// fcl.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetFclState, Quote, FclDetails, ComplianceDoc, FclContainer, FclInsurance, Service } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';
import { 
    getLocalCharges, 
    calculateTotalLocalCharges, 
    formatLocalChargesBreakdown, 
    detectDestinationCountry 
} from './local-charges';
import { getHsCodeSuggestions } from './api';
import { detectCountry } from './compliance';
import { MARKUP_CONFIG } from './pricing';
import { checkAndDecrementLookup } from './api';
import { SchemaType } from '@google/generative-ai';
import { createQuoteCard } from './components';
import { blobToBase64 } from './utils';
import { 
    createEnhancedAddressInput, 
    attachEnhancedAddressListeners, 
    type ParsedAddress
} from './address-autocomplete';
import { 
    calculatePortFees, 
    getCompleteCostBreakdown,
    formatCostBreakdown 
} from './port-fees';


// --- MODULE STATE ---
let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, painting = false;
let currentFclQuotes: Quote[] = [];

// --- DEMO QUOTES FALLBACK ---
function generateDemoFclQuotes(details: FclDetails): Quote[] {
    const carriers = ['Maersk Line', 'MSC Mediterranean Shipping', 'CMA CGM', 'COSCO Shipping', 'Hapag-Lloyd', 'ONE - Ocean Network Express'];
    const baseCost = details.containers.reduce((sum, c) => sum + (c.quantity * (c.type.includes('40') ? 2500 : 1800)), 0);
    
    return carriers.slice(0, 3).map((carrier, i) => ({
        carrierName: carrier,
        carrierType: 'FCL',
        totalCost: baseCost * (1 + (i * 0.15)) * (1 + MARKUP_CONFIG.fcl.standard),
        estimatedTransitTime: `${20 + (i * 5)}-${25 + (i * 5)} days`,
        serviceProvider: 'Demo Quote',
        isSpecialOffer: i === 0,
        chargeableWeight: 0,
        chargeableWeightUnit: 'N/A',
        weightBasis: 'Per Container',
        costBreakdown: {
            baseShippingCost: baseCost * (1 + (i * 0.15)),
            fuelSurcharge: baseCost * 0.15,
            estimatedCustomsAndTaxes: 0,
            optionalInsuranceCost: 0,
            ourServiceFee: baseCost * MARKUP_CONFIG.fcl.standard
        }
    }));
}

// --- UI RENDERING & STEP MANAGEMENT ---

function goToFclStep(step: number) {
    setState({ currentFclStep: step });
    updateProgressBar('trade-finance', step - 1); // Reusing progress bar style
    document.querySelectorAll('#page-fcl .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`fcl-step-${step}`)?.classList.add('active');
    
    if (step === 3) {
        initializeSignaturePad();
    }
}

function renderFclPage() {
    const page = document.getElementById('page-fcl');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Book Full Container Load (FCL)</h2>
            <p class="subtitle">Secure exclusive use of a container for your large shipments.</p>
        </div>
        
        <!-- Pro Subscription Banner -->
        ${State.subscriptionTier !== 'pro' ? `
        <div class="pro-subscription-banner" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 24px; margin: 20px 0; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 24px;">⭐</span>
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Unlock Premium Ocean Freight Rates</h3>
                </div>
                <p style="margin: 0; opacity: 0.95; font-size: 14px;">Upgrade to Pro for instant access to live container shipping rates from Maersk, MSC, CMA CGM & more. Save up to 30% vs. traditional freight forwarders!</p>
            </div>
            <button onclick="mountService('subscription')" style="background: white; color: #667eea; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap; font-size: 14px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                Upgrade to Pro →
            </button>
        </div>
        ` : ''}
        
        <!-- Trusted Carriers -->
        <div style="background: #f8f9fa; padding: 16px; margin: 20px 0; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #666; font-weight: 500;">TRUSTED GLOBAL CARRIERS</p>
            <div style="display: flex; align-items: center; justify-content: center; gap: 32px; flex-wrap: wrap;">
                <div style="text-align: center;">
                    <div style="width: 80px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                        <span style="font-weight: 700; color: #003087; font-size: 16px;">MAERSK</span>
                    </div>
                </div>
                <div style="text-align: center;">
                    <div style="width: 80px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                        <span style="font-weight: 700; color: #000; font-size: 16px;">MSC</span>
                    </div>
                </div>
                <div style="text-align: center;">
                    <div style="width: 80px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                        <span style="font-weight: 700; color: #E60012; font-size: 14px;">CMA CGM</span>
                    </div>
                </div>
                <div style="text-align: center;">
                    <div style="width: 80px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                        <span style="font-weight: 700; color: #003DA5; font-size: 14px;">COSCO</span>
                    </div>
                </div>
                <div style="text-align: center;">
                    <div style="width: 80px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                        <span style="font-weight: 700; color: #E2001A; font-size: 14px;">HAPAG</span>
                    </div>
                </div>
                <div style="text-align: center;">
                    <div style="width: 80px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                        <span style="font-weight: 700; color: #00539F; font-size: 16px;">ONE</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="form-container">
             <div class="visual-progress-bar" id="progress-bar-trade-finance">
                <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
            </div>

            <!-- Step 1: Details -->
            <div id="fcl-step-1" class="service-step">
                <form id="fcl-quote-form" novalidate>
                    <!-- Service Selection: Ocean Only vs Full Forwarding -->
                    <div class="form-section" style="margin-bottom: 2rem;">
                        <h3>📦 What Service Do You Need?</h3>
                        <div id="fcl-main-service-selector" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                            <label class="main-service-card active" data-service="ocean-only" style="position: relative; padding: 1.5rem; border: 3px solid #F97316; background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                                <input type="radio" name="fcl-main-service" value="ocean-only" checked style="position: absolute; opacity: 0;">
                                <div style="display: flex; align-items: start; gap: 1rem;">
                                    <div style="font-size: 2.5rem;">🚢</div>
                                    <div style="flex: 1;">
                                        <h4 style="margin: 0 0 0.5rem 0; color: #EA580C; font-size: 1.1rem;">Ocean Freight Only</h4>
                                        <p style="margin: 0; font-size: 0.875rem; color: #9A3412; line-height: 1.5;">Port-to-port shipping. You handle customs, documentation, and inland transport.</p>
                                        <div style="margin-top: 0.75rem; padding: 0.5rem; background: white; border-radius: 6px; font-size: 0.8rem;">
                                            <strong style="color: #EA580C;">✓ Best for:</strong> <span style="color: #78350F;">Experienced importers/exporters</span>
                                        </div>
                                    </div>
                                </div>
                            </label>
                            
                            <label class="main-service-card" data-service="full-forwarding" style="position: relative; padding: 1.5rem; border: 2px solid #E5E7EB; background: white; border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                                <input type="radio" name="fcl-main-service" value="full-forwarding" style="position: absolute; opacity: 0;">
                                <div style="display: flex; align-items: start; gap: 1rem;">
                                    <div style="font-size: 2.5rem;">✨</div>
                                    <div style="flex: 1;">
                                        <h4 style="margin: 0 0 0.5rem 0; color: #1F2937; font-size: 1.1rem;">Full Forwarding Service</h4>
                                        <p style="margin: 0; font-size: 0.875rem; color: #6B7280; line-height: 1.5;">Complete door-to-door service with customs clearance, documentation, and compliance.</p>
                                        <div style="margin-top: 0.75rem; padding: 0.5rem; background: #F3F4F6; border-radius: 6px; font-size: 0.8rem;">
                                            <strong style="color: #1F2937;">✓ Best for:</strong> <span style="color: #4B5563;">First-time shippers, hassle-free experience</span>
                                        </div>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                
                    <div class="form-section">
                        <h3>🚚 Transport Type</h3>
                        <div id="fcl-service-type-selector" class="service-type-selector">
                            <button type="button" class="service-type-btn active" data-type="port-to-port"><strong>Port-to-Port</strong><span>You handle transport to/from ports.</span></button>
                            <button type="button" class="service-type-btn" data-type="door-to-port"><strong>Door-to-Port</strong><span>We pick up from your door.</span></button>
                            <button type="button" class="service-type-btn" data-type="port-to-door"><strong>Port-to-Door</strong><span>We deliver to their door.</span></button>
                            <button type="button" class="service-type-btn" data-type="door-to-door"><strong>Door-to-Door</strong><span>We handle the entire journey.</span></button>
                        </div>
                    </div>

                    <div class="form-section two-column">
                        <div id="fcl-origin-section">
                            <h4>Origin</h4>
                            <div id="fcl-pickup-address-fields" class="hidden">
                                <div class="input-wrapper">
                                    <label for="fcl-pickup-name">Sender Name/Company <span style="color: #ef4444;">*</span></label>
                                    <input type="text" id="fcl-pickup-name" required placeholder="Company or individual name">
                                </div>
                                <div id="fcl-pickup-address-autocomplete"></div>
                                <input type="hidden" id="fcl-pickup-address-data" />
                            </div>
                             <div id="fcl-pickup-location-fields">
                                <div class="input-wrapper"><label for="fcl-pickup-port">Port of Loading</label><input type="text" id="fcl-pickup-port" placeholder="e.g., Shanghai or CNSHA"></div>
                            </div>
                        </div>
                         <div id="fcl-destination-section">
                            <h4>Destination</h4>
                            <div id="fcl-delivery-address-fields" class="hidden">
                                <div class="input-wrapper">
                                    <label for="fcl-delivery-name">Recipient Name/Company <span style="color: #ef4444;">*</span></label>
                                    <input type="text" id="fcl-delivery-name" required placeholder="Company or individual name">
                                </div>
                                <div id="fcl-delivery-address-autocomplete"></div>
                                <input type="hidden" id="fcl-delivery-address-data" />
                            </div>
                            <div id="fcl-delivery-location-fields">
                                <div class="input-wrapper"><label for="fcl-delivery-port">Port of Discharge</label><input type="text" id="fcl-delivery-port" placeholder="e.g., Los Angeles or USLAX"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Cargo & Container Details</h4>
                        <div class="input-wrapper">
                            <label for="fcl-cargo-description">Cargo Description</label>
                            <textarea id="fcl-cargo-description" required placeholder="e.g., 15 pallets of consumer electronics"></textarea>
                        </div>
                         <div class="hs-code-suggester-wrapper">
                            <div class="input-wrapper">
                                <label for="fcl-hs-code">HS Code (Harmonized System)</label>
                                <div class="hs-code-input-group">
                                    <input type="text" id="fcl-hs-code" data-hs-code-input autocomplete="off" placeholder="Type description to get suggestions">
                                    <button type="button" id="fcl-ai-hs-code-btn" class="secondary-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
                                        <i class="fa-solid fa-wand-magic-sparkles"></i> AI Generate
                                    </button>
                                    <button type="button" id="fcl-hs-image-suggester-btn" class="secondary-btn hs-image-suggester-btn">
                                        <i class="fa-solid fa-camera"></i> Image
                                    </button>
                                </div>
                                <div class="hs-code-suggestions" id="fcl-hs-code-suggestions"></div>
                                <input type="file" id="fcl-hs-image-input" class="hidden" accept="image/*">
                                <p class="helper-text">This code is used by customs worldwide. Our AI can suggest one based on your description or an image.</p>
                            </div>
                        </div>
                        <div id="fcl-container-list" style="margin-top: 1.5rem;"></div>
                        <div style="display: flex; gap: 1rem; margin-top: 1rem; align-items: center;">
                            <button type="button" id="fcl-add-container-btn" class="secondary-btn" style="flex: 1;">
                                <i class="fa-solid fa-plus"></i> Add Container Manually
                            </button>
                            <button type="button" id="fcl-ai-suggest-container-btn" class="secondary-btn" style="flex: 1; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> AI Suggest Optimal Container
                            </button>
                        </div>
                        <p class="helper-text" style="margin-top: 0.5rem; text-align: center;">
                            💡 AI analyzes your cargo description and suggests the most cost-effective container size
                        </p>
                    </div>

                    <!-- Cargo Insurance Section -->
                    <div class="form-section" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; border-radius: 12px; padding: 1.5rem;">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                            <i class="fa-solid fa-shield-halved" style="font-size: 2rem; color: #0ea5e9;"></i>
                            <div style="flex: 1;">
                                <h4 style="margin: 0; color: #0c4a6e; display: flex; align-items: center; gap: 0.5rem;">
                                    Cargo Insurance (Optional)
                                    <span style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.7rem; font-weight: 600;">RECOMMENDED</span>
                                </h4>
                                <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: #475569;">
                                    Protect your shipment against loss or damage during transit
                                </p>
                            </div>
                            <label class="insurance-toggle-switch">
                                <input type="checkbox" id="fcl-insurance-enabled">
                                <span class="insurance-toggle-slider"></span>
                            </label>
                        </div>

                        <div id="fcl-insurance-details" style="display: none; animation: slideDown 0.3s ease;">
                            <!-- Coverage Tier Selection -->
                            <div style="margin-bottom: 1.5rem;">
                                <label style="display: block; margin-bottom: 0.75rem; font-weight: 500; color: #0c4a6e;">
                                    Coverage Level
                                </label>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
                                    <label class="insurance-tier-card" data-rate="2.5">
                                        <input type="radio" name="fcl-insurance-tier" value="basic" checked style="display: none;">
                                        <div class="insurance-tier-content">
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                <span style="font-weight: 600; color: #0c4a6e;">Basic</span>
                                                <span style="background: #dbeafe; color: #1e40af; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">2.5%</span>
                                            </div>
                                            <div style="font-size: 0.8rem; color: #64748b;">
                                                <i class="fa-solid fa-check" style="color: #22c55e; margin-right: 0.25rem;"></i> Loss/Theft<br>
                                                <i class="fa-solid fa-check" style="color: #22c55e; margin-right: 0.25rem;"></i> Fire/Collision
                                            </div>
                                        </div>
                                    </label>

                                    <label class="insurance-tier-card" data-rate="3.5">
                                        <input type="radio" name="fcl-insurance-tier" value="standard" style="display: none;">
                                        <div class="insurance-tier-content">
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                <span style="font-weight: 600; color: #0c4a6e;">Standard</span>
                                                <span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">3.5%</span>
                                            </div>
                                            <div style="font-size: 0.8rem; color: #64748b;">
                                                <i class="fa-solid fa-check" style="color: #22c55e; margin-right: 0.25rem;"></i> All Basic Coverage<br>
                                                <i class="fa-solid fa-check" style="color: #22c55e; margin-right: 0.25rem;"></i> Weather/Water Damage<br>
                                                <i class="fa-solid fa-check" style="color: #22c55e; margin-right: 0.25rem;"></i> Customs Delays
                                            </div>
                                        </div>
                                    </label>

                                    <label class="insurance-tier-card" data-rate="5.0">
                                        <input type="radio" name="fcl-insurance-tier" value="premium" style="display: none;">
                                        <div class="insurance-tier-content">
                                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                <span style="font-weight: 600; color: #0c4a6e;">Premium</span>
                                                <span style="background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: white; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">5.0%</span>
                                            </div>
                                            <div style="font-size: 0.8rem; color: #64748b;">
                                                <i class="fa-solid fa-check" style="color: #22c55e; margin-right: 0.25rem;"></i> All Standard Coverage<br>
                                                <i class="fa-solid fa-check" style="color: #22c55e; margin-right: 0.25rem;"></i> War/Strike/Riots<br>
                                                <i class="fa-solid fa-check" style="color: #22c55e; margin-right: 0.25rem;"></i> Complete All-Risk
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <!-- Cargo Value Input -->
                            <div class="input-wrapper">
                                <label for="fcl-cargo-value">
                                    Cargo Value (USD) <span style="color: #ef4444;">*</span>
                                </label>
                                <div style="position: relative;">
                                    <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-weight: 500;">$</span>
                                    <input 
                                        type="number" 
                                        id="fcl-cargo-value" 
                                        placeholder="Enter total cargo value"
                                        min="100"
                                        step="100"
                                        style="padding-left: 32px;"
                                    >
                                </div>
                                <p class="helper-text">Enter the total commercial invoice value of your cargo</p>
                            </div>

                            <!-- Insurance Premium Display -->
                            <div id="fcl-insurance-premium" style="background: white; border: 2px solid #0ea5e9; border-radius: 8px; padding: 1rem; margin-top: 1rem; display: none;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.25rem;">Insurance Premium</div>
                                        <div style="font-size: 1.75rem; font-weight: 700; color: #0c4a6e;">
                                            $<span id="fcl-insurance-premium-amount">0.00</span>
                                        </div>
                                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">
                                            Coverage: $<span id="fcl-insurance-coverage-amount">0.00</span>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600;">
                                            <i class="fa-solid fa-circle-check"></i> Protected
                                        </div>
                                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem;">
                                            Instant Claims Processing
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Insurance Benefits -->
                            <div style="background: #f8fafc; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                                <div style="font-weight: 600; color: #0c4a6e; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fa-solid fa-star" style="color: #f59e0b;"></i>
                                    Why Choose Our Insurance?
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; font-size: 0.875rem; color: #475569;">
                                    <div><i class="fa-solid fa-bolt" style="color: #f59e0b; margin-right: 0.5rem;"></i>Instant approval - no waiting</div>
                                    <div><i class="fa-solid fa-globe" style="color: #3b82f6; margin-right: 0.5rem;"></i>Worldwide coverage included</div>
                                    <div><i class="fa-solid fa-clock" style="color: #10b981; margin-right: 0.5rem;"></i>24-48 hour claims processing</div>
                                    <div><i class="fa-solid fa-headset" style="color: #8b5cf6; margin-right: 0.5rem;"></i>Dedicated claims support</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="main-submit-btn">Get Quote & Compliance</button>
                    </div>
                </form>
            </div>
            
            <!-- Step 2: Quote & Compliance -->
            <div id="fcl-step-2" class="service-step">
                <h3>Quote & Compliance</h3>
                <div class="results-layout-grid">
                    <main class="results-main-content">
                        <div id="fcl-results-controls" class="results-controls"></div>
                        <div id="fcl-quotes-container"></div>
                    </main>
                    <aside id="fcl-sidebar-container" class="results-sidebar"></aside>
                </div>
                
                <!-- Documentation Handling Options -->
                <div class="documentation-options-section" style="margin-top: 2rem; padding: 1.5rem; background: var(--card-bg); border-radius: 12px;">
                    <h4><i class="fa-solid fa-file-circle-check"></i> Documentation Handling</h4>
                    <div class="documentation-options-grid" style="display: grid; gap: 1rem; margin-top: 1rem;">
                        <label class="documentation-option-card" style="padding: 1rem; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="fcl-doc-handling" value="vcanship-handle" style="margin-right: 0.5rem;">
                            <strong>Vcanship Handles Documentation</strong>
                            <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">We'll prepare all required documents (certificates, tax forms, compliance) for an additional fee.</p>
                        </label>
                        <label class="documentation-option-card" style="padding: 1rem; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="fcl-doc-handling" value="i-handle" style="margin-right: 0.5rem;">
                            <strong>I'll Handle Documentation</strong>
                            <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">I'll provide all required documents myself. Upload them below.</p>
                        </label>
                        <label class="documentation-option-card" style="padding: 1rem; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="fcl-doc-handling" value="skip" style="margin-right: 0.5rem;">
                            <strong>Skip for Now / Use My Forwarding Agent</strong>
                            <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">I'll handle documentation separately or use my own forwarding agent.</p>
                        </label>
                    </div>
                    
                    <!-- Document Upload Section (shown when "I'll Handle" is selected) -->
                    <div id="fcl-document-upload-section" style="margin-top: 1.5rem; display: none;">
                        <h5><i class="fa-solid fa-file-arrow-up"></i> Upload Your Documents</h5>
                        <div id="fcl-compliance-docs-list" class="compliance-checklist"></div>
                        <div class="file-upload-area" id="fcl-general-upload-area" style="margin-top: 1rem; padding: 2rem; border: 2px dashed var(--border-color); border-radius: 8px; text-align: center; cursor: pointer;">
                            <i class="fa-solid fa-cloud-arrow-up" style="font-size: 2rem; color: var(--primary-orange); margin-bottom: 0.5rem;"></i>
                            <p>Drag & drop files or click to upload</p>
                            <small style="color: var(--text-secondary);">PDF, JPG, PNG - Max 10MB each</small>
                            <input type="file" id="fcl-general-doc-input" multiple accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
                        </div>
                        <div id="fcl-uploaded-files-list" style="margin-top: 1rem;"></div>
                    </div>
                    
                    <!-- Forwarding Agent Details (shown when "Skip/Use My Agent" is selected) -->
                    <div id="fcl-forwarding-agent-section" style="margin-top: 1.5rem; display: none;">
                        <h5><i class="fa-solid fa-handshake"></i> Your Forwarding Agent Details (Optional)</h5>
                        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                            <div class="input-wrapper">
                                <label>Agent Name/Company</label>
                                <input type="text" id="fcl-agent-name" placeholder="e.g., ABC Forwarding Ltd">
                            </div>
                            <div class="input-wrapper">
                                <label>Contact Email</label>
                                <input type="email" id="fcl-agent-email" placeholder="agent@example.com">
                            </div>
                        </div>
                        <p class="helper-text" style="margin-top: 0.5rem;">We'll coordinate with your agent if needed.</p>
                    </div>
                </div>
                
                <div class="form-actions" style="justify-content: space-between; margin-top: 1.5rem;">
                    <button type="button" id="fcl-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="fcl-to-agreement-btn" class="main-submit-btn" disabled>Proceed with Selected Quote</button>
                </div>
            </div>

            <!-- Step 3: Agreement -->
            <div id="fcl-step-3" class="service-step">
                 <h3>Agreement & Finalization</h3>
                 <div class="two-column">
                    <div>
                        <h4>Booking Summary</h4>
                        <div id="fcl-agreement-summary" class="payment-overview"></div>
                        <div class="checkbox-wrapper" style="margin-top: 1.5rem;">
                            <input type="checkbox" id="fcl-compliance-ack">
                            <label for="fcl-compliance-ack">I acknowledge that providing the required compliance documents is my responsibility.</label>
                        </div>
                    </div>
                    <div>
                        <h4>Digital Signature</h4>
                        <div class="input-wrapper">
                            <label for="fcl-signer-name">Sign by Typing Your Full Name</label>
                            <input type="text" id="fcl-signer-name">
                        </div>
                        <label>Sign in the box below</label>
                        <canvas id="fcl-signature-pad" width="400" height="150" style="border: 2px solid var(--border-color); border-radius: 8px; cursor: crosshair;"></canvas>
                    </div>
                 </div>
                 <div class="form-actions" style="justify-content: space-between;">
                    <button type="button" id="fcl-back-to-compliance-btn" class="secondary-btn">Back</button>
                    <button type="button" id="fcl-to-payment-btn" class="main-submit-btn" disabled>Confirm Booking Request</button>
                </div>
            </div>

            <!-- Step 4: Confirmation -->
            <div id="fcl-step-4" class="service-step">
                <div class="confirmation-container">
                    <h3 id="fcl-confirmation-title">Booking Request Sent!</h3>
                    <p id="fcl-confirmation-message">Your FCL shipment request has been received. Our operations team will be in touch via email to coordinate the next steps.</p>
                    <div class="confirmation-tracking">
                        <h4>Reference ID</h4>
                        <div class="tracking-id-display" id="fcl-booking-id"></div>
                    </div>
                    <div class="confirmation-actions">
                         <button id="fcl-download-docs-btn" class="secondary-btn">Download Summary (PDF)</button>
                         <button id="fcl-new-shipment-btn" class="main-submit-btn">New Shipment</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- UI & EVENT HANDLERS ---

function handleServiceTypeChange(type: string) {
    document.querySelectorAll('#fcl-service-type-selector .service-type-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`#fcl-service-type-selector .service-type-btn[data-type="${type}"]`)?.classList.add('active');

    const showOriginAddress = type.startsWith('door-to');
    const showDestAddress = type.endsWith('-to-door');

    document.getElementById('fcl-pickup-address-fields')?.classList.toggle('hidden', !showOriginAddress);
    document.getElementById('fcl-pickup-location-fields')?.classList.toggle('hidden', showOriginAddress);
    document.getElementById('fcl-delivery-address-fields')?.classList.toggle('hidden', !showDestAddress);
    document.getElementById('fcl-delivery-location-fields')?.classList.toggle('hidden', showDestAddress);
    
    // Re-initialize address autocomplete when address fields become visible
    if (showOriginAddress || showDestAddress) {
        setTimeout(() => initializeAddressAutocomplete(), 100);
    }
}

function renderContainerItems() {
    const list = document.getElementById('fcl-container-list');
    if (!list) return;
    const items = State.fclDetails?.containers || [];
    
    // Comprehensive container type list with descriptions
    const containerTypes = [
        { value: '20GP', label: '20ft Dry (Standard)', desc: 'Most common, general cargo' },
        { value: '40GP', label: '40ft Dry (Standard)', desc: 'General cargo, double capacity' },
        { value: '40HC', label: '40ft High Cube', desc: 'Extra height for voluminous cargo' },
        { value: '45HC', label: '45ft High Cube', desc: 'Maximum capacity dry container' },
        { value: '20RF', label: '20ft Refrigerated (Reefer)', desc: 'Temperature-controlled goods' },
        { value: '40RH', label: '40ft Reefer High Cube', desc: 'Large refrigerated shipments' },
        { value: '20OT', label: '20ft Open Top', desc: 'Oversized cargo, top loading' },
        { value: '40OT', label: '40ft Open Top', desc: 'Large oversized items' },
        { value: '20FR', label: '20ft Flat Rack', desc: 'Heavy machinery, vehicles' },
        { value: '40FR', label: '40ft Flat Rack', desc: 'Heavy/oversized equipment' },
        { value: '20OR', label: '20ft Open Rack (Collapsible)', desc: 'Machinery, construction equipment' },
        { value: '40OR', label: '40ft Open Rack (Collapsible)', desc: 'Large construction materials' },
        { value: '20TK', label: '20ft Tank Container', desc: 'Liquids, chemicals, food grade' },
        { value: '20PL', label: '20ft Platform', desc: 'Flat platform, no walls' },
        { value: '40PL', label: '40ft Platform', desc: 'Large flat shipments' },
        { value: '20VH', label: '20ft Ventilated', desc: 'Coffee, cocoa, agricultural products' },
        { value: '40VH', label: '40ft Ventilated High Cube', desc: 'Bulk agricultural goods' },
        { value: '20ISO', label: '20ft Insulated', desc: 'Temperature-sensitive (non-powered)' },
        { value: '40ISO', label: '40ft Insulated', desc: 'Large temperature-sensitive cargo' }
    ];
    
    list.innerHTML = items.map((item, index) => `
        <div class="card" data-index="${index}" style="margin-bottom: 1rem; padding: 1.5rem; border: 2px solid var(--border-color); border-radius: 12px; position: relative;">
            <div style="position: absolute; top: 0.75rem; right: 0.75rem;">
                <button type="button" class="secondary-btn fcl-remove-container-btn" style="padding: 0.5rem 0.75rem; background: var(--error-color); color: white; border: none;">
                    <i class="fa-solid fa-trash"></i> Remove
                </button>
            </div>
            
            <h4 style="margin: 0 0 1rem 0; color: var(--text-primary);">
                <i class="fa-solid fa-container-storage"></i> Container #${index + 1}
            </h4>
            
            <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="input-wrapper">
                    <label>Container Type</label>
                    <select class="fcl-container-type" style="font-family: monospace; font-size: 0.95rem;">
                        <optgroup label="📦 Standard Dry Containers">
                            ${containerTypes.filter(t => ['20GP', '40GP', '40HC', '45HC'].includes(t.value)).map(ct => `
                                <option value="${ct.value}" ${item.type === ct.value ? 'selected' : ''}>
                                    ${ct.label} - ${ct.desc}
                                </option>
                            `).join('')}
                        </optgroup>
                        <optgroup label="❄️ Refrigerated (Reefer)">
                            ${containerTypes.filter(t => ['20RF', '40RH'].includes(t.value)).map(ct => `
                                <option value="${ct.value}" ${item.type === ct.value ? 'selected' : ''}>
                                    ${ct.label} - ${ct.desc}
                                </option>
                            `).join('')}
                        </optgroup>
                        <optgroup label="🔓 Open Top & Flat Rack">
                            ${containerTypes.filter(t => ['20OT', '40OT', '20FR', '40FR'].includes(t.value)).map(ct => `
                                <option value="${ct.value}" ${item.type === ct.value ? 'selected' : ''}>
                                    ${ct.label} - ${ct.desc}
                                </option>
                            `).join('')}
                        </optgroup>
                        <optgroup label="🏗️ Open Rack (Collapsible)">
                            ${containerTypes.filter(t => ['20OR', '40OR'].includes(t.value)).map(ct => `
                                <option value="${ct.value}" ${item.type === ct.value ? 'selected' : ''}>
                                    ${ct.label} - ${ct.desc}
                                </option>
                            `).join('')}
                        </optgroup>
                        <optgroup label="🛢️ Specialized Containers">
                            ${containerTypes.filter(t => ['20TK', '20PL', '40PL', '20VH', '40VH', '20ISO', '40ISO'].includes(t.value)).map(ct => `
                                <option value="${ct.value}" ${item.type === ct.value ? 'selected' : ''}>
                                    ${ct.label} - ${ct.desc}
                                </option>
                            `).join('')}
                        </optgroup>
                    </select>
                    <p class="helper-text" style="margin-top: 0.25rem; font-size: 0.8rem;">
                        <i class="fa-solid fa-info-circle"></i> Select the container type that best fits your cargo
                    </p>
                </div>
                
                <div class="input-wrapper">
                    <label>Quantity</label>
                    <input type="number" class="fcl-container-quantity" value="${item.quantity}" min="1" max="999" style="font-size: 1.1rem; font-weight: 600;">
                    <p class="helper-text" style="margin-top: 0.25rem; font-size: 0.8rem;">How many containers of this type?</p>
                </div>
                
                <div class="input-wrapper">
                    <label>Cargo Weight <span style="font-weight: normal; color: var(--text-secondary);">(per container)</span></label>
                    <div style="display: grid; grid-template-columns: 1fr auto; gap: 0.5rem;">
                        <input type="number" class="fcl-container-weight" value="${item.weight || ''}" min="0" step="0.01" placeholder="0">
                        <select class="fcl-container-weight-unit" style="width: 90px;">
                            <option value="KG" ${item.weightUnit === 'KG' ? 'selected' : ''}>KG</option>
                            <option value="TON" ${item.weightUnit === 'TON' ? 'selected' : ''}>TON</option>
                            <option value="LBS" ${item.weightUnit === 'LBS' ? 'selected' : ''}>LBS</option>
                        </select>
                    </div>
                    <p class="helper-text" style="margin-top: 0.25rem; font-size: 0.8rem;">
                        ${item.type?.includes('GP') || item.type?.includes('HC') ? '💡 Tip: 20ft max ~28 tons, 40ft max ~26 tons' : 
                          item.type?.includes('RF') || item.type?.includes('RH') ? '❄️ Reefer payload slightly less due to cooling unit' :
                          item.type?.includes('OT') || item.type?.includes('FR') || item.type?.includes('OR') ? '🏗️ Weight limits vary by equipment' :
                          '⚖️ Check weight limits for specialized containers'}
                    </p>
                </div>
                
                <div class="input-wrapper" style="display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 1rem; border-radius: 8px; border: 2px solid #F59E0B;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; color: #92400E; font-weight: 600; margin-bottom: 0.25rem;">
                            Container Dimensions
                        </div>
                        <div id="fcl-container-dims-${index}" style="font-size: 0.8rem; color: #78350F; line-height: 1.4;">
                            ${getContainerDimensions(item.type)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Helper function to get container dimensions
function getContainerDimensions(type: string): string {
    const dims: Record<string, string> = {
        '20GP': 'L:5.9m W:2.35m H:2.39m<br>Vol: 33m³ / 1,172ft³',
        '40GP': 'L:12m W:2.35m H:2.39m<br>Vol: 67m³ / 2,385ft³',
        '40HC': 'L:12m W:2.35m H:2.69m<br>Vol: 76m³ / 2,694ft³',
        '45HC': 'L:13.6m W:2.35m H:2.69m<br>Vol: 86m³ / 3,040ft³',
        '20RF': 'L:5.44m W:2.29m H:2.27m<br>Vol: 28m³ / 988ft³',
        '40RH': 'L:11.56m W:2.29m H:2.50m<br>Vol: 67m³ / 2,366ft³',
        '20OT': 'L:5.9m W:2.35m<br>Open top for oversized cargo',
        '40OT': 'L:12m W:2.35m<br>Open top for large items',
        '20FR': 'L:5.9m W:2.35m<br>Flat rack, no sides/roof',
        '40FR': 'L:12m W:2.4m<br>Flat rack for heavy equipment',
        '20OR': 'L:5.9m W:2.35m<br>Collapsible sides for machinery',
        '40OR': 'L:12m W:2.4m<br>Collapsible for construction gear',
        '20TK': 'L:6m W:2.4m H:2.4m<br>Liquid cargo, 21,000L capacity',
        '20PL': 'L:6m W:2.4m<br>Flat platform, no walls',
        '40PL': 'L:12m W:2.4m<br>Large flat platform',
        '20VH': 'L:5.9m W:2.35m H:2.39m<br>Ventilated for agricultural',
        '40VH': 'L:12m W:2.35m H:2.69m<br>Ventilated high cube',
        '20ISO': 'L:5.9m W:2.35m H:2.39m<br>Insulated, non-powered',
        '40ISO': 'L:12m W:2.35m H:2.39m<br>Large insulated container'
    };
    return dims[type] || 'Dimensions vary by specific model';
}

function updateContainersFromUI() {
    const containers: FclContainer[] = [];
    document.querySelectorAll('#fcl-container-list .card').forEach(el => {
        containers.push({
            type: (el.querySelector('.fcl-container-type') as HTMLSelectElement).value,
            quantity: parseInt((el.querySelector('.fcl-container-quantity') as HTMLInputElement).value) || 1,
            weight: parseFloat((el.querySelector('.fcl-container-weight') as HTMLInputElement).value) || 0,
            weightUnit: (el.querySelector('.fcl-container-weight-unit') as HTMLSelectElement).value as 'KG' | 'TON' | 'LBS',
        });
    });
    setState({ fclDetails: { ...State.fclDetails, containers } as FclDetails });
}

async function suggestOptimalContainer() {
    const cargoDesc = (document.getElementById('fcl-cargo-description') as HTMLTextAreaElement)?.value;
    
    if (!cargoDesc || cargoDesc.trim().length < 10) {
        showToast('Please enter a detailed cargo description first (at least 10 characters)', 'warning');
        return;
    }
    
    if (!checkAndDecrementLookup()) return;
    
    toggleLoading(true, '🤖 AI analyzing your cargo...');
    
    try {
        const prompt = `You are a shipping logistics expert. Based on this cargo description, suggest the optimal container type and quantity.

Cargo Description: ${cargoDesc}

Analyze the cargo and recommend:
1. Container type (20GP, 40GP, 40HC, 45HC, 20RF, 40RH, 20OT, 40OT, 20FR, 40FR, 20OR, 40OR, 20TK, 20PL, 40PL, 20VH, 40VH, 20ISO, 40ISO)
2. Quantity needed
3. Estimated weight per container in tons
4. Reasoning for your recommendation

Consider:
- Volume efficiency (don't oversize)
- Weight distribution
- Special requirements (temperature control, oversized items, liquids, ventilation)
- Cost optimization

Provide a practical recommendation.`;

        const responseSchema = {
            type: SchemaType.OBJECT,
            properties: {
                containerType: { type: SchemaType.STRING },
                quantity: { type: SchemaType.NUMBER },
                estimatedWeight: { type: SchemaType.NUMBER },
                reasoning: { type: SchemaType.STRING },
                utilizationPercentage: { type: SchemaType.NUMBER },
                alternatives: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            containerType: { type: SchemaType.STRING },
                            quantity: { type: SchemaType.NUMBER },
                            costComparison: { type: SchemaType.STRING }
                        }
                    }
                }
            }
        };

        const model = State.api.getGenerativeModel({
            model: "gemini-1.5-flash-8b",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        const result = await model.generateContent(prompt);
        const suggestion = JSON.parse(result.response.text());
        
        // Show suggestion modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <h3><i class="fa-solid fa-robot"></i> AI Container Recommendation</h3>
                
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 12px; margin: 1.5rem 0;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div style="font-size: 3rem;">📦</div>
                        <div>
                            <div style="font-size: 1.5rem; font-weight: 700;">${suggestion.quantity}x ${suggestion.containerType}</div>
                            <div style="opacity: 0.9; font-size: 0.9rem;">~${suggestion.estimatedWeight} tons per container</div>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); padding: 0.75rem; border-radius: 8px;">
                        <strong>Utilization:</strong> ${suggestion.utilizationPercentage}% capacity
                    </div>
                </div>
                
                <div style="background: #F3F4F6; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h4 style="margin: 0 0 0.5rem 0;">💡 Why this recommendation?</h4>
                    <p style="margin: 0; line-height: 1.6;">${suggestion.reasoning}</p>
                </div>
                
                ${suggestion.alternatives && suggestion.alternatives.length > 0 ? `
                    <div style="margin-bottom: 1.5rem;">
                        <h4>Alternative Options:</h4>
                        <div style="display: grid; gap: 0.75rem;">
                            ${suggestion.alternatives.map((alt: any) => `
                                <div style="padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong>${alt.quantity}x ${alt.containerType}</strong>
                                        <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: #6B7280;">${alt.costComparison}</p>
                                    </div>
                                    <button class="secondary-btn use-alternative-btn" data-type="${alt.containerType}" data-quantity="${alt.quantity}" data-weight="${suggestion.estimatedWeight}">
                                        Use This
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button class="secondary-btn" id="fcl-ai-reject-btn" style="flex: 1;">No Thanks</button>
                    <button class="main-submit-btn" id="fcl-ai-accept-btn" style="flex: 1;">
                        <i class="fa-solid fa-check"></i> Use This Recommendation
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle accept
        document.getElementById('fcl-ai-accept-btn')?.addEventListener('click', () => {
            const containers: FclContainer[] = [{
                type: suggestion.containerType,
                quantity: suggestion.quantity,
                weight: suggestion.estimatedWeight,
                weightUnit: 'TON'
            }];
            setState({ fclDetails: { ...State.fclDetails, containers } as FclDetails });
            renderContainerItems();
            document.body.removeChild(modal);
            showToast('Container recommendation applied!', 'success');
        });
        
        // Handle reject
        document.getElementById('fcl-ai-reject-btn')?.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Handle alternatives
        modal.querySelectorAll('.use-alternative-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const containers: FclContainer[] = [{
                    type: target.getAttribute('data-type') || '20GP',
                    quantity: parseInt(target.getAttribute('data-quantity') || '1'),
                    weight: parseFloat(target.getAttribute('data-weight') || '0'),
                    weightUnit: 'TON'
                }];
                setState({ fclDetails: { ...State.fclDetails, containers } as FclDetails });
                renderContainerItems();
                document.body.removeChild(modal);
                showToast('Alternative container applied!', 'success');
            });
        });
        
    } catch (error) {
        console.error('Container suggestion error:', error);
        showToast('Could not generate suggestion. Please try again.', 'error');
    } finally {
        toggleLoading(false);
    }
}

function initializeSignaturePad() {
    canvas = document.getElementById('fcl-signature-pad') as HTMLCanvasElement;
    if (!canvas) return;
    ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#212121'; ctx.lineWidth = 2;

    const start = (e: MouseEvent | TouchEvent) => { painting = true; draw(e); };
    const end = () => { painting = false; ctx.beginPath(); setState({ fclSignatureDataUrl: canvas.toDataURL() }); validateAgreement(); };
    const draw = (e: MouseEvent | TouchEvent) => {
        if (!painting) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const pos = e instanceof MouseEvent ? e : e.touches[0];
        ctx.lineTo(pos.clientX - rect.left, pos.clientY - rect.top);
        ctx.stroke(); ctx.beginPath(); ctx.moveTo(pos.clientX - rect.left, pos.clientY - rect.top);
    };
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchmove', draw);
}

function validateAgreement() {
    const ack = (document.getElementById('fcl-compliance-ack') as HTMLInputElement).checked;
    const name = (document.getElementById('fcl-signer-name') as HTMLInputElement).value.trim();
    const isSigned = !!State.fclSignatureDataUrl;
    (document.getElementById('fcl-to-payment-btn') as HTMLButtonElement).disabled = !(ack && name && isSigned);
}

async function handleFclFormSubmit(e: Event) {
    e.preventDefault();
    updateContainersFromUI();
    
    if (!checkAndDecrementLookup()) return;

    // Fast initial message to keep user engaged
    toggleLoading(true, "🚢 Getting your quote ready...");

    const serviceType = document.querySelector('#fcl-service-type-selector .service-type-btn.active')?.getAttribute('data-type') || 'port-to-port';
    const pickupAddress = serviceType.startsWith('door-to') ? {
        name: (document.getElementById('fcl-pickup-name') as HTMLInputElement).value,
        country: (document.getElementById('fcl-pickup-country') as HTMLInputElement).value,
    } : null;
    const pickupPort = serviceType.startsWith('door-to') ? null : (document.getElementById('fcl-pickup-port') as HTMLInputElement).value;
    const deliveryAddress = serviceType.endsWith('-to-door') ? {
        name: (document.getElementById('fcl-delivery-name') as HTMLInputElement).value,
        country: (document.getElementById('fcl-delivery-country') as HTMLInputElement).value,
    } : null;
    const deliveryPort = serviceType.endsWith('-to-door') ? null : (document.getElementById('fcl-delivery-port') as HTMLInputElement).value;
    const cargoDescription = (document.getElementById('fcl-cargo-description') as HTMLTextAreaElement).value;
    const hsCode = (document.getElementById('fcl-hs-code') as HTMLInputElement).value;


    // Get mainService from state (ocean-only or full-forwarding)
    const mainService = State.fclDetails?.mainService || 'ocean-only';
    
    const details: FclDetails = {
        mainService,
        serviceType: serviceType as FclDetails['serviceType'],
        pickupType: serviceType.startsWith('door-to') ? 'address' : 'location',
        deliveryType: serviceType.endsWith('-to-door') ? 'address' : 'location',
        pickupAddress,
        deliveryAddress,
        pickupPort,
        deliveryPort,
        cargoDescription,
        hsCode,
        containers: State.fclDetails?.containers || [],
    };
    setState({ fclDetails: details });

    // Load skeleton loader module once at the start
    const skeletonLoader = await import('./skeleton-loader');

    try {
        // Show skeleton loader immediately
        skeletonLoader.showSkeletonLoader({
            service: 'fcl',
            estimatedTime: 15,
            showCarrierLogos: true,
            showProgressBar: true
        });

        // Try to fetch from Sea Rates API with 20-second timeout (Pro users get real rates)
        if (State.subscriptionTier === 'pro') {
            try {
                toggleLoading(true, '🌊 Fetching real ocean freight rates... This may take 10-15 seconds');
                const { fetchSeaRatesQuotes } = await import('./backend-api');
                
                // Race between API call and 20-second timeout (API needs time!)
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('API timeout')), 20000)
                );
                
                const apiPromise = fetchSeaRatesQuotes({
                    serviceType: 'fcl',
                    origin: pickupPort || pickupAddress?.country || '',
                    destination: deliveryPort || deliveryAddress?.country || '',
                    containers: details.containers,
                    cargo: {
                        description: details.cargoDescription,
                        hsCode: details.hsCode
                    },
                    currency: State.currentCurrency.code
                });
                
                const realQuotes = await Promise.race([apiPromise, timeoutPromise]) as Quote[];
                
                if (realQuotes && realQuotes.length > 0) {
                    skeletonLoader.hideSkeletonLoader();
                    currentFclQuotes = realQuotes;
                    setState({ fclComplianceDocs: [] }); // Compliance docs from real API
                    renderFclResultsStep({ status: 'verified', summary: 'Live carrier rates verified' });
                    goToFclStep(2);
                    toggleLoading(false);
                    return;
                } else {
                    throw new Error('No quotes returned from API');
                }
            } catch (apiError: any) {
                console.warn('Real-time rates unavailable, using instant AI estimates:', apiError);
                showToast('⚡ Using instant AI estimates (API timed out)', 'info', 3000);
                // Fall back to AI estimates if API times out or fails
            }
        }
        
        // Fallback: Use FAST AI for instant estimates (keeps customers engaged!)
        skeletonLoader.updateSkeletonProgress(50, '⚡ Generating instant AI quote... (2-3 seconds)');
        toggleLoading(true, "⚡ Generating instant AI quote... (2-3 seconds)");
        
        if (!State.api) {
            // If AI is not available, show demo quotes immediately
            skeletonLoader.hideSkeletonLoader();
            showToast("Showing demo quotes (AI not configured)", "info");
            currentFclQuotes = generateDemoFclQuotes(details);
            renderFclResultsStep({ status: 'demo', summary: 'Demo quotes - configure AI for estimates' });
            goToFclStep(2);
            toggleLoading(false);
            return;
        }
        const containerSummary = details.containers.map(c => `${c.quantity} x ${c.type}`).join(', ');
        
        // Determine service description and pricing adjustment
        const serviceDescription = mainService === 'full-forwarding' 
            ? 'Full Forwarding Service (includes customs clearance, documentation handling, compliance management, and door-to-door service)'
            : 'Ocean Freight Only (port-to-port, customer handles customs)';
        
        const pricingNote = mainService === 'full-forwarding'
            ? 'For Full Forwarding Service: Include an additional 45-50% on top of ocean freight to cover customs clearance ($300-500), documentation handling ($200-300), compliance management ($150-250), and door-to-door transport. This provides complete end-to-end service.'
            : 'For Ocean Freight Only: Provide base ocean freight rates for port-to-port service. Customer will handle customs clearance and documentation separately.';
        
        const prompt = `Act as a logistics pricing expert for FCL sea freight. Provide a JSON response containing realistic quotes from 3 different carriers (e.g., Maersk, MSC, CMA CGM) and a compliance checklist.
        - Service Type: ${serviceDescription}
        - Route: From ${pickupPort || pickupAddress?.country} to ${deliveryPort || deliveryAddress?.country}.
        - Containers: ${containerSummary}.
        - Cargo: ${details.cargoDescription}.
        - HS Code: ${hsCode || 'Not Provided'}.
        - Currency: ${State.currentCurrency.code}.
        
        PRICING INSTRUCTIONS: ${pricingNote}
        
        The response should be a JSON object with two keys: "quotes" and "complianceReport".
        The "quotes" key should be an array of objects. For each quote object, provide carrierName, estimatedTransitTime, and totalCost. Apply a ${MARKUP_CONFIG.fcl.standard * 100}% markup to a realistic base cost to calculate the totalCost.
        The "complianceReport" should have:
        - status: "verified" or "pending"
        - summary: A brief summary of compliance requirements
        - requirements: Array of required documents (title, description)
        - taxInformation: Detailed tax and duty information based on the HS code and destination
        - certificates: Array of certificates that should be generated:
          * Country of Origin Certificate (if applicable)
          * Pre-Inspection Certificate (if required by destination)
          * Any other trade certificates needed
        Each certificate should have: name, type (e.g., "coo", "pre-inspection"), and description.
        Your response MUST be a single JSON object matching the provided schema. Do not include any text outside the JSON.`;
        
        const responseSchema = {
            type: SchemaType.OBJECT,
            properties: {
                quotes: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            carrierName: { type: SchemaType.STRING },
                            estimatedTransitTime: { type: SchemaType.STRING },
                            totalCost: { type: SchemaType.NUMBER }
                        }
                    }
                },
                complianceReport: {
                    type: SchemaType.OBJECT,
                    properties: {
                        status: { type: SchemaType.STRING },
                        summary: { type: SchemaType.STRING },
                        requirements: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    title: { type: SchemaType.STRING },
                                    description: { type: SchemaType.STRING }
                                }
                            }
                        },
                        taxInformation: { type: SchemaType.STRING },
                        certificates: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    name: { type: SchemaType.STRING },
                                    type: { type: SchemaType.STRING },
                                    description: { type: SchemaType.STRING }
                                }
                            }
                        }
                    }
                }
            }
        };

        const model = State.api.getGenerativeModel({
            model: "gemini-1.5-flash-8b",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });
        const result = await model.generateContent(prompt);

        const parsedResult = JSON.parse(result.response.text());

        // Add insurance premium to total cost if insurance is enabled
        const insurancePremium = State.fclDetails?.insurance?.enabled ? State.fclDetails.insurance.premium : 0;
        
        const quotesWithBreakdown: Quote[] = parsedResult.quotes.map((q: any) => ({
            ...q,
            totalCost: q.totalCost + insurancePremium, // Add insurance to total
            carrierType: "Ocean Carrier",
            chargeableWeight: 0,
            chargeableWeightUnit: 'N/A',
            weightBasis: 'Per Container',
            isSpecialOffer: Math.random() < 0.2, // 20% chance of being a special offer
            costBreakdown: {
                baseShippingCost: q.totalCost / (1 + MARKUP_CONFIG.fcl.standard),
                fuelSurcharge: 0,
                estimatedCustomsAndTaxes: 0,
                optionalInsuranceCost: insurancePremium,
                ourServiceFee: q.totalCost - (q.totalCost / (1 + MARKUP_CONFIG.fcl.standard))
            },
            serviceProvider: 'Vcanship'
        }));

        const docs: ComplianceDoc[] = parsedResult.complianceReport.requirements.map((r: any) => ({ ...r, id: `doc-${r.title.replace(/\s/g, '-')}`, status: 'pending', file: null, required: true }));
        
        skeletonLoader.hideSkeletonLoader();
        
        currentFclQuotes = quotesWithBreakdown;
        setState({ fclComplianceDocs: docs });
        await renderFclResultsStep(parsedResult.complianceReport);
        goToFclStep(2);
    } catch (error) {
        console.error("FCL quote error:", error);
        skeletonLoader.hideSkeletonLoader();
        showToast("Could not generate an estimate. Please try again.", "error");
    } finally {
        toggleLoading(false);
    }
}

function renderFclComplianceDocsList() {
    const docsList = document.getElementById('fcl-compliance-docs-list');
    if (!docsList || !State.fclComplianceDocs || State.fclComplianceDocs.length === 0) return;
    
    docsList.innerHTML = State.fclComplianceDocs.map(doc => `
        <div class="compliance-doc-item" id="fcl-doc-${doc.id}" data-status="${doc.status}">
            <div class="compliance-doc-info">
                <h5>${doc.title} ${doc.required ? '<span style="color: var(--error-color);">(Required)</span>' : '(Optional)'}</h5>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">${doc.description}</p>
            </div>
            <div class="file-upload-status">
                ${doc.file ? `
                    <span style="color: var(--success-color);"><i class="fa-solid fa-check-circle"></i> Uploaded: ${doc.file.name}</span>
                    <button type="button" class="link-btn remove-doc-btn" data-doc-id="${doc.id}" style="margin-left: 0.5rem;">Remove</button>
                ` : '<span style="color: var(--text-secondary);">Not uploaded</span>'}
            </div>
        </div>
    `).join('');
}

function handleFclDocumentUpload(files: FileList) {
    if (!State.fclComplianceDocs || State.fclComplianceDocs.length === 0) {
        showToast('Please wait for compliance report to load first', 'warning');
        return;
    }
    
    Array.from(files).forEach(file => {
        // Match file to compliance doc (could be improved with better matching logic)
        const matchingDoc = State.fclComplianceDocs?.find(doc => 
            doc.title.toLowerCase().includes('invoice') && file.name.toLowerCase().includes('invoice') ||
            doc.title.toLowerCase().includes('packing') && file.name.toLowerCase().includes('packing') ||
            doc.title.toLowerCase().includes('certificate') && file.name.toLowerCase().includes('cert')
        ) || State.fclComplianceDocs?.[0]; // Default to first doc if no match
        
        if (matchingDoc) {
            const updatedDocs = State.fclComplianceDocs?.map(doc => 
                doc.id === matchingDoc.id ? { ...doc, file, status: 'uploaded' as const } : doc
            );
            setState({ fclComplianceDocs: updatedDocs });
        }
    });
    
    renderFclComplianceDocsList();
    showToast(`Uploaded ${files.length} document(s)`, 'success');
}

/**
 * Render port fees breakdown for FCL shipment (PHASE 2B)
 */
function renderPortFeesInfo(): string {
    const fclDetails = State.fclDetails;
    
    if (!fclDetails || !fclDetails.pickupPort || !fclDetails.deliveryPort) {
        return '';
    }
    
    // Get first container type and total quantity
    const containerType = fclDetails.containers[0]?.type || '40HC';
    const totalContainers = fclDetails.containers.reduce((sum, c) => sum + c.quantity, 0);
    
    // Calculate origin port fees
    const originFees = calculatePortFees(fclDetails.pickupPort, containerType, totalContainers);
    
    // Calculate destination port fees
    const destFees = calculatePortFees(fclDetails.deliveryPort, containerType, totalContainers);
    
    const totalPortFees = originFees.fees.total + destFees.fees.total;
    
    return `
        <div style="margin-top: 1.5rem;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 1rem; border-radius: 8px 8px 0 0;">
                <h4 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-anchor"></i>
                    Port Fees & Charges
                </h4>
                <p style="margin: 0.5rem 0 0; font-size: 0.875rem; opacity: 0.95;">
                    Complete cost breakdown for origin and destination ports
                </p>
            </div>
            
            <div style="background: var(--card-bg); padding: 1rem; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 8px 8px;">
                <!-- Total Port Fees -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #fef3c7; border-radius: 8px; margin-bottom: 1rem;">
                    <span style="font-weight: 600; color: #92400e;">Total Port Fees:</span>
                    <span style="font-size: 1.25rem; font-weight: 700; color: #92400e;">$${totalPortFees.toLocaleString()}</span>
                </div>
                
                <!-- Origin Port -->
                <div style="margin-bottom: 1.5rem;">
                    <h5 style="margin: 0 0 0.75rem; color: var(--text-color); display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-ship" style="color: #10b981;"></i>
                        ${originFees.port.name}, ${originFees.port.country} (Origin)
                    </h5>
                    <div style="font-size: 0.875rem; line-height: 1.6; color: var(--text-secondary);">
                        <div style="display: flex; justify-content: space-between; padding: 0.375rem 0;">
                            <span>Port Charges:</span>
                            <span style="color: var(--text-color);">$${originFees.fees.portCharges}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.375rem 0;">
                            <span>Terminal Handling:</span>
                            <span style="color: var(--text-color);">$${originFees.fees.terminalHandling}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.375rem 0;">
                            <span>Documentation:</span>
                            <span style="color: var(--text-color);">$${originFees.fees.documentation}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; margin-top: 0.5rem; border-top: 1px solid var(--border-color); font-weight: 600;">
                            <span>Origin Subtotal:</span>
                            <span style="color: var(--text-color);">$${originFees.fees.total}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Destination Port -->
                <div>
                    <h5 style="margin: 0 0 0.75rem; color: var(--text-color); display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-location-dot" style="color: #ef4444;"></i>
                        ${destFees.port.name}, ${destFees.port.country} (Destination)
                    </h5>
                    <div style="font-size: 0.875rem; line-height: 1.6; color: var(--text-secondary);">
                        <div style="display: flex; justify-content: space-between; padding: 0.375rem 0;">
                            <span>Port Charges:</span>
                            <span style="color: var(--text-color);">$${destFees.fees.portCharges}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.375rem 0;">
                            <span>Terminal Handling:</span>
                            <span style="color: var(--text-color);">$${destFees.fees.terminalHandling}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.375rem 0;">
                            <span>Documentation:</span>
                            <span style="color: var(--text-color);">$${destFees.fees.documentation}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; margin-top: 0.5rem; border-top: 1px solid var(--border-color); font-weight: 600;">
                            <span>Destination Subtotal:</span>
                            <span style="color: var(--text-color);">$${destFees.fees.total}</span>
                        </div>
                    </div>
                    
                    <!-- Demurrage Info (CRITICAL!) -->
                    <div style="margin-top: 1rem; padding: 0.875rem; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; border: 2px solid #f59e0b;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <i class="fa-solid fa-clock" style="color: #d97706; font-size: 1.25rem;"></i>
                            <strong style="color: #92400e;">⚠️ Demurrage & Detention</strong>
                        </div>
                        <div style="font-size: 0.8125rem; color: #78350f; line-height: 1.6;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                <span>Free Storage Period:</span>
                                <strong>${destFees.demurrage.freeDays} days</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>After Free Period:</span>
                                <strong style="color: #dc2626;">$${destFees.demurrage.ratePerDayTotal}/day</strong>
                            </div>
                            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(120, 53, 15, 0.2);">
                                <strong>💡 Pro Tip:</strong> Pick up within ${destFees.demurrage.freeDays} days to avoid demurrage charges!
                                After ${destFees.demurrage.freeDays} days, you'll pay <strong style="color: #dc2626;">$${destFees.demurrage.ratePerDayTotal} per day</strong>.
                            </div>
                        </div>
                    </div>
                    
                    ${destFees.congestion.warning ? `
                        <div style="margin-top: 0.75rem; padding: 0.75rem; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fa-solid fa-triangle-exclamation" style="color: #dc2626;"></i>
                                <span style="font-size: 0.8125rem; color: #7f1d1d;"><strong>Port Alert:</strong> ${destFees.congestion.warning}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${destFees.notes ? `
                        <div style="margin-top: 0.75rem; padding: 0.625rem; font-size: 0.75rem; color: var(--text-secondary); background: rgba(59, 130, 246, 0.05); border-radius: 4px;">
                            <i class="fa-solid fa-info-circle" style="color: #3b82f6;"></i> ${destFees.notes}
                        </div>
                    ` : ''}
                </div>
                
                <!-- Important Disclaimer -->
                <div style="margin-top: 1.25rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border-radius: 6px;">
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; line-height: 1.5;">
                        <i class="fa-solid fa-exclamation-circle" style="color: #ef4444;"></i>
                        <strong>Why we show this:</strong> Hidden port fees are the #1 complaint in freight forwarding. 
                        We believe in complete transparency - what you see is what you pay. No surprise charges!
                    </p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render local charges information for destination country
 */
function renderLocalChargesInfo(): string {
    // Get destination from state
    const destination = State.fclDetails?.deliveryAddress?.country || State.fclDetails?.deliveryPort || '';
    
    if (!destination) {
        return '';
    }
    
    // Detect country code
    const countryCode = detectDestinationCountry(destination);
    
    if (!countryCode) {
        return '';
    }
    
    // Get local charges
    const localCharges = getLocalCharges(countryCode);
    
    if (!localCharges) {
        return '';
    }
    
    const total = calculateTotalLocalCharges(localCharges.charges);
    const breakdown = formatLocalChargesBreakdown(localCharges);
    
    return `
        <div style="margin-top: 1.5rem;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1rem; border-radius: 8px 8px 0 0;">
                <h4 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-money-bill-wave"></i>
                    Destination Local Charges
                </h4>
                <p style="margin: 0.5rem 0 0; font-size: 0.875rem; opacity: 0.95;">
                    ${localCharges.country} (${localCharges.countryCode})
                </p>
            </div>
            
            <div style="background: var(--card-bg); padding: 1rem; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 8px 8px;">
                <!-- Total -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f0fdf4; border-radius: 8px; margin-bottom: 1rem;">
                    <span style="font-weight: 600; color: #166534;">Estimated Total Local Charges:</span>
                    <span style="font-size: 1.25rem; font-weight: 700; color: #166534;">${localCharges.currency} ${total.toFixed(2)}</span>
                </div>
                
                <!-- Breakdown -->
                <div style="font-size: 0.875rem; line-height: 1.8; color: var(--text-color);">
                    ${breakdown.replace(/\n/g, '<br>')}
                </div>
                
                ${localCharges.notes ? `
                    <div style="margin-top: 1rem; padding: 0.75rem; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                        <div style="display: flex; align-items: start; gap: 0.5rem;">
                            <i class="fa-solid fa-info-circle" style="color: #d97706; margin-top: 0.125rem;"></i>
                            <div style="font-size: 0.8125rem; color: #78350f;">
                                <strong>Important Notes:</strong><br>
                                ${localCharges.notes}
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Disclaimer -->
                <div style="margin-top: 1rem; padding: 0.625rem; background: rgba(59, 130, 246, 0.1); border-radius: 6px;">
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0; line-height: 1.5;">
                        <i class="fa-solid fa-triangle-exclamation" style="color: #3b82f6;"></i>
                        These are estimated local charges at destination. Actual charges may vary based on specific cargo, port, and current tariffs. 
                        Vcanship will confirm exact charges before booking.
                    </p>
                </div>
            </div>
        </div>
    `;
}

async function renderFclResultsStep(complianceReport: any) {
    const sidebarContainer = document.getElementById('fcl-sidebar-container');
    const controlsContainer = document.getElementById('fcl-results-controls');
    const quotesContainer = document.getElementById('fcl-quotes-container');

    if (sidebarContainer) {
        sidebarContainer.innerHTML = `
             <div class="results-section">
                <h3><i class="fa-solid fa-file-shield"></i> Compliance Report</h3>
                <div class="compliance-report">
                    <p>${complianceReport.summary}</p>
                    <ul>${complianceReport.requirements.map((req: any) => `<li><strong>${req.title}</strong>${req.description ? `: ${req.description}` : ''}</li>`).join('')}</ul>
                </div>
                
                ${complianceReport.taxInformation ? `
                    <div style="margin-top: 1.5rem; padding: 1rem; background: var(--warning-bg); border-radius: 8px;">
                        <h4><i class="fa-solid fa-receipt"></i> Tax Information</h4>
                        <p style="font-size: 0.875rem; margin-top: 0.5rem;">${complianceReport.taxInformation}</p>
                    </div>
                ` : ''}
                
                ${complianceReport.certificates ? `
                    <div style="margin-top: 1.5rem;">
                        <h4><i class="fa-solid fa-certificate"></i> Generated Certificates</h4>
                        <div style="display: grid; gap: 0.75rem; margin-top: 0.75rem;">
                            ${complianceReport.certificates.map((cert: any) => `
                                <div style="padding: 0.75rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                                    <strong>${cert.name}</strong>
                                    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">${cert.description || ''}</p>
                                    <button type="button" class="secondary-btn download-cert-btn" data-cert-type="${cert.type}" style="margin-top: 0.5rem; width: 100%;">
                                        <i class="fa-solid fa-download"></i> Download PDF
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${renderPortFeesInfo()}
                
                ${renderLocalChargesInfo()}
             </div>
             <div class="quote-confirmation-panel">
                <h4>This is an AI Estimate</h4>
                <p>A Vcanship agent will contact you to confirm the final details and provide an exact quote for your approval before booking.</p>
            </div>
        `;
        
        // Attach download handlers for certificates
        sidebarContainer.querySelectorAll('.download-cert-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const certType = (e.target as HTMLElement).closest('.download-cert-btn')?.getAttribute('data-cert-type');
                if (certType) {
                    showToast('Certificate generation feature coming soon!', 'info');
                    // TODO: await generateAndDownloadFclCertificate(certType);
                }
            });
        });
    }

    if (controlsContainer) {
         controlsContainer.innerHTML = `
            <h3>Sort By:</h3>
            <div class="sort-buttons">
                <button class="sort-btn active" data-sort="price">Cheapest First</button>
                <button class="sort-btn" data-sort="speed">Fastest First</button>
            </div>
        `;
    }
    
    if (quotesContainer) {
        if (!currentFclQuotes || currentFclQuotes.length === 0) {
            quotesContainer.innerHTML = '<p class="helper-text">No quotes could be generated for this route.</p>';
            return;
        }
        sortAndRenderFclQuotes('price');
        
        // Add email form after quotes (if not already added)
        if (!document.getElementById('fcl-email-inquiry-form-container')) {
            setTimeout(async () => {
                const { renderEmailInquiryForm, attachEmailInquiryListeners } = await import('./email-inquiry-form');
                const emailContainer = document.createElement('div');
                emailContainer.id = 'fcl-email-inquiry-form-container';
                emailContainer.className = 'email-inquiry-wrapper';
                quotesContainer.parentElement?.insertBefore(emailContainer, quotesContainer.nextSibling);
                emailContainer.innerHTML = renderEmailInquiryForm('fcl', currentFclQuotes, State.fclDetails || {});
                attachEmailInquiryListeners('fcl', currentFclQuotes, State.fclDetails || {});
            }, 100);
        }
    }
}

function sortAndRenderFclQuotes(sortBy: 'price' | 'speed') {
    const quotesContainer = document.getElementById('fcl-quotes-container');
    if (!quotesContainer) return;

    const sortedQuotes = [...currentFclQuotes];
    const parseTransit = (time: string) => parseInt(time.split('-')[0]);

    if (sortBy === 'price') {
        sortedQuotes.sort((a, b) => a.totalCost - b.totalCost);
    } else {
        sortedQuotes.sort((a, b) => parseTransit(a.estimatedTransitTime) - parseTransit(b.estimatedTransitTime));
    }
    
    quotesContainer.innerHTML = sortedQuotes.map(q => createQuoteCard(q)).join('');
    
    // Add compliance checklist summary after quotes
    const complianceDiv = document.createElement('div');
    complianceDiv.id = 'fcl-compliance-summary';
    quotesContainer.appendChild(complianceDiv);
    
    // Add document center button
    const docButtonDiv = document.createElement('div');
    docButtonDiv.style.cssText = 'text-align: center; margin-top: 2rem;';
    docButtonDiv.innerHTML = `
        <button id="fcl-doc-center-btn" style="padding: 1rem 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 1rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.75rem; transition: transform 0.2s;">
            <i class="fa-solid fa-download"></i> Download Shipping Documents
        </button>
    `;
    quotesContainer.appendChild(docButtonDiv);
    
    // Add event listener for document center
    setTimeout(() => {
        document.getElementById('fcl-doc-center-btn')?.addEventListener('click', () => {
            import('./document-center').then(({ showDocumentCenter }) => {
                showDocumentCenter();
            });
        });
    }, 100);
    
    // Compliance checklist temporarily disabled
    console.log('Compliance checklist integration pending for FCL');

    document.querySelectorAll('#fcl-results-controls .sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-sort') === sortBy);
    });
}

async function suggestHsCodeFromImage(file: File, inputElementId: string) {
    if (!State.api) { showToast("AI not initialized.", "error"); return; }
    toggleLoading(true, "Analyzing image for HS code...");
    try {
        const base64Data = await blobToBase64(file);
        const imagePart = { inlineData: { mimeType: file.type, data: base64Data } };
        const textPart = { text: "Analyze this image of a product and suggest the most appropriate 6-digit Harmonized System (HS) code. Provide only the 6-digit code as a string." };
        
        const model = State.api.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });
        const result = await model.generateContent([imagePart, textPart]);

        const hsCode = result.response.text().replace(/[^0-9]/g, '').slice(0, 6);
        if (hsCode.length === 6) {
            const inputEl = document.getElementById(inputElementId) as HTMLInputElement;
            if(inputEl) inputEl.value = hsCode;
            showToast(`AI suggested HS Code: ${hsCode}`, "success");
        } else {
            throw new Error("Could not extract a valid HS code from the image.");
        }
    } catch (error) {
        console.error("HS code from image error:", error);
        showToast("Could not determine HS code from image.", "error");
    } finally {
        toggleLoading(false);
    }
}

/**
 * Handle FCL quote selection and proceed to payment
 */
async function handleFclQuoteSelection(selectBtn: HTMLButtonElement) {
    const quote: Quote = JSON.parse(selectBtn.dataset.quote!.replace(/&quot;/g, '"'));
    
    // Mark quote as selected
    setState({ fclQuote: quote });
    document.querySelectorAll('#fcl-quotes-container .quote-card').forEach(c => c.classList.remove('selected'));
    selectBtn.closest('.quote-card')?.classList.add('selected');
    
    // Generate shipment ID
    const shipmentId = 'FCL-' + Date.now().toString(36).toUpperCase();
    
    // Prepare origin and destination strings
    const origin = State.fclDetails?.pickupAddress?.name || State.fclDetails?.pickupPort || 'Origin';
    const destination = State.fclDetails?.deliveryAddress?.name || State.fclDetails?.deliveryPort || 'Destination';
    
    // Prepare addons array (insurance if selected)
    const addons: any[] = [];
    if (State.fclDetails?.insurance?.enabled) {
        addons.push({
            name: `Cargo Insurance (${State.fclDetails.insurance.tier})`,
            price: State.fclDetails.insurance.premium,
            description: `${State.fclDetails.insurance.rate}% of cargo value ($${State.fclDetails.insurance.cargoValue.toLocaleString()})`
        });
    }
    
    // Set up payment context for payment page
    setState({
        paymentContext: {
            service: 'fcl' as Service,
            quote: quote,
            shipmentId: shipmentId,
            origin: origin,
            destination: destination,
            addons: addons
        }
    });
    
    // Show loading
    toggleLoading(true, 'Proceeding to payment...');
    
    // Wait a moment for user feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Navigate to payment page
    toggleLoading(false);
    switchPage('payment');
}

/**
 * Initialize cargo insurance handlers and calculations
 */
function initializeInsuranceHandlers() {
    const insuranceToggle = document.getElementById('fcl-insurance-enabled') as HTMLInputElement;
    const insuranceDetails = document.getElementById('fcl-insurance-details');
    const cargoValueInput = document.getElementById('fcl-cargo-value') as HTMLInputElement;
    const premiumDisplay = document.getElementById('fcl-insurance-premium');
    const premiumAmount = document.getElementById('fcl-insurance-premium-amount');
    const coverageAmount = document.getElementById('fcl-insurance-coverage-amount');

    if (!insuranceToggle || !insuranceDetails) return;

    // Toggle insurance details visibility
    insuranceToggle.addEventListener('change', () => {
        if (insuranceToggle.checked) {
            insuranceDetails.style.display = 'block';
        } else {
            insuranceDetails.style.display = 'none';
            if (premiumDisplay) premiumDisplay.style.display = 'none';
        }
    });

    // Calculate premium when cargo value or tier changes
    function calculateInsurancePremium() {
        if (!cargoValueInput || !premiumAmount || !coverageAmount || !premiumDisplay) return;

        const cargoValue = parseFloat(cargoValueInput.value) || 0;
        if (cargoValue < 100) {
            premiumDisplay.style.display = 'none';
            return;
        }

        // Get selected tier rate
        const selectedTier = document.querySelector('input[name="fcl-insurance-tier"]:checked') as HTMLInputElement;
        const tierCard = selectedTier?.closest('.insurance-tier-card') as HTMLElement;
        const rate = parseFloat(tierCard?.dataset.rate || '2.5');

        // Calculate premium (rate is percentage)
        const premium = (cargoValue * rate) / 100;
        const coverage = cargoValue;

        // Update display
        premiumAmount.textContent = premium.toFixed(2);
        coverageAmount.textContent = coverage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        premiumDisplay.style.display = 'block';

        // Store in state for later use
        if (State.fclDetails) {
            const tierValue = (selectedTier?.value || 'basic') as 'basic' | 'standard' | 'premium';
            setState({
                fclDetails: {
                    ...State.fclDetails,
                    insurance: {
                        enabled: insuranceToggle.checked,
                        tier: tierValue,
                        cargoValue: coverage,
                        premium: premium,
                        rate: rate
                    }
                }
            });
        }
    }

    // Attach event listeners
    if (cargoValueInput) {
        cargoValueInput.addEventListener('input', calculateInsurancePremium);
    }

    // Listen to tier selection changes
    document.querySelectorAll('input[name="fcl-insurance-tier"]').forEach(radio => {
        radio.addEventListener('change', calculateInsurancePremium);
    });
}

/**
 * Initialize address autocomplete for pickup and delivery
 */
function initializeAddressAutocomplete() {


    // Initialize pickup address autocomplete
    const pickupContainer = document.getElementById('fcl-pickup-address-autocomplete');
    if (pickupContainer) {
        pickupContainer.innerHTML = createEnhancedAddressInput(
            'fcl-pickup-address-autocomplete',
            'fcl-pickup-address-input',
            'Pickup Address',
            (address: ParsedAddress) => {
                // Store parsed address data
                const dataInput = document.getElementById('fcl-pickup-address-data') as HTMLInputElement;
                if (dataInput) {
                    dataInput.value = JSON.stringify(address);
                }
                
                // Update state
                if (State.fclDetails) {
                    setState({
                        fclDetails: {
                            ...State.fclDetails,
                            pickupAddress: {
                                name: address.streetAddress,
                                country: address.country
                            }
                        }
                    });
                }
                
                showToast(`Pickup address set: ${address.city}, ${address.country}`, 'success');
            },
            { showPostalCodeSearch: true, showCurrentLocation: true, required: true }
        );
        
        // Attach event listeners after DOM is ready
        setTimeout(() => {
            attachEnhancedAddressListeners('fcl-pickup-address-input', (address: ParsedAddress) => {
                const dataInput = document.getElementById('fcl-pickup-address-data') as HTMLInputElement;
                if (dataInput) {
                    dataInput.value = JSON.stringify(address);
                }
                if (State.fclDetails) {
                    setState({
                        fclDetails: {
                            ...State.fclDetails,
                            pickupAddress: {
                                name: address.streetAddress,
                                country: address.country
                            }
                        }
                    });
                }
            });
        }, 100);
    }

    // Initialize delivery address autocomplete
    const deliveryContainer = document.getElementById('fcl-delivery-address-autocomplete');
    if (deliveryContainer) {
        deliveryContainer.innerHTML = createEnhancedAddressInput(
            'fcl-delivery-address-autocomplete',
            'fcl-delivery-address-input',
            'Delivery Address',
            (address: ParsedAddress) => {
                // Store parsed address data
                const dataInput = document.getElementById('fcl-delivery-address-data') as HTMLInputElement;
                if (dataInput) {
                    dataInput.value = JSON.stringify(address);
                }
                
                // Update state
                if (State.fclDetails) {
                    setState({
                        fclDetails: {
                            ...State.fclDetails,
                            deliveryAddress: {
                                name: address.streetAddress,
                                country: address.country
                            }
                        }
                    });
                }
                
                showToast(`Delivery address set: ${address.city}, ${address.country}`, 'success');
            },
            { showPostalCodeSearch: true, showCurrentLocation: true, required: true }
        );
        
        // Attach event listeners after DOM is ready
        setTimeout(() => {
            attachEnhancedAddressListeners('fcl-delivery-address-input', (address: ParsedAddress) => {
                const dataInput = document.getElementById('fcl-delivery-address-data') as HTMLInputElement;
                if (dataInput) {
                    dataInput.value = JSON.stringify(address);
                }
                if (State.fclDetails) {
                    setState({
                        fclDetails: {
                            ...State.fclDetails,
                            deliveryAddress: {
                                name: address.streetAddress,
                                country: address.country
                            }
                        }
                    });
                }
            });
        }, 100);
    }
}

function attachFclEventListeners() {
    const page = document.getElementById('page-fcl');
    if (!page) return;

    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
    document.getElementById('fcl-quote-form')?.addEventListener('submit', handleFclFormSubmit);

    page.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const serviceTypeBtn = target.closest<HTMLButtonElement>('.service-type-btn');
        if (serviceTypeBtn?.dataset.type) {
            handleServiceTypeChange(serviceTypeBtn.dataset.type);
        }
        
        // Handle main service card selection (Ocean Only vs Full Forwarding)
        const mainServiceCard = target.closest<HTMLElement>('.main-service-card');
        if (mainServiceCard) {
            // Update all cards - remove active styling and add inactive styling
            document.querySelectorAll('.main-service-card').forEach(card => {
                card.classList.remove('active');
                const htmlCard = card as HTMLElement;
                htmlCard.style.border = '2px solid #E5E7EB';
                htmlCard.style.background = 'white';
                
                // Update text colors for inactive state
                const h4 = htmlCard.querySelector('h4') as HTMLElement;
                const p = htmlCard.querySelector('p') as HTMLElement;
                const strong = htmlCard.querySelector('strong') as HTMLElement;
                const span = htmlCard.querySelector('div > span') as HTMLElement;
                if (h4) h4.style.color = '#1F2937';
                if (p) p.style.color = '#6B7280';
                if (strong) strong.style.color = '#1F2937';
                if (span) span.style.color = '#4B5563';
                
                // Update background of best-for box
                const bestForBox = htmlCard.querySelector('div > div:last-child') as HTMLElement;
                if (bestForBox) bestForBox.style.background = '#F3F4F6';
            });
            
            // Add active styling to selected card
            mainServiceCard.classList.add('active');
            const service = mainServiceCard.getAttribute('data-service');
            
            if (service === 'ocean-only') {
                mainServiceCard.style.border = '3px solid #F97316';
                mainServiceCard.style.background = 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)';
                
                const h4 = mainServiceCard.querySelector('h4') as HTMLElement;
                const p = mainServiceCard.querySelector('p') as HTMLElement;
                const strong = mainServiceCard.querySelector('strong') as HTMLElement;
                const span = mainServiceCard.querySelector('div > span') as HTMLElement;
                if (h4) h4.style.color = '#EA580C';
                if (p) p.style.color = '#9A3412';
                if (strong) strong.style.color = '#EA580C';
                if (span) span.style.color = '#78350F';
                
                const bestForBox = mainServiceCard.querySelector('div > div:last-child') as HTMLElement;
                if (bestForBox) bestForBox.style.background = 'white';
            } else {
                mainServiceCard.style.border = '3px solid #3B82F6';
                mainServiceCard.style.background = 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)';
                
                const h4 = mainServiceCard.querySelector('h4') as HTMLElement;
                const p = mainServiceCard.querySelector('p') as HTMLElement;
                const strong = mainServiceCard.querySelector('strong') as HTMLElement;
                const span = mainServiceCard.querySelector('div > span') as HTMLElement;
                if (h4) h4.style.color = '#2563EB';
                if (p) p.style.color = '#1E40AF';
                if (strong) strong.style.color = '#2563EB';
                if (span) span.style.color = '#1E3A8A';
                
                const bestForBox = mainServiceCard.querySelector('div > div:last-child') as HTMLElement;
                if (bestForBox) bestForBox.style.background = 'white';
            }
            
            // Also check/uncheck the radio inputs
            const radio = mainServiceCard.querySelector('input[type="radio"]') as HTMLInputElement;
            if (radio) radio.checked = true;
            
            // Store selected service in state
            if (State.fclDetails) {
                setState({
                    fclDetails: {
                        ...State.fclDetails,
                        mainService: service === 'ocean-only' ? 'ocean-only' : 'full-forwarding'
                    }
                });
            }
            
            // Show toast notification
            showToast(
                service === 'ocean-only' 
                    ? '🚢 Ocean Freight Only selected - you handle customs' 
                    : '✨ Full Forwarding selected - we handle everything!',
                'success',
                2000
            );
        }
        
        if (target.closest('.fcl-remove-container-btn')) {
            const index = parseInt(target.closest<HTMLElement>('.card')?.dataset.index || '-1');
            if (index > -1 && State.fclDetails?.containers) {
                const newContainers = State.fclDetails.containers.filter((_, i) => i !== index);
                setState({ fclDetails: { ...State.fclDetails, containers: newContainers } as FclDetails });
                renderContainerItems();
            }
        }

        if (target.closest('.sort-btn')) {
            sortAndRenderFclQuotes(target.dataset.sort as 'price' | 'speed');
        }
        
        const selectBtn = target.closest<HTMLButtonElement>('.select-quote-btn');
        if (selectBtn?.dataset.quote) {
            handleFclQuoteSelection(selectBtn);
        }
        if (target.closest('#fcl-hs-image-suggester-btn')) {
            document.getElementById('fcl-hs-image-input')?.click();
        }
    });

    // Auto-assign HS Code for international shipments when description is present
    const descEl = document.getElementById('fcl-cargo-description') as HTMLTextAreaElement | null;
    const hsEl = document.getElementById('fcl-hs-code') as HTMLInputElement | null;
    const pickupCountryEl = document.getElementById('fcl-pickup-country') as HTMLInputElement | null;
    const pickupPortEl = document.getElementById('fcl-pickup-port') as HTMLInputElement | null;
    const deliveryCountryEl = document.getElementById('fcl-delivery-country') as HTMLInputElement | null;
    const deliveryPortEl = document.getElementById('fcl-delivery-port') as HTMLInputElement | null;

    function isInternationalFcl(): boolean {
        const originStr = (pickupCountryEl?.value || pickupPortEl?.value || '').trim();
        const destStr = (deliveryCountryEl?.value || deliveryPortEl?.value || '').trim();
        const oc = detectCountry(originStr || '');
        const dc = detectCountry(destStr || '');
        return !!(oc && dc && oc !== dc);
    }

    let hsDebounce: any = null;
    descEl?.addEventListener('input', () => {
        if (!descEl || !hsEl) return;
        const desc = descEl.value.trim();
        if (!desc || desc.length < 3) return;
        if (hsEl.value && hsEl.value.length >= 4) return; // already set
        if (!isInternationalFcl()) return;
        clearTimeout(hsDebounce);
        hsDebounce = setTimeout(async () => {
            try {
                const suggestions = await getHsCodeSuggestions(desc);
                if (suggestions && suggestions.length > 0 && !hsEl.value) {
                    hsEl.value = suggestions[0].code;
                }
            } catch {}
        }, 600);
    });

    document.getElementById('fcl-add-container-btn')?.addEventListener('click', addContainerItem);
    document.getElementById('fcl-ai-suggest-container-btn')?.addEventListener('click', suggestOptimalContainer);

    // AI HS Code Generator
    document.getElementById('fcl-ai-hs-code-btn')?.addEventListener('click', () => {
        const cargoDesc = (document.getElementById('fcl-cargo-description') as HTMLTextAreaElement)?.value;
        if (!cargoDesc || cargoDesc.trim().length < 10) {
            showToast('Please enter a detailed cargo description first', 'warning');
            return;
        }
        
        // Import and show HS code modal
        import('./hs-code-intelligence').then(({ showHSCodeSearchModal }) => {
            showHSCodeSearchModal();
            
            // Pre-fill the cargo description
            setTimeout(() => {
                const descTextarea = document.getElementById('cargo-description') as HTMLTextAreaElement;
                if (descTextarea) {
                    descTextarea.value = cargoDesc;
                }
            }, 100);
        });
    });

    // Initialize address autocomplete
    initializeAddressAutocomplete();

    // Insurance toggle and calculations
    initializeInsuranceHandlers();

    // Documentation handling options
    const docHandlingRadios = document.querySelectorAll('input[name="fcl-doc-handling"]');
    docHandlingRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const value = (e.target as HTMLInputElement).value;
            const uploadSection = document.getElementById('fcl-document-upload-section');
            const agentSection = document.getElementById('fcl-forwarding-agent-section');
            
            if (uploadSection) uploadSection.style.display = value === 'i-handle' ? 'block' : 'none';
            if (agentSection) agentSection.style.display = value === 'skip' ? 'block' : 'none';
            
            // Render compliance docs list if "I'll Handle" is selected
            if (value === 'i-handle' && State.fclComplianceDocs) {
                renderFclComplianceDocsList();
            }
        });
    });
    
    // Document upload handlers
    const generalUploadArea = document.getElementById('fcl-general-upload-area');
    const generalDocInput = document.getElementById('fcl-general-doc-input') as HTMLInputElement;
    
    generalUploadArea?.addEventListener('click', () => generalDocInput?.click());
    generalDocInput?.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
            handleFclDocumentUpload(files);
        }
    });
    
    // Drag and drop for documents
    generalUploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        generalUploadArea.style.borderColor = 'var(--primary-orange)';
    });
    generalUploadArea?.addEventListener('dragleave', () => {
        generalUploadArea.style.borderColor = 'var(--border-color)';
    });
    generalUploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        generalUploadArea.style.borderColor = 'var(--border-color)';
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFclDocumentUpload(files);
        }
    });

    // HS Code Suggesters
    const hsImageInput = document.getElementById('fcl-hs-image-input') as HTMLInputElement;
    hsImageInput?.addEventListener('change', () => {
        const file = hsImageInput.files?.[0];
        if (file) {
            suggestHsCodeFromImage(file, 'fcl-hs-code');
        }
    });
    
    // Navigation buttons
    document.getElementById('fcl-back-to-details-btn')?.addEventListener('click', () => goToFclStep(1));
    document.getElementById('fcl-to-agreement-btn')?.addEventListener('click', () => {
        const summaryEl = document.getElementById('fcl-agreement-summary');
        if (summaryEl && State.fclQuote) {
            summaryEl.innerHTML = `
                <div class="review-item"><span>Carrier:</span><strong>${State.fclQuote.carrierName}</strong></div>
                <div class="review-item"><span>Transit Time:</span><strong>~${State.fclQuote.estimatedTransitTime}</strong></div>
                <hr>
                <div class="review-item total"><span>Est. Total Cost:</span><strong>${State.currentCurrency.symbol}${State.fclQuote.totalCost.toFixed(2)}</strong></div>
            `;
        }
        goToFclStep(3);
    });
    document.getElementById('fcl-back-to-compliance-btn')?.addEventListener('click', () => goToFclStep(2));
    document.getElementById('fcl-to-payment-btn')?.addEventListener('click', () => {
        const bookingId = `FCL-${Date.now().toString().slice(-6)}`;
        setState({ fclBookingId: bookingId });
        (document.getElementById('fcl-booking-id') as HTMLElement).textContent = bookingId;
        goToFclStep(4);
    });
    document.getElementById('fcl-new-shipment-btn')?.addEventListener('click', () => startFcl());
    
    // Agreement validation
    document.getElementById('fcl-compliance-ack')?.addEventListener('change', validateAgreement);
    document.getElementById('fcl-signer-name')?.addEventListener('input', validateAgreement);
}

function addContainerItem() {
    const currentContainers = State.fclDetails?.containers || [];
    // Default to TON for ocean freight (standard practice in shipping industry)
    const newContainers: FclContainer[] = [...currentContainers, { type: '20GP', quantity: 1, weight: 0, weightUnit: 'TON' as const }];
    setState({ fclDetails: { ...State.fclDetails, containers: newContainers } as FclDetails });
    renderContainerItems();
}

// --- INITIALIZATION ---
export function startFcl() {
    setState({ currentService: 'fcl' });
    resetFclState();
    renderFclPage();
    switchPage('fcl');
    attachFclEventListeners();
    goToFclStep(1);
    addContainerItem(); // Start with one container
    handleServiceTypeChange('port-to-port'); // Set initial default
}
