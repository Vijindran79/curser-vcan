// payment.ts
import { State, setState, type Quote, type Address } from './state';
import { showToast, toggleLoading } from './ui';
import { mountService } from './router';
import { logShipment, functions } from './firebase';
// FIX: Removed unused v9 `httpsCallable` import as we are now using the v8 namespaced API.
// import { httpsCallable } from 'firebase/functions';


// Module-level variables for Stripe
declare global {
    interface Window { Stripe: any; }
}
let stripe: any = null;
let elements: any = null;
let cardElement: any = null;

// This key is publishable and safe to be exposed on the frontend.
// Using LIVE publishable key
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_live_51RnhihPyJngwy6BVAi9YTgB5kc1NMsOvqyqoJdnRFVrKAH0XvDxNWg5nBb27uObdag5nBHgAHGPEaqSa17YoYhQB006lp59yKe';

/**
 * Helper: Waits for a DOM element to appear
 * Resolves as soon as selector matches
 */
function waitForElement(selector: string, timeout: number = 10000): Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
        // Check if element already exists
        const existingElement = document.querySelector(selector) as HTMLElement;
        if (existingElement) {
            return resolve(existingElement);
        }

        // Set timeout
        const timeoutId = setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);

        // Watch for element to appear
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector) as HTMLElement;
            if (element) {
                clearTimeout(timeoutId);
                observer.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
}

/**
 * Loads the Stripe.js script dynamically.
 */
function loadStripeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.Stripe) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Stripe.js'));
        document.head.appendChild(script);
    });
}

/**
 * Renders the dynamic content of the payment summary card.
 */
function renderOrderSummary() {
    const summaryContainer = document.getElementById('payment-summary-items');
    const summaryTotalEl = document.getElementById('payment-summary-total');
    if (!summaryContainer || !summaryTotalEl || !State.paymentContext) return;

    const { quote, addons } = State.paymentContext;
    let total = quote.totalCost;

    let itemsHtml = `
        <div class="review-item">
            <span>${quote.carrierName} (${quote.carrierType})</span>
            <strong>${State.currentCurrency.symbol}${quote.totalCost.toFixed(2)}</strong>
        </div>
    `;

    if (addons && addons.length > 0) {
        addons.forEach(addon => {
            itemsHtml += `
                <div class="review-item">
                    <span>${addon.name}</span>
                    <strong>${State.currentCurrency.symbol}${addon.cost.toFixed(2)}</strong>
                </div>
            `;
            total += addon.cost;
        });
    }
    
    summaryContainer.innerHTML = itemsHtml;
    summaryTotalEl.textContent = `${State.currentCurrency.symbol}${total.toFixed(2)}`;
}

/**
 * Sets up the Stripe Elements form when the payment page is mounted.
 */
