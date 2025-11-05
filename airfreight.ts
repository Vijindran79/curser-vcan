// airfreight.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetAirfreightState, AirfreightCargoPiece, Quote, ComplianceDoc, AirfreightDetails } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';
import { getHsCodeSuggestions } from './api';
import { detectCountry } from './compliance';
import { SchemaType } from '@google/generative-ai';
import { createQuoteCard } from './components';
import { blobToBase64 } from './utils';
import { MARKUP_CONFIG } from './pricing';

// --- MODULE STATE ---
let cargoPieces: AirfreightCargoPiece[] = [];
let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, painting = false;
let currentAirfreightQuotes: Quote[] = [];

function goToAirfreightStep(step: number) {
    setState({ currentAirfreightStep: step });
    updateProgressBar('trade-finance', step - 1);
    document.querySelectorAll('#page-airfreight .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`airfreight-step-${step}`)?.classList.add('active');

    if (step === 4) {
        initializeSignaturePad();
    }
}

function renderAirfreightPage() {
    const page = document.getElementById('page-airfreight');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Book Air Freight</h2>
            <p class="subtitle">Fast and reliable shipping for your time-sensitive cargo.</p>
        </div>
        <div class="form-container">
            <div class="visual-progress-bar" id="progress-bar-trade-finance">
                <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
            </div>

            <!-- Step 1: Details -->
            <div id="airfreight-step-1" class="service-step">
                <form id="airfreight-details-form">
                    <h3>Route & Cargo Details</h3>
                    <div class="form-section two-column">
                        <div class="input-wrapper"><label for="airfreight-origin">Origin Airport (IATA)</label><input type="text" id="airfreight-origin" required placeholder="e.g., LHR"></div>
                        <div class="input-wrapper"><label for="airfreight-destination">Destination Airport (IATA)</label><input type="text" id="airfreight-destination" required placeholder="e.g., JFK"></div>
                    </div>
                    <div class="form-section">
                        <div class="input-wrapper"><label for="airfreight-cargo-description">Detailed Cargo Description</label><textarea id="airfreight-cargo-description" required placeholder="e.g., 10 boxes of smartphone batteries"></textarea></div>
                        <div class="hs-code-suggester-wrapper">
                             <div class="input-wrapper">
                                <label for="airfreight-hs-code">HS Code (Harmonized System)</label>
                                <div class="hs-code-input-group">
                                    <input type="text" id="airfreight-hs-code" autocomplete="off" placeholder="Type description for suggestions">
                                    <button type="button" id="airfreight-hs-image-suggester-btn" class="secondary-btn hs-image-suggester-btn">
                                        <i class="fa-solid fa-camera"></i> Image
                                    </button>
                                </div>
                                <div class="hs-code-suggestions" id="airfreight-hs-code-suggestions"></div>
                                <input type="file" id="airfreight-hs-image-input" class="hidden" accept="image/*">
                                <p class="helper-text">Our AI can suggest a code from your description or an image.</p>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions"><button type="button" id="airfreight-to-dims-btn" class="main-submit-btn">Next: Dimensions</button></div>
                </form>
            </div>

            <!-- Step 2: Dimensions -->
            <div id="airfreight-step-2" class="service-step">
                <h3>Dimensions & Weight</h3>
                <div id="airfreight-cargo-list"></div>
                <button type="button" id="airfreight-add-piece-btn" class="secondary-btn">Add Piece</button>
                <div id="airfreight-cargo-summary" class="payment-overview" style="margin-top: 1rem;"></div>
                <div class="form-actions" style="justify-content: space-between">
                    <button type="button" id="airfreight-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="airfreight-to-quote-btn" class="main-submit-btn">Get Quote & Compliance</button>
                </div>
            </div>

            <!-- Step 3: Quote & Compliance -->
            <div id="airfreight-step-3" class="service-step">
                <h3>Quote & Compliance</h3>
                <div class="results-layout-grid">
                    <main class="results-main-content">
                        <div id="airfreight-results-controls" class="results-controls"></div>
                        <div id="airfreight-quotes-container"></div>
                    </main>
                    <aside id="airfreight-sidebar-container" class="results-sidebar"></aside>
                </div>
                
                <!-- Documentation Handling Options -->
                <div class="documentation-options-section" style="margin-top: 2rem; padding: 1.5rem; background: var(--card-bg); border-radius: 12px;">
                    <h4><i class="fa-solid fa-file-circle-check"></i> Documentation Handling</h4>
                    <div class="documentation-options-grid" style="display: grid; gap: 1rem; margin-top: 1rem;">
                        <label class="documentation-option-card" style="padding: 1rem; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="airfreight-doc-handling" value="vcanship-handle" style="margin-right: 0.5rem;">
                            <strong>Vcanship Handles Documentation</strong>
                            <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">We'll prepare all required documents (certificates, tax forms, compliance) for an additional fee.</p>
                        </label>
                        <label class="documentation-option-card" style="padding: 1rem; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="airfreight-doc-handling" value="i-handle" style="margin-right: 0.5rem;">
                            <strong>I'll Handle Documentation</strong>
                            <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">I'll provide all required documents myself. Upload them below.</p>
                        </label>
                        <label class="documentation-option-card" style="padding: 1rem; border: 2px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="airfreight-doc-handling" value="skip" style="margin-right: 0.5rem;">
                            <strong>Skip for Now / Use My Forwarding Agent</strong>
                            <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">I'll handle documentation separately or use my own forwarding agent.</p>
                        </label>
                    </div>
                    
                    <!-- Document Upload Section -->
                    <div id="airfreight-document-upload-section" style="margin-top: 1.5rem; display: none;">
                        <h5><i class="fa-solid fa-file-arrow-up"></i> Upload Your Documents</h5>
                        <div id="airfreight-compliance-docs-list" class="compliance-checklist"></div>
                        <div class="file-upload-area" id="airfreight-general-upload-area" style="margin-top: 1rem; padding: 2rem; border: 2px dashed var(--border-color); border-radius: 8px; text-align: center; cursor: pointer;">
                            <i class="fa-solid fa-cloud-arrow-up" style="font-size: 2rem; color: var(--primary-orange); margin-bottom: 0.5rem;"></i>
                            <p>Drag & drop files or click to upload</p>
                            <small style="color: var(--text-secondary);">PDF, JPG, PNG - Max 10MB each</small>
                            <input type="file" id="airfreight-general-doc-input" multiple accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
                        </div>
                        <div id="airfreight-uploaded-files-list" style="margin-top: 1rem;"></div>
                    </div>
                    
                    <!-- Forwarding Agent Details -->
                    <div id="airfreight-forwarding-agent-section" style="margin-top: 1.5rem; display: none;">
                        <h5><i class="fa-solid fa-handshake"></i> Your Forwarding Agent Details (Optional)</h5>
                        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                            <div class="input-wrapper">
                                <label>Agent Name/Company</label>
                                <input type="text" id="airfreight-agent-name" placeholder="e.g., ABC Forwarding Ltd">
                            </div>
                            <div class="input-wrapper">
                                <label>Contact Email</label>
                                <input type="email" id="airfreight-agent-email" placeholder="agent@example.com">
                            </div>
                        </div>
                        <p class="helper-text" style="margin-top: 0.5rem;">We'll coordinate with your agent if needed.</p>
                    </div>
                </div>
                
                <div class="form-actions" style="justify-content: space-between; margin-top: 1.5rem;">
                    <button type="button" id="airfreight-back-to-dims-btn" class="secondary-btn">Back</button>
                    <button type="button" id="airfreight-to-agreement-btn" class="main-submit-btn" disabled>Proceed with Selected Quote</button>
                </div>
            </div>
            
            <!-- Step 4: Agreement -->
            <div id="airfreight-step-4" class="service-step">
                 <h3>Agreement & Finalization</h3>
                 <div class="two-column">
                    <div>
                        <h4>Booking Summary</h4>
                        <div id="airfreight-agreement-summary" class="payment-overview"></div>
                        <div class="checkbox-wrapper" style="margin-top: 1.5rem;"><input type="checkbox" id="airfreight-compliance-ack"><label for="airfreight-compliance-ack">I acknowledge my responsibility for providing the required compliance documents.</label></div>
                    </div>
                    <div>
                        <h4>Digital Signature</h4>
                        <div class="input-wrapper"><label for="airfreight-signer-name">Sign by Typing Your Full Name</label><input type="text" id="airfreight-signer-name"></div>
                        <label>Sign in the box below</label>
                        <canvas id="airfreight-signature-pad" width="400" height="150" style="border: 2px solid var(--border-color); border-radius: 8px; cursor: crosshair;"></canvas>
                    </div>
                 </div>
                 <div class="form-actions" style="justify-content: space-between;">
                    <button type="button" id="airfreight-back-to-compliance-btn" class="secondary-btn">Back</button>
                    <button type="button" id="airfreight-confirm-booking-btn" class="main-submit-btn" disabled>Confirm Booking Request</button>
                </div>
            </div>

            <!-- Step 5: Confirmation -->
            <div id="airfreight-step-5" class="service-step">
                <div class="confirmation-container">
                    <h3>Booking Request Confirmed!</h3>
                    <p>Your Air Freight booking is confirmed. Our operations team will be in touch to coordinate the next steps.</p>
                    <div class="confirmation-tracking"><h4>Booking ID</h4><div class="tracking-id-display" id="airfreight-booking-id"></div></div>
                    <div class="confirmation-actions">
                         <button id="airfreight-download-pdf-btn" class="secondary-btn">Download Summary (PDF)</button>
                         <button id="airfreight-new-shipment-btn" class="main-submit-btn">New Shipment</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}


function renderCargoPieces() {
    const list = document.getElementById('airfreight-cargo-list');
    if (!list) return;
    list.innerHTML = cargoPieces.map((item, index) => `
        <div class="airfreight-cargo-item card" data-index="${index}">
             <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 1rem; align-items: flex-end;">
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Pieces</label><input type="number" class="airfreight-cargo-pieces" value="${item.pieces}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Length(cm)</label><input type="number" class="airfreight-cargo-length" value="${item.length}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Width(cm)</label><input type="number" class="airfreight-cargo-width" value="${item.width}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Height(cm)</label><input type="number" class="airfreight-cargo-height" value="${item.height}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Weight(kg)</label><input type="number" class="airfreight-cargo-weight" value="${item.weight}" min="1" required></div>
                <button type="button" class="secondary-btn airfreight-remove-piece-btn" style="margin-bottom: 0.5rem;">Remove</button>
            </div>
        </div>
    `).join('');
    updateCargoSummary();
}

function addCargoPiece() {
    cargoPieces.push({ id: Date.now(), pieces: 1, length: 50, width: 50, height: 50, weight: 20 });
    renderCargoPieces();
}

function updateAndRecalculateCargo(): number {
    const newItems: AirfreightCargoPiece[] = [];
    document.querySelectorAll('.airfreight-cargo-item').forEach(itemEl => {
        newItems.push({
            id: Date.now(),
            pieces: parseInt((itemEl.querySelector('.airfreight-cargo-pieces') as HTMLInputElement).value, 10) || 0,
            length: parseInt((itemEl.querySelector('.airfreight-cargo-length') as HTMLInputElement).value, 10) || 0,
            width: parseInt((itemEl.querySelector('.airfreight-cargo-width') as HTMLInputElement).value, 10) || 0,
            height: parseInt((itemEl.querySelector('.airfreight-cargo-height') as HTMLInputElement).value, 10) || 0,
            weight: parseInt((itemEl.querySelector('.airfreight-cargo-weight') as HTMLInputElement).value, 10) || 0,
        });
    });
    cargoPieces = newItems;
    return updateCargoSummary();
}

function updateCargoSummary(): number {
    const summaryEl = document.getElementById('airfreight-cargo-summary');
    if (!summaryEl) return 0;

    let totalVolume = 0;
    let totalWeight = 0;
    cargoPieces.forEach(item => {
        totalVolume += (item.length * item.width * item.height) / 1000000 * item.pieces; // CBM
        totalWeight += item.weight * item.pieces;
    });

    const chargeableWeight = Math.max(totalWeight, totalVolume * 167); // IATA standard: 1 CBM = 167 kg

    if (cargoPieces.length > 0) {
        summaryEl.innerHTML = `
            <div class="review-item"><span>Total Actual Weight:</span><strong>${totalWeight.toFixed(2)} kg</strong></div>
            <div class="review-item"><span>Total Volume:</span><strong>${totalVolume.toFixed(3)} m³</strong></div>
            <div class="review-item total"><span>Chargeable Weight:</span><strong>${chargeableWeight.toFixed(2)} kg</strong></div>
        `;
    } else {
        summaryEl.innerHTML = '';
    }
    return chargeableWeight;
}

async function handleGetQuote() {
    const chargeableWeight = updateAndRecalculateCargo();
    if (cargoPieces.length === 0) {
        showToast("Please add at least one cargo piece.", "error");
        return;
    }

    const details: AirfreightDetails = {
        originAirport: (document.getElementById('airfreight-origin') as HTMLInputElement).value,
        destAirport: (document.getElementById('airfreight-destination') as HTMLInputElement).value,
        cargoDescription: (document.getElementById('airfreight-cargo-description') as HTMLTextAreaElement).value,
        hsCode: (document.getElementById('airfreight-hs-code') as HTMLInputElement).value,
        cargoPieces: cargoPieces,
        chargeableWeight: chargeableWeight,
        serviceLevel: 'standard', 
        cargoCategory: '', 
    };
    setState({ airfreightDetails: details });
    
    // Show skeleton loader immediately
    const skeletonLoader = await import('./skeleton-loader');
    skeletonLoader.showSkeletonLoader({
        service: 'air',
        estimatedTime: 10,
        showCarrierLogos: true,
        showProgressBar: true
    });
    
    toggleLoading(true, "Analyzing your shipment...");
    try {
        // Try Sea Rates API first (real quotes for air freight)
        try {
            const { fetchSeaRatesQuotes } = await import('./backend-api');
            const realQuotes = await fetchSeaRatesQuotes({
                serviceType: 'air',
                origin: details.originAirport,
                destination: details.destAirport,
                cargo: {
                    description: details.cargoDescription,
                    weight: details.chargeableWeight,
                    hsCode: details.hsCode
                },
                currency: State.currentCurrency.code
            });
            
            currentAirfreightQuotes = realQuotes.map((q: any) => ({
                ...q,
                carrierType: "Air Carrier",
                chargeableWeight: details.chargeableWeight,
                chargeableWeightUnit: "KG",
                weightBasis: "Chargeable Weight",
                isSpecialOffer: false,
                serviceProvider: 'Sea Rates API'
            }));
            
            skeletonLoader.hideSkeletonLoader();
            setState({ airfreightComplianceDocs: [] });
            renderQuoteAndComplianceStep({ status: 'verified', summary: 'Rates from Sea Rates API', requirements: [] });
            goToAirfreightStep(3);
            
            // Show email form
            setTimeout(async () => {
                const { attachEmailInquiryListeners, renderEmailInquiryForm } = await import('./email-inquiry-form');
                const quotesContainer = document.getElementById('airfreight-quotes-container');
                if (quotesContainer && !document.getElementById('airfreight-email-inquiry-form-container')) {
                    const emailContainer = document.createElement('div');
                    emailContainer.id = 'airfreight-email-inquiry-form-container';
                    quotesContainer.parentElement?.insertBefore(emailContainer, quotesContainer.nextSibling);
                    emailContainer.innerHTML = renderEmailInquiryForm('airfreight', currentAirfreightQuotes, details);
                    attachEmailInquiryListeners('airfreight', currentAirfreightQuotes, details);
                }
            }, 100);
            return;
        } catch (apiError: any) {
            console.warn('Sea Rates API not available, using AI estimates:', apiError);
            // Fall back to AI estimates
        }
        
        if (!State.api) throw new Error("API not initialized");
        
        const prompt = `Act as a logistics pricing expert for Air Freight. Provide a JSON response with realistic quotes from 3 different air carriers (e.g., Lufthansa Cargo, Emirates SkyCargo, Cathay Cargo) and a compliance checklist.
        - Origin Airport (IATA): ${details.originAirport}
        - Destination Airport (IATA): ${details.destAirport}
        - Chargeable Weight: ${details.chargeableWeight.toFixed(2)} kg
        - Cargo: ${details.cargoDescription}.
        - HS Code: ${details.hsCode || 'Not Provided'}.
        - Currency: ${State.currentCurrency.code}.
        
        The response must be a JSON object with keys "quotes" and "complianceReport".
        The "quotes" array should contain objects, each with carrierName, estimatedTransitTime, and totalCost. Apply a ${MARKUP_CONFIG.airfreight.standard * 100}% markup to a realistic base cost per kg to calculate totalCost.
        The "complianceReport" should have status, summary, and a list of requirements (each with title and description), including a check for dangerous goods if the cargo description mentions batteries, electronics, etc.
        Your response MUST be a single JSON object matching the provided schema.`;

        const responseSchema = {
            type: SchemaType.OBJECT,
            properties: {
                quotes: {
                    type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: {
                        carrierName: { type: SchemaType.STRING },
                        estimatedTransitTime: { type: SchemaType.STRING },
                        totalCost: { type: SchemaType.NUMBER }
                    }}
                },
                complianceReport: {
                    type: SchemaType.OBJECT, properties: {
                        status: { type: SchemaType.STRING }, summary: { type: SchemaType.STRING },
                        requirements: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: {
                            title: { type: SchemaType.STRING }, description: { type: SchemaType.STRING }
                        }}},
                        taxInformation: { type: SchemaType.STRING },
                        certificates: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: {
                            name: { type: SchemaType.STRING }, type: { type: SchemaType.STRING }, description: { type: SchemaType.STRING }
                        }}}
                    }
                }
            }
        };

        const model = State.api.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });
        const result = await model.generateContent(prompt);
        const parsedResult = JSON.parse(result.response.text());

        currentAirfreightQuotes = parsedResult.quotes.map((q: any) => ({
            ...q, carrierType: "Air Carrier", chargeableWeight: details.chargeableWeight,
            chargeableWeightUnit: "KG", weightBasis: "Chargeable Weight", isSpecialOffer: false,
            costBreakdown: {
                baseShippingCost: q.totalCost / (1 + MARKUP_CONFIG.airfreight.standard),
                fuelSurcharge: 0, estimatedCustomsAndTaxes: 0, optionalInsuranceCost: 0,
                ourServiceFee: q.totalCost - (q.totalCost / (1 + MARKUP_CONFIG.airfreight.standard))
            }, serviceProvider: 'Vcanship AI'
        }));

        const docs: ComplianceDoc[] = parsedResult.complianceReport.requirements.map((r: any) => ({ ...r, id: `doc-${r.title.replace(/\s/g, '-')}`, status: 'pending', file: null, required: true }));
        setState({ airfreightComplianceDocs: docs });

        skeletonLoader.hideSkeletonLoader();
        
        renderQuoteAndComplianceStep(parsedResult.complianceReport);
        goToAirfreightStep(3);
    } catch (error) {
        skeletonLoader.hideSkeletonLoader();
        showToast("Failed to get quote and compliance.", "error");
    } finally {
        toggleLoading(false);
    }
}

