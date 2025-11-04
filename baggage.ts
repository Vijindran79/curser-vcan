// baggage.ts
import { State, setState, resetBaggageState, Address } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';
import { MARKUP_CONFIG } from './pricing';

function goToBaggageStep(step: 'details' | 'quote' | 'payment' | 'confirmation') {
    const container = document.getElementById('page-baggage');
    if (!container) return;

    const steps = ['details', 'quote', 'payment', 'confirmation'];
    const currentStepIndex = steps.indexOf(step);
    updateProgressBar('baggage', currentStepIndex);

    document.querySelectorAll('#page-baggage .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`baggage-step-${step}`)?.classList.add('active');
}

function renderBaggagePage() {
    const page = document.getElementById('page-baggage');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn static-link" data-page="landing">Back to Services</button>
        <div class="service-page-header" style="text-align: center; padding: 4rem 2rem;">
            <div style="font-size: 4rem; color: var(--primary-orange); margin-bottom: 1.5rem;">
                <i class="fa-solid fa-clock"></i>
            </div>
            <h2 style="color: var(--primary-orange); margin-bottom: 1rem;">Coming Soon</h2>
            <p class="subtitle" style="font-size: 1.2rem; max-width: 600px; margin: 0 auto;">
                Personal Baggage shipping service will be available soon. All services will be available soon.
            </p>
            <div style="margin-top: 2rem;">
                <p style="color: var(--text-secondary); font-size: 0.95rem;">
                    We're working hard to bring you this service. Check back soon for updates!
                </p>
            </div>
            <div style="margin-top: 3rem;">
                <button class="main-submit-btn static-link" data-page="landing">
                    <i class="fa-solid fa-arrow-left"></i> Back to Services
                </button>
            </div>
        </div>
    `;
}

function updateAddressFields(serviceType: string) {
    const originContainer = document.getElementById('baggage-origin-fields');
    const destContainer = document.getElementById('baggage-destination-fields');
    if (!originContainer || !destContainer) return;

    const addressHtml = (type: 'origin' | 'destination') => `
        <div class="input-wrapper"><label for="baggage-${type}-street">Street Address</label><input type="text" id="baggage-${type}-street" required></div>
        <div class="form-grid">
            <div class="input-wrapper"><label for="baggage-${type}-city">City</label><input type="text" id="baggage-${type}-city" required></div>
            <div class="input-wrapper"><label for="baggage-${type}-country">Country</label><input type="text" id="baggage-${type}-country" required></div>
        </div>
    `;
    const airportHtml = (type: 'origin' | 'destination') => `
        <div class="input-wrapper"><label for="baggage-${type}-airport">Airport Code (IATA)</label><input type="text" id="baggage-${type}-airport" required placeholder="e.g., LHR"></div>
    `;
    
    if (serviceType.startsWith('door-to')) {
        originContainer.innerHTML = addressHtml('origin');
    } else {
        originContainer.innerHTML = airportHtml('origin');
    }

    if (serviceType.endsWith('-to-door')) {
        destContainer.innerHTML = addressHtml('destination');
    } else {
        destContainer.innerHTML = airportHtml('destination');
    }
}


async function handleBaggageFormSubmit(e: Event) {
    e.preventDefault();
    toggleLoading(true, "Calculating your estimate...");

    const serviceType = (document.getElementById('baggage-service-type') as HTMLSelectElement).value;
    const weight = (document.getElementById('baggage-weight') as HTMLInputElement).value;
    
    let origin, destination;
    if (serviceType.startsWith('door-to')) {
        origin = `${(document.getElementById('baggage-origin-city') as HTMLInputElement).value}, ${(document.getElementById('baggage-origin-country') as HTMLInputElement).value}`;
    } else {
        origin = (document.getElementById('baggage-origin-airport') as HTMLInputElement).value;
    }
    if (serviceType.endsWith('-to-door')) {
        destination = `${(document.getElementById('baggage-destination-city') as HTMLInputElement).value}, ${(document.getElementById('baggage-destination-country') as HTMLInputElement).value}`;
    } else {
        destination = (document.getElementById('baggage-destination-airport') as HTMLInputElement).value;
    }

    const prompt = `
        Act as a logistics pricing expert. Provide an estimated cost for shipping personal baggage.
        - Service Type: ${serviceType}
        - Origin: ${origin}
        - Destination: ${destination}
        - Total Weight: ${weight} kg
        - Currency: ${State.currentCurrency.code}

        Provide a single estimated base cost as a number. Do not add any other text or formatting.
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

        const markup = MARKUP_CONFIG.baggage.standard;
        const finalPrice = baseCost * (1 + markup);

        const quoteContainer = document.getElementById('baggage-quote-container');
        if (quoteContainer) {
            quoteContainer.innerHTML = `
                <div class="payment-overview">
                    <div class="review-item"><span>Service:</span><strong>${serviceType}</strong></div>
                    <div class="review-item"><span>Route:</span><strong>${origin} &rarr; ${destination}</strong></div>
                    <div class="review-item"><span>Weight:</span><strong>${weight} kg</strong></div>
                    <hr>
                    <div class="review-item total"><span>Estimated Total:</span><strong>${State.currentCurrency.symbol}${finalPrice.toFixed(2)}</strong></div>
                </div>
            `;
        }
        goToBaggageStep('quote');
    } catch (error) {
        console.error("Baggage quote error:", error);
        showToast("Could not generate an estimate. Please try again.", "error");
    } finally {
        toggleLoading(false);
    }
}


function attachBaggageEventListeners() {
    // Back button is handled by static-link delegation in index.tsx
    // No other listeners needed for Coming Soon page
}


export function startBaggage() {
    setState({ currentService: 'baggage' });
    resetBaggageState();
    switchPage('baggage');
    renderBaggagePage();
    attachBaggageEventListeners();
}
