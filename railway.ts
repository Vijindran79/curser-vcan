// railway.ts
import { State, setState, resetRailwayState } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';
import { MARKUP_CONFIG } from './pricing';

function goToRailwayStep(step: number) {
    updateProgressBar('trade-finance', step - 1);
    document.querySelectorAll('#page-railway .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`railway-step-${step}`)?.classList.add('active');
}

function renderRailwayPage() {
    const page = document.getElementById('page-railway');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Book Railway Freight</h2>
            <p class="subtitle">An efficient and eco-friendly option for overland logistics.</p>
        </div>
        <div class="form-container">
            <div class="visual-progress-bar" id="progress-bar-trade-finance">
                <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
            </div>

            <!-- Step 1: Details -->
            <div id="railway-step-1" class="service-step">
                <form id="railway-details-form">
                    <h3>Route & Cargo</h3>
                    <div class="form-section two-column">
                        <div class="input-wrapper"><label for="railway-origin">Origin Terminal</label><input type="text" id="railway-origin" required placeholder="e.g., Chongqing, China"></div>
                        <div class="input-wrapper"><label for="railway-destination">Destination Terminal</label><input type="text" id="railway-destination" required placeholder="e.g., Duisburg, Germany"></div>
                    </div>
                     <div class="form-section">
                        <div class="input-wrapper">
                            <label for="railway-cargo-type">Cargo Type</label>
                            <select id="railway-cargo-type">
                                <option value="standard-container-40ft">Standard 40ft Container</option>
                                <option value="standard-container-20ft">Standard 20ft Container</option>
                                <option value="bulk-wagon">Bulk Wagon</option>
                            </select>
                        </div>
                        <div class="input-wrapper"><label for="railway-cargo-weight">Cargo Weight (Tons)</label><input type="number" id="railway-cargo-weight" required min="1"></div>
                    </div>
                    <div class="form-actions"><button type="submit" class="main-submit-btn">Get AI Estimate</button></div>
                </form>
            </div>

            <!-- Step 2: Quote -->
            <div id="railway-step-2" class="service-step">
                <h3>Your AI-Powered Estimate</h3>
                <div id="railway-quote-container"></div>
                <div class="quote-confirmation-panel">
                    <h4>Please Note: This is an AI Estimate</h4>
                    <p>This is an estimated price based on current market rates for terminal-to-terminal rail freight. A Vcanship agent will contact you to confirm all details and provide a final quote.</p>
                </div>
                
                <!-- Documentation Handling Options -->
                <div class="documentation-options-section" style="margin-top: 2rem; padding: 1.5rem; background: var(--card-bg); border-radius: 12px;">
                    <h4><i class="fa-solid fa-file-circle-check"></i> Documentation Handling</h4>
                    <div class="documentation-options-grid" style="display: grid; gap: 1rem; margin-top: 1rem;">
                        <label class="documentation-option-card" style="padding: 1rem; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="railway-doc-handling" value="vcanship-handle" style="margin-right: 0.5rem;">
                            <strong>Vcanship Handles Documentation</strong>
                            <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">We'll prepare all required documents (certificates, customs, compliance) for an additional fee.</p>
                        </label>
                        <label class="documentation-option-card" style="padding: 1rem; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="railway-doc-handling" value="i-handle" style="margin-right: 0.5rem;">
                            <strong>I'll Handle Documentation</strong>
                            <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">I'll provide all required documents myself. Upload them below.</p>
                        </label>
                        <label class="documentation-option-card" style="padding: 1rem; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="railway-doc-handling" value="skip" style="margin-right: 0.5rem;">
                            <strong>Skip for Now / Use My Forwarding Agent</strong>
                            <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">I'll handle documentation separately or use my own forwarding agent.</p>
                        </label>
                    </div>
                    
                    <!-- Document Upload Section -->
                    <div id="railway-document-upload-section" style="margin-top: 1.5rem; display: none;">
                        <h5><i class="fa-solid fa-file-arrow-up"></i> Upload Your Documents</h5>
                        <div class="file-upload-area" id="railway-general-upload-area" style="margin-top: 1rem; padding: 2rem; border: 2px dashed var(--border-color); border-radius: 8px; text-align: center; cursor: pointer;">
                            <i class="fa-solid fa-cloud-arrow-up" style="font-size: 2rem; color: var(--primary-orange); margin-bottom: 0.5rem;"></i>
                            <p>Drag & drop files or click to upload</p>
                            <small style="color: var(--text-secondary);">PDF, JPG, PNG - Max 10MB each</small>
                            <input type="file" id="railway-general-doc-input" multiple accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
                        </div>
                        <div id="railway-uploaded-files-list" style="margin-top: 1rem;"></div>
                    </div>
                    
                    <!-- Forwarding Agent Details -->
                    <div id="railway-forwarding-agent-section" style="margin-top: 1.5rem; display: none;">
                        <h5><i class="fa-solid fa-handshake"></i> Your Forwarding Agent Details (Optional)</h5>
                        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                            <div class="input-wrapper">
                                <label>Agent Name/Company</label>
                                <input type="text" id="railway-agent-name" placeholder="e.g., ABC Forwarding Ltd">
                            </div>
                            <div class="input-wrapper">
                                <label>Contact Email</label>
                                <input type="email" id="railway-agent-email" placeholder="agent@example.com">
                            </div>
                        </div>
                        <p class="helper-text" style="margin-top: 0.5rem;">We'll coordinate with your agent if needed.</p>
                    </div>
                </div>
                
                <div class="form-actions" style="margin-top: 1.5rem;">
                    <button type="button" id="railway-back-to-details" class="secondary-btn">Back</button>
                    <button type="button" id="railway-request-booking" class="main-submit-btn">Request Final Quote</button>
                </div>
            </div>

            <!-- Step 3: Confirmation -->
            <div id="railway-step-3" class="service-step">
                 <div class="confirmation-container">
                    <h3>Booking Request Sent!</h3>
                    <p>Your railway freight request has been received. Our team will be in touch shortly.</p>
                    <div class="confirmation-tracking">
                        <h4>Reference ID</h4>
                        <div class="tracking-id-display" id="railway-reference-id"></div>
                    </div>
                    <div class="confirmation-actions">
                        <button id="railway-new-shipment-btn" class="main-submit-btn">Book Another Rail Shipment</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function handleRailwayFormSubmit(e: Event) {
    e.preventDefault();
    toggleLoading(true, "Calculating railway estimate...");

    const origin = (document.getElementById('railway-origin') as HTMLInputElement).value;
    const dest = (document.getElementById('railway-destination') as HTMLInputElement).value;
    const cargoType = (document.getElementById('railway-cargo-type') as HTMLSelectElement).value;
    const weight = (document.getElementById('railway-cargo-weight') as HTMLInputElement).value;
    
    // Try Sea Rates API first (real quotes for railway)
    try {
        const { fetchSeaRatesQuotes } = await import('./backend-api');
        const realQuotes = await fetchSeaRatesQuotes({
            serviceType: 'train',
            origin,
            destination: dest,
            cargo: {
                description: cargoType,
                weight: parseFloat(weight) || 0
            },
            currency: State.currentCurrency.code
        });
        
        const quoteContainer = document.getElementById('railway-quote-container');
        if (quoteContainer && realQuotes.length > 0) {
            const bestQuote = realQuotes.sort((a, b) => a.totalCost - b.totalCost)[0];
            quoteContainer.innerHTML = `
                <div class="payment-overview">
                    <div class="review-item"><span>Route:</span><strong>${origin} &rarr; ${dest}</strong></div>
                    <div class="review-item"><span>Cargo:</span><strong>${cargoType} (${weight} tons)</strong></div>
                    <hr>
                    <div class="review-item total"><span>Estimated Cost:</span><strong>${State.currentCurrency.symbol}${bestQuote.totalCost.toFixed(2)}</strong></div>
                </div>
            `;
            
            // Show email form
            setTimeout(async () => {
                const { attachEmailInquiryListeners, renderEmailInquiryForm } = await import('./email-inquiry-form');
                const emailContainer = document.createElement('div');
                emailContainer.id = 'railway-email-inquiry-form-container';
                emailContainer.className = 'email-inquiry-wrapper';
                quoteContainer.parentElement?.insertBefore(emailContainer, quoteContainer.nextSibling);
                emailContainer.innerHTML = renderEmailInquiryForm('railway', realQuotes, { origin, destination: dest, cargoType, weight });
                attachEmailInquiryListeners('railway', realQuotes, { origin, destination: dest, cargoType, weight });
            }, 100);
        }
        goToRailwayStep(2);
        return;
    } catch (apiError: any) {
        console.warn('Sea Rates API not available, using AI estimates:', apiError);
        // Fall back to AI estimates
    }

    const prompt = `
        Act as a logistics pricing expert for railway freight.
        - Origin Terminal: ${origin}
        - Destination Terminal: ${dest}
        - Cargo: ${cargoType}, ${weight} tons
        - Currency: ${State.currentCurrency.code}

        Provide a single estimated base cost for the freight as a number. Do not add any other text or formatting.
    `;

    try {
        if (!State.api) throw new Error("AI API not initialized.");
        const model = State.api.getGenerativeModel({ 
            model: 'gemini-1.5-flash'
        });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const baseCost = parseFloat(responseText);
        if (isNaN(baseCost)) throw new Error("Invalid AI response.");

        const markup = MARKUP_CONFIG.railway.standard;
        const finalPrice = baseCost * (1 + markup);

        const quoteContainer = document.getElementById('railway-quote-container');
        if (quoteContainer) {
            quoteContainer.innerHTML = `
                <div class="payment-overview">
                    <div class="review-item"><span>Route:</span><strong>${origin} &rarr; ${dest}</strong></div>
                    <div class="review-item"><span>Cargo:</span><strong>${cargoType} (${weight} tons)</strong></div>
                    <hr>
                    <div class="review-item total"><span>Estimated Cost:</span><strong>${State.currentCurrency.symbol}${finalPrice.toFixed(2)}</strong></div>
                </div>
            `;
        }
        goToRailwayStep(2);
    } catch (error) {
        console.error("Railway quote error:", error);
        showToast("Could not generate an estimate. Please try again.", "error");
    } finally {
        toggleLoading(false);
    }
}

function attachRailwayEventListeners() {
    document.querySelector('#page-railway .back-btn')?.addEventListener('click', () => switchPage('landing'));
    document.getElementById('railway-details-form')?.addEventListener('submit', handleRailwayFormSubmit);
    document.getElementById('railway-back-to-details')?.addEventListener('click', () => goToRailwayStep(1));
    document.getElementById('railway-request-booking')?.addEventListener('click', () => {
        const refId = `RWY-${Date.now().toString().slice(-6)}`;
        (document.getElementById('railway-reference-id') as HTMLElement).textContent = refId;
        goToRailwayStep(3);
        showToast("Request sent!", "success");
    });
    document.getElementById('railway-new-shipment-btn')?.addEventListener('click', () => {
        resetRailwayState();
        renderRailwayPage();
        attachRailwayEventListeners();
        goToRailwayStep(1);
    });
    
    // Documentation handling options
    const docHandlingRadios = document.querySelectorAll('input[name="railway-doc-handling"]');
    docHandlingRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const value = (e.target as HTMLInputElement).value;
            const uploadSection = document.getElementById('railway-document-upload-section');
            const agentSection = document.getElementById('railway-forwarding-agent-section');
            
            if (uploadSection) uploadSection.style.display = value === 'i-handle' ? 'block' : 'none';
            if (agentSection) agentSection.style.display = value === 'skip' ? 'block' : 'none';
        });
    });
    
    // Document upload handlers
    const generalUploadArea = document.getElementById('railway-general-upload-area');
    const generalDocInput = document.getElementById('railway-general-doc-input') as HTMLInputElement;
    
    generalUploadArea?.addEventListener('click', () => generalDocInput?.click());
    generalDocInput?.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
            showToast(`Uploaded ${files.length} document(s)`, 'success');
        }
    });
    
    // Drag and drop for documents
    generalUploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (generalUploadArea) generalUploadArea.style.borderColor = 'var(--primary-orange)';
    });
    generalUploadArea?.addEventListener('dragleave', () => {
        if (generalUploadArea) generalUploadArea.style.borderColor = 'var(--border-color)';
    });
    generalUploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        if (generalUploadArea) generalUploadArea.style.borderColor = 'var(--border-color)';
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            showToast(`Uploaded ${files.length} document(s)`, 'success');
        }
    });
}

export function startRailway() {
    setState({ currentService: 'railway' });
    resetRailwayState();
    renderRailwayPage();
    switchPage('railway');
    attachRailwayEventListeners();
    goToRailwayStep(1);
}