function renderAirfreightComplianceDocsList() {
    const docsList = document.getElementById('airfreight-compliance-docs-list');
    if (!docsList || !State.airfreightComplianceDocs || State.airfreightComplianceDocs.length === 0) return;
    
    docsList.innerHTML = State.airfreightComplianceDocs.map(doc => `
        <div class="compliance-doc-item" id="airfreight-doc-${doc.id}" data-status="${doc.status}">
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

function handleAirfreightDocumentUpload(files: FileList) {
    if (!State.airfreightComplianceDocs || State.airfreightComplianceDocs.length === 0) {
        showToast('Please wait for compliance report to load first', 'warning');
        return;
    }
    
    Array.from(files).forEach(file => {
        const matchingDoc = State.airfreightComplianceDocs?.find(doc => 
            doc.title.toLowerCase().includes('invoice') && file.name.toLowerCase().includes('invoice') ||
            doc.title.toLowerCase().includes('packing') && file.name.toLowerCase().includes('packing') ||
            doc.title.toLowerCase().includes('certificate') && file.name.toLowerCase().includes('cert')
        ) || State.airfreightComplianceDocs?.[0];
        
        if (matchingDoc) {
            const updatedDocs = State.airfreightComplianceDocs?.map(doc => 
                doc.id === matchingDoc.id ? { ...doc, file, status: 'uploaded' as const } : doc
            );
            setState({ airfreightComplianceDocs: updatedDocs });
        }
    });
    
    renderAirfreightComplianceDocsList();
    showToast(`Uploaded ${files.length} document(s)`, 'success');
}

async function renderQuoteAndComplianceStep(complianceReport: any) {
    const sidebarContainer = document.getElementById('airfreight-sidebar-container');
    const controlsContainer = document.getElementById('airfreight-results-controls');
    
    if (sidebarContainer) {
        sidebarContainer.innerHTML = `
             <div class="results-section">
                <h3><i class="fa-solid fa-file-shield"></i> Compliance Report</h3>
                <div class="compliance-report">
                    <p>${complianceReport.summary}</p>
                    <ul>${complianceReport.requirements?.map((req: any) => `<li><strong>${req.title}</strong>${req.description ? `: ${req.description}` : ''}</li>`).join('') || ''}</ul>
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
             </div>
             <div class="quote-confirmation-panel">
                <h4>This is an AI Estimate</h4>
                <p>An agent will contact you to confirm details and provide a final quote before booking.</p>
            </div>
        `;
        
        // Attach download handlers for certificates
        sidebarContainer.querySelectorAll('.download-cert-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const certType = (e.target as HTMLElement).closest('.download-cert-btn')?.getAttribute('data-cert-type');
                if (certType) {
                    await generateAndDownloadAirfreightCertificate(certType);
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
    
    sortAndRenderAirfreightQuotes('price');
}


function sortAndRenderAirfreightQuotes(sortBy: 'price' | 'speed') {
    const quotesContainer = document.getElementById('airfreight-quotes-container');
    if (!quotesContainer) return;

    const sortedQuotes = [...currentAirfreightQuotes];
    const parseTransit = (time: string) => parseInt(time.split('-')[0]);

    if (sortBy === 'price') {
        sortedQuotes.sort((a, b) => a.totalCost - b.totalCost);
    } else {
        sortedQuotes.sort((a, b) => parseTransit(a.estimatedTransitTime) - parseTransit(b.estimatedTransitTime));
    }
    
    quotesContainer.innerHTML = sortedQuotes.map(q => createQuoteCard(q)).join('');

    document.querySelectorAll('#airfreight-results-controls .sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-sort') === sortBy);
    });
}


function initializeSignaturePad() {
    canvas = document.getElementById('airfreight-signature-pad') as HTMLCanvasElement;
    if (!canvas) return;
    ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2;
    
    const startPosition = (e: MouseEvent | TouchEvent) => { painting = true; draw(e); };
    const finishedPosition = () => { painting = false; ctx.beginPath(); validateAgreement(); };
    const draw = (e: MouseEvent | TouchEvent) => {
        if (!painting) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const pos = e instanceof MouseEvent ? e : e.touches[0];
        ctx.lineTo(pos.clientX - rect.left, pos.clientY - rect.top);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.clientX - rect.left, pos.clientY - rect.top);
    };

    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', finishedPosition);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', startPosition);
    canvas.addEventListener('touchend', finishedPosition);
    canvas.addEventListener('touchmove', draw);
}

function validateAgreement() {
    const ack = (document.getElementById('airfreight-compliance-ack') as HTMLInputElement).checked;
    const name = (document.getElementById('airfreight-signer-name') as HTMLInputElement).value.trim();
    (document.getElementById('airfreight-confirm-booking-btn') as HTMLButtonElement).disabled = !(ack && name && !isCanvasBlank());
}

function isCanvasBlank() {
    if (!canvas) return true;
    return !canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0);
}


function generateAirfreightSummaryPdf() {
    const { airfreightDetails, airfreightQuote, airfreightBookingId } = State;
    if (!airfreightDetails || !airfreightQuote || !airfreightBookingId) {
        showToast('Cannot generate PDF, missing data.', 'error'); return;
    }
    const doc = new jsPDF();
    doc.text('Air Freight Booking Summary', 14, 20);
    doc.text(`Booking ID: ${airfreightBookingId}`, 14, 28);

    autoTable(doc, {
        startY: 35,
        head: [['Detail', 'Information']],
        body: [
            ['Route', `${airfreightDetails.originAirport} -> ${airfreightDetails.destAirport}`],
            ['Cargo', airfreightDetails.cargoDescription],
            ['Chargeable Weight', `${airfreightDetails.chargeableWeight.toFixed(2)} KG`],
            ['Carrier', airfreightQuote.carrierName],
            ['Est. Transit', airfreightQuote.estimatedTransitTime],
            ['Est. Total Cost', `${State.currentCurrency.symbol}${airfreightQuote.totalCost.toFixed(2)}`]
        ]
    });

    const cargoData = airfreightDetails.cargoPieces.map(c => [c.pieces, `${c.length}x${c.width}x${c.height}cm`, `${c.weight}kg`]);
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Pieces', 'Dimensions', 'Weight']],
        body: cargoData
    });
    
    doc.save(`Vcanship_AIR_${airfreightBookingId}.pdf`);
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


function attachAirfreightEventListeners() {
    const page = document.getElementById('page-airfreight');
    if (!page) return;

    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
    
    page.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        if (target.closest('.sort-btn')) {
            sortAndRenderAirfreightQuotes(target.dataset.sort as 'price' | 'speed');
        }
        const selectBtn = target.closest<HTMLButtonElement>('.select-quote-btn');
        if (selectBtn?.dataset.quote) {
            const quote: Quote = JSON.parse(selectBtn.dataset.quote.replace(/&quot;/g, '"'));
            setState({ airfreightQuote: quote });
            document.querySelectorAll('#airfreight-quotes-container .quote-card').forEach(c => c.classList.remove('selected'));
            selectBtn.closest('.quote-card')?.classList.add('selected');
            (document.getElementById('airfreight-to-agreement-btn') as HTMLButtonElement).disabled = false;
        }
         if (target.closest('#airfreight-hs-image-suggester-btn')) {
            document.getElementById('airfreight-hs-image-input')?.click();
        }
    });
    
    // Nav
    document.getElementById('airfreight-to-dims-btn')?.addEventListener('click', () => goToAirfreightStep(2));
    document.getElementById('airfreight-back-to-details-btn')?.addEventListener('click', () => goToAirfreightStep(1));
    document.getElementById('airfreight-to-quote-btn')?.addEventListener('click', handleGetQuote);
    document.getElementById('airfreight-back-to-dims-btn')?.addEventListener('click', () => goToAirfreightStep(2));
    document.getElementById('airfreight-to-agreement-btn')?.addEventListener('click', () => {
        const summaryEl = document.getElementById('airfreight-agreement-summary');
        if (summaryEl && State.airfreightQuote) {
             summaryEl.innerHTML = `
                <div class="review-item"><span>Carrier:</span><strong>${State.airfreightQuote.carrierName}</strong></div>
                <div class="review-item"><span>Transit Time:</span><strong>~${State.airfreightQuote.estimatedTransitTime}</strong></div>
                <hr>
                <div class="review-item total"><span>Est. Total Cost:</span><strong>${State.currentCurrency.symbol}${State.airfreightQuote.totalCost.toFixed(2)}</strong></div>
            `;
        }
        goToAirfreightStep(4);
    });
    document.getElementById('airfreight-back-to-compliance-btn')?.addEventListener('click', () => goToAirfreightStep(3));
    document.getElementById('airfreight-confirm-booking-btn')?.addEventListener('click', () => {
        const bookingId = `AIR-${Date.now().toString().slice(-6)}`;
        setState({ airfreightBookingId: bookingId });
        (document.getElementById('airfreight-booking-id') as HTMLElement).textContent = bookingId;
        goToAirfreightStep(5);
    });
    document.getElementById('airfreight-new-shipment-btn')?.addEventListener('click', startAirfreight);
    document.getElementById('airfreight-download-pdf-btn')?.addEventListener('click', generateAirfreightSummaryPdf);

    // Cargo pieces
    document.getElementById('airfreight-add-piece-btn')?.addEventListener('click', addCargoPiece);
    const cargoList = document.getElementById('airfreight-cargo-list');
    cargoList?.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.airfreight-remove-piece-btn')) {
            const index = parseInt((e.target as HTMLElement).closest<HTMLElement>('.airfreight-cargo-item')?.dataset.index || '-1');
            if (index > -1) {
                cargoPieces.splice(index, 1);
                renderCargoPieces();
            }
        }
    });
    cargoList?.addEventListener('change', updateAndRecalculateCargo);

    // Agreement
    document.getElementById('airfreight-compliance-ack')?.addEventListener('change', validateAgreement);
    document.getElementById('airfreight-signer-name')?.addEventListener('input', validateAgreement);

    // Auto-assign HS Code for international shipments when description is present
    const descAutoEl = document.getElementById('airfreight-cargo-description') as HTMLTextAreaElement | null;
    const hsAutoEl = document.getElementById('airfreight-hs-code') as HTMLInputElement | null;
    const originEl = document.getElementById('airfreight-origin') as HTMLInputElement | null;
    const destEl = document.getElementById('airfreight-destination') as HTMLInputElement | null;
    let autoHsDebounce: any = null;
    descAutoEl?.addEventListener('input', () => {
        if (!descAutoEl || !hsAutoEl) return;
        const desc = descAutoEl.value.trim();
        if (!desc || desc.length < 3) return;
        if (hsAutoEl.value && hsAutoEl.value.length >= 4) return;
        const oc = detectCountry((originEl?.value || '').trim());
        const dc = detectCountry((destEl?.value || '').trim());
        if (!(oc && dc && oc !== dc)) return;
        clearTimeout(autoHsDebounce);
        autoHsDebounce = setTimeout(async () => {
            try {
                const suggestions = await getHsCodeSuggestions(desc);
                if (suggestions && suggestions.length > 0 && !hsAutoEl.value) {
                    hsAutoEl.value = suggestions[0].code;
                }
            } catch {}
        }, 600);
    });

    // HS Code Suggester
    let hsCodeTimeout: number;
    const descInput = document.getElementById('airfreight-cargo-description') as HTMLInputElement;
    const hsCodeInput = document.getElementById('airfreight-hs-code') as HTMLInputElement;
    const suggestionsContainer = document.getElementById('airfreight-hs-code-suggestions');
    descInput?.addEventListener('input', () => {
        clearTimeout(hsCodeTimeout);
        if (!suggestionsContainer) return;
        const query = descInput.value.trim();
        if (query.length < 5) {
            suggestionsContainer.classList.remove('active'); return;
        }
        hsCodeTimeout = window.setTimeout(async () => {
            const suggestions = await getHsCodeSuggestions(query);
            if (suggestions.length > 0) {
                suggestionsContainer.innerHTML = suggestions.map(s => `<div class="hs-code-suggestion-item" data-code="${s.code}"><strong>${s.code}</strong> - ${s.description}</div>`).join('');
                suggestionsContainer.classList.add('active');
                if (hsCodeInput.value === '') hsCodeInput.value = suggestions[0].code;
            } else {
                suggestionsContainer.classList.remove('active');
            }
        }, 500);
    });
    suggestionsContainer?.addEventListener('click', e => {
        const item = (e.target as HTMLElement).closest<HTMLElement>('.hs-code-suggestion-item');
        if (item?.dataset.code) {
            hsCodeInput.value = item.dataset.code;
            suggestionsContainer.classList.remove('active');
        }
    });

    const hsImageInput = document.getElementById('airfreight-hs-image-input') as HTMLInputElement;
    hsImageInput?.addEventListener('change', () => {
        const file = hsImageInput.files?.[0];
        if (file) {
            suggestHsCodeFromImage(file, 'airfreight-hs-code');
        }
    });
    
    // Documentation handling options
    const docHandlingRadios = document.querySelectorAll('input[name="airfreight-doc-handling"]');
    docHandlingRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const value = (e.target as HTMLInputElement).value;
            const uploadSection = document.getElementById('airfreight-document-upload-section');
            const agentSection = document.getElementById('airfreight-forwarding-agent-section');
            
            if (uploadSection) uploadSection.style.display = value === 'i-handle' ? 'block' : 'none';
            if (agentSection) agentSection.style.display = value === 'skip' ? 'block' : 'none';
            
            if (value === 'i-handle' && State.airfreightComplianceDocs) {
                renderAirfreightComplianceDocsList();
            }
        });
    });
    
    // Document upload handlers
    const generalUploadArea = document.getElementById('airfreight-general-upload-area');
    const generalDocInput = document.getElementById('airfreight-general-doc-input') as HTMLInputElement;
    
    generalUploadArea?.addEventListener('click', () => generalDocInput?.click());
    generalDocInput?.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
            handleAirfreightDocumentUpload(files);
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
            handleAirfreightDocumentUpload(files);
        }
    });
}

async function generateAndDownloadAirfreightCertificate(certType: string) {
    if (!State.airfreightDetails || !State.api) {
        showToast('Missing shipment details or AI service not available', 'error');
        return;
    }
    
    toggleLoading(true, `Generating ${certType} certificate...`);
    
    try {
        const prompt = `Generate a ${certType} certificate for this air freight shipment:
        - Cargo: ${State.airfreightDetails.cargoDescription}
        - HS Code: ${State.airfreightDetails.hsCode || 'Not provided'}
        - Origin: ${State.airfreightDetails.originAirport || 'Not provided'}
        - Destination: ${State.airfreightDetails.destAirport || 'Not provided'}
        - Chargeable Weight: ${State.airfreightDetails.chargeableWeight} kg
        
        Provide a professional certificate in JSON format with: issuer, date, cargo details, certification statement, and signatory information.`;
        
        const model = State.api.getGenerativeModel({
            model: 'gemini-1.5-flash-8b',
            generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent(prompt);
        
        const certData = JSON.parse(result.response.text());
        await generateAirfreightCertificatePDF(certType, certData);
        showToast(`${certType} certificate downloaded`, 'success');
    } catch (error) {
        console.error('Certificate generation error:', error);
        showToast('Failed to generate certificate', 'error');
    } finally {
        toggleLoading(false);
    }
}

async function generateAirfreightCertificatePDF(certType: string, certData: any) {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(certData.name || `${certSchemaType.toUpperCase()} Certificate`, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('VCANSHIP OneStop Logistics', 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    let yPos = 50;
    doc.text(`Issued Date: ${certData.date || new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 10;
    doc.text(`Certificate Type: ${certData.type || certType}`, 20, yPos);
    yPos += 15;
    
    doc.setFontSize(14);
    doc.text('Cargo Details:', 20, yPos);
    yPos += 10;
    doc.setFontSize(11);
    if (State.airfreightDetails) {
        doc.text(`Description: ${State.airfreightDetails.cargoDescription}`, 20, yPos);
        yPos += 8;
        doc.text(`HS Code: ${State.airfreightDetails.hsCode || 'Not provided'}`, 20, yPos);
        yPos += 8;
        doc.text(`Origin: ${State.airfreightDetails.originAirport || 'N/A'}`, 20, yPos);
        yPos += 8;
        doc.text(`Destination: ${State.airfreightDetails.destAirport || 'N/A'}`, 20, yPos);
        yPos += 8;
        doc.text(`Chargeable Weight: ${State.airfreightDetails.chargeableWeight} kg`, 20, yPos);
        yPos += 10;
    }
    
    doc.setFontSize(12);
    doc.text('Certification Statement:', 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    const statement = certData.statement || `This is to certify that the goods described above are as stated and meet the requirements for ${certType}.`;
    doc.text(doc.splitTextToSize(statement, 170), 20, yPos);
    yPos += 20;
    
    doc.setFontSize(11);
    doc.text('Authorized Signatory', 20, yPos);
    yPos += 8;
    doc.text(certData.signatory || 'Vcanship Operations Team', 20, yPos);
    
    const filename = `airfreight-${certType}-certificate-${Date.now()}.pdf`;
    doc.save(filename);
}

export function startAirfreight() {
    setState({ currentService: 'airfreight' });
    resetAirfreightState();
    cargoPieces = [];
    renderAirfreightPage();
    switchPage('airfreight');
    attachAirfreightEventListeners();
    goToAirfreightStep(1);
    addCargoPiece();
}