async function mountPaymentForm() {
    // Check if payment context exists (required)
    if (!State.paymentContext) {
        console.error('[Payment] No payment context found');
        showToast('Payment cannot be initiated. Please try again.', 'error');
        mountService('landing'); // Go back to safety
        return;
    }

    const { quote, addons, shipmentId } = State.paymentContext;
    let totalAmount = quote.totalCost + (addons?.reduce((sum, addon) => sum + addon.cost, 0) || 0);

    toggleLoading(true, 'Preparing secure payment...');

    try {
        // Ensure Stripe.js is loaded FIRST (before anything else)
        console.log('[Payment] Checking Stripe.js...');
        if (!window.Stripe) {
            console.log('[Payment] Loading Stripe.js...');
            await loadStripeScript();
        }
        
        // Ensure Stripe instance is initialized
        if (!stripe && window.Stripe) {
            console.log('[Payment] Initializing Stripe instance...');
            stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
        }

        if (!stripe) {
            throw new Error('Failed to initialize Stripe. Please refresh and try again.');
        }
    } catch (stripeError: any) {
        console.error('[Payment] Stripe initialization error:', stripeError);
        showToast('Failed to load payment provider. Please refresh and try again.', 'error');
        toggleLoading(false);
        return;
    }

    try {
        // FIRST: Ensure the payment page HTML exists with the container element
        // This should happen BEFORE we fetch the clientSecret so the form is visible
        console.log('[Payment] Ensuring payment page HTML exists...');
        const paymentPage = document.getElementById('page-payment');
        if (!paymentPage) {
            throw new Error('Payment page not found');
        }

        // Check if payment form HTML exists, if not create it
        let paymentForm = document.getElementById('payment-form');
        if (!paymentForm) {
            console.log('[Payment] Creating payment page HTML...');
            // Create the payment page HTML structure
            paymentPage.innerHTML = `
                <div class="payment-page-container">
                    <button class="back-btn" onclick="mountService('landing')">← Back</button>
                    <div class="payment-layout">
                        <div class="payment-main">
                            <h2>Complete Your Payment</h2>
                            <div id="payment-overview" class="payment-overview card">
                                <h3>Order Summary</h3>
                                <div id="payment-summary-items"></div>
                                <div class="payment-summary-total">
                                    <strong>Total:</strong>
                                    <span id="payment-summary-total">${State.currentCurrency.symbol}0.00</span>
                                </div>
                            </div>
                            <form id="payment-form">
                                <div class="form-section">
                                    <label for="cardholder-name">Cardholder Name</label>
                                    <input type="text" id="cardholder-name" required placeholder="Full name on card">
                                </div>
                                <div class="form-section">
                                    <label>Card Details</label>
                                    <div id="stripe-card-element" class="w-full h-16" style="width: 100%; min-height: 64px; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--background-color);"></div>
                                </div>
                                <button type="submit" id="payment-submit-btn" class="main-submit-btn">
                                    Pay ${State.currentCurrency.symbol}${totalAmount.toFixed(2)}
                                    <span class="loading-spinner-small" style="display: none;"></span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            paymentForm = document.getElementById('payment-form');
            if (paymentForm) {
                paymentForm.addEventListener('submit', handlePaymentSubmit);
            }
            // Re-render the order summary since we just created the HTML
            renderOrderSummary();
            
            // Verify the container element was created successfully
            const verifyContainer = document.getElementById('stripe-card-element');
            if (!verifyContainer) {
                console.error('[Payment] ERROR: Container element was not created in HTML!');
                throw new Error('Failed to create payment form. Please refresh and try again.');
            }
            console.log('[Payment] HTML created successfully, container element verified:', verifyContainer.id);
        } else {
            // Payment form already exists, verify container exists
            const existingContainer = document.getElementById('stripe-card-element');
            if (!existingContainer) {
                console.warn('[Payment] Payment form exists but container missing, creating fallback...');
            }
        }

        // Ensure the container element exists (should be there if we just created the HTML)
        let cardElementContainer = document.getElementById('stripe-card-element');
        if (!cardElementContainer) {
            console.log('[Payment] Container element missing, creating fallback...');
            // Fallback: create container inside the payment form
            if (paymentForm) {
                const cardSection = document.createElement('div');
                cardSection.className = 'form-section';
                cardSection.innerHTML = `
                    <label>Card Details</label>
                    <div id="stripe-card-element" class="w-full h-16" style="width: 100%; min-height: 64px; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--background-color);"></div>
                `;
                const submitBtn = paymentForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    paymentForm.insertBefore(cardSection, submitBtn);
                } else {
                    paymentForm.appendChild(cardSection);
                }
                cardElementContainer = document.getElementById('stripe-card-element');
            }
        }
        
        if (!cardElementContainer) {
            throw new Error('Failed to create Stripe container element. Please refresh the page.');
        }
        
        console.log('[Payment] Container element confirmed:', cardElementContainer ? 'EXISTS' : 'MISSING');

        // NOW: Create a Payment Intent on the server via Firebase Function V2 HTTP endpoint
        let clientSecret: string;
        
        try {
            // Call the V2 HTTP function with fetch
            const FUNCTION_URL = 'https://us-central1-vcanship-onestop-logistics.cloudfunctions.net/createPaymentIntent';
            
            const requestPayload = {
                amount: Math.round(totalAmount * 100), // Stripe expects amount in cents
                currency: State.currentCurrency.code.toLowerCase(),
                description: `Vcanship Shipment ${shipmentId}`
            };
            
            console.log('[Payment] Connecting to Firebase createPaymentIntent...');
            console.log('[Payment] Request URL:', FUNCTION_URL);
            console.log('[Payment] Request payload:', requestPayload);
            
            const response = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });

            console.log('[Payment] Response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });

            // Check if response is OK before trying to parse JSON
            if (!response.ok) {
                let errorData: any = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    // If response is not JSON, use status text
                    errorData = { message: response.statusText };
                }
                
                const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                console.error('[Payment] Failed to create payment intent:', errorMessage, errorData);
                showToast(`Payment error: ${errorMessage}`, 'error');
                toggleLoading(false);
                return;
            }

            let data: any;
            try {
                data = await response.json();
            } catch (e) {
                console.error('[Payment] Failed to parse response JSON:', e);
                showToast('Payment error: Invalid response from server', 'error');
                toggleLoading(false);
                return;
            }

            if (!data?.clientSecret) {
                console.error('[Payment] Missing clientSecret in response:', data);
                throw new Error('Payment service did not return a valid client secret.');
            }

            clientSecret = data.clientSecret;
            setState({ paymentClientSecret: clientSecret });
            console.log('[Payment] ✅ Payment Intent created successfully');
            console.log('[Payment] Client secret received:', clientSecret.substring(0, 20) + '...');
        } catch (funcError: any) {
            // Log the actual error for debugging
            console.error('[Payment] ❌ Failed to create payment intent:', funcError);
            console.error('[Payment] Error details:', {
                message: funcError.message,
                name: funcError.name,
                code: funcError.code,
                stack: funcError.stack
            });
            
            // Show specific error messages based on error type
            let errorMessage = 'Payment service temporarily unavailable';
            
            // Network errors
            if (funcError.name === 'TypeError' && (funcError.message.includes('fetch') || funcError.message.includes('Failed to fetch'))) {
                errorMessage = 'Network error: Could not connect to payment service. Please check your internet connection and try again.';
            } else if (funcError.name === 'NetworkError' || funcError.message?.includes('Failed to fetch')) {
                errorMessage = 'Network error: Could not reach Firebase payment service. Please check your connection.';
            } else if (funcError.message?.includes('CORS') || funcError.message?.includes('cross-origin')) {
                errorMessage = 'Connection error: CORS issue detected. Please contact support.';
            } else if (funcError.message?.includes('timeout') || funcError.message?.includes('timed out')) {
                errorMessage = 'Connection timeout: Payment service did not respond. Please try again.';
            } else if (funcError.message) {
                errorMessage = funcError.message;
            }
            
            console.error('[Payment] Error message shown to user:', errorMessage);
            showToast(`Payment error: ${errorMessage}`, 'error');
            
            // Don't proceed with invalid client secret
            toggleLoading(false);
            return; // Exit early - don't try to mount form with invalid secret
        }

        // Ensure container element is ready and in the DOM before mounting
        console.log('[Payment] Verifying Stripe container element is ready...');
        
        // Re-fetch the container element to ensure it's current
        cardElementContainer = document.getElementById('stripe-card-element');
        
        if (!cardElementContainer) {
            // Last resort: wait for it to appear (shouldn't happen if HTML was created correctly)
            try {
                console.log('[Payment] Container not found, waiting for element...');
                cardElementContainer = await waitForElement('#stripe-card-element', 5000);
                console.log('[Payment] Container element found after waiting!');
            } catch (waitError: any) {
                console.error('[Payment] Container element not found after waiting:', waitError);
                console.error('[Payment] Payment page HTML:', document.getElementById('page-payment')?.innerHTML?.substring(0, 500));
                throw new Error('Stripe container element not found. Please refresh the page.');
            }
        }
        
        // Verify element is actually in the DOM
        if (!document.body.contains(cardElementContainer)) {
            console.error('[Payment] Container element exists but is not in the DOM!');
            console.error('[Payment] Container parent:', cardElementContainer.parentElement);
            throw new Error('Container element is not in the DOM. Cannot mount Stripe Elements.');
        }
        
        // Verify Stripe is initialized
        if (!stripe) {
            throw new Error('Stripe is not initialized. Cannot mount payment form.');
        }
        
        console.log('[Payment] Container element ready, mounting Stripe Elements...');
        console.log('[Payment] Container element details:', {
            exists: !!cardElementContainer,
            id: cardElementContainer?.id,
            parentElement: cardElementContainer?.parentElement?.tagName,
            parentId: cardElementContainer?.parentElement?.id,
            inDocument: document.body.contains(cardElementContainer),
            offsetHeight: cardElementContainer.offsetHeight,
            offsetWidth: cardElementContainer.offsetWidth
        });
        
        // Clear any previous elements
        cardElementContainer.innerHTML = '';
        
        // Create and mount the Stripe Elements
        elements = stripe.elements({ clientSecret: clientSecret });
        cardElement = elements.create('card', {
             style: {
                base: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),                                                  
                    fontFamily: '"Poppins", sans-serif',
                    fontSmoothing: 'antialiased',
                    fontSize: '16px',
                    '::placeholder': {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--medium-gray').trim(),                                             
                    }
                },
                invalid: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--error-color').trim(),                                                 
                    iconColor: getComputedStyle(document.documentElement).getPropertyValue('--error-color').trim()                                              
                }
            }
        });

        // Mount the card element DIRECTLY to the element (not using selector string)
        // This is more reliable than using a selector
        try {
            cardElement.mount(cardElementContainer);
            console.log('[Payment] Stripe Elements mounted successfully to element:', cardElementContainer.id);
        } catch (mountError: any) {
            console.error('[Payment] Failed to mount Stripe Elements:', mountError);
            console.error('[Payment] Mount error details:', {
                message: mountError.message,
                name: mountError.name,
                element: cardElementContainer,
                elementId: cardElementContainer?.id,
                elementParent: cardElementContainer?.parentElement
            });
            throw new Error(`Failed to mount Stripe card element: ${mountError.message || 'Unknown error'}`);
        }
       
    } catch (err: any) {
        console.error('Error mounting payment form:', err);
        showToast(err.message || 'Could not prepare payment form.', 'error');
        mountService(State.paymentContext.service || 'landing'); // Go back to the service page
    } finally {
        toggleLoading(false);
    }
}

/**
 * Handles the submission of the payment form.
 */
async function handlePaymentSubmit(event: Event) {
    event.preventDefault();

    if (!stripe || !elements || !State.paymentClientSecret) {
        showToast('Payment system is not ready. Please wait.', 'error');
        return;
    }
    
    const submitButton = document.getElementById('payment-submit-btn') as HTMLButtonElement;
    const spinner = submitButton.querySelector('.loading-spinner-small') as HTMLElement;

    toggleLoading(true, 'Processing payment...');
    submitButton.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';

    try {
        const cardholderNameInput = document.getElementById('cardholder-name') as HTMLInputElement;
        const cardholderName = cardholderNameInput.value;
        
        if (!cardholderName) {
            showToast('Please enter the cardholder name.', 'error');
            throw new Error('Missing cardholder name');
        }

        const { error, paymentIntent } = await stripe.confirmCardPayment(State.paymentClientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: cardholderName,
                },
            },
        });

        if (error) {
            showToast(error.message || 'An error occurred during payment.', 'error');
            throw new Error(error.message);
        }

        if (paymentIntent && paymentIntent.status === 'succeeded') {
            showToast('Payment successful!', 'success');
            
            if (State.paymentContext) {
                 const { quote, addons, shipmentId, origin, destination, service } = State.paymentContext;
                 const totalCost = quote.totalCost + (addons?.reduce((sum, addon) => sum + addon.cost, 0) || 0);

                 // Log shipment to Supabase DB (fire-and-forget)
                 logShipment({
                    service: service,
                    tracking_id: shipmentId,
                    origin: typeof origin === 'string' ? origin : origin.street,
                    destination: typeof destination === 'string' ? destination : destination.street,
                    cost: totalCost,
                    currency: State.currentCurrency.code,
                 });

                 // Store confirmation details for the service page to pick up
                 sessionStorage.setItem('vcanship_show_confirmation', JSON.stringify(State.paymentContext));
                 
                 // Navigate to the service's confirmation page
                 mountService(service);
            }
        } else {
             showToast('Payment did not succeed. Please try again.', 'warning');
        }

    } catch (err) {
        console.error('Payment submission failed:', err);
    } finally {
        toggleLoading(false);
        submitButton.disabled = false;
        if (spinner) spinner.style.display = 'none';
    }
}

/**
 * Initializes the payment page functionality.
 */
export async function initializePaymentPage() {
    try {
        await loadStripeScript();
        
        // Suppress Stripe HTTP warnings temporarily during initialization
        const originalWarn = console.warn;
        console.warn = function(...args: any[]) {
            // Filter out Stripe HTTP warnings
            if (args.length > 0 && typeof args[0] === 'string' && 
                args[0].includes('Stripe.js') && args[0].includes('HTTP')) {
                return; // Suppress this warning
            }
            originalWarn.apply(console, args);
        };
        
        stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
        
        // Restore original console.warn after short delay to catch any async warnings
        setTimeout(() => {
            console.warn = originalWarn;
        }, 100);
    } catch (error) {
        showToast('Could not load payment provider. Please refresh.', 'error');
        return;
    }

    const paymentPage = document.getElementById('page-payment');
    if (paymentPage) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'class' && (mutation.target as HTMLElement).classList.contains('active')) {
                    if (State.paymentContext) {
                        renderOrderSummary();
                        mountPaymentForm();
                    } else {
                        showToast('No payment information found. Redirecting...', 'error');
                        mountService('landing');
                    }
                }
            }
        });
        observer.observe(paymentPage, { attributes: true });
    }
}
