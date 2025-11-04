// email-inquiry-form.ts
// Email inquiry form that appears after showing quotes to capture leads

import { State, type Quote } from './state';
import { showToast, toggleLoading } from './ui';
import { sendQuoteInquiry } from './backend-api';

/**
 * Renders an email inquiry form in the quotes display area
 */
export function renderEmailInquiryForm(serviceType: string, quotes: Quote[], shipmentDetails: any, selectedQuote?: Quote): string {
    return `
        <div class="email-inquiry-form-container" style="margin-top: 2rem; padding: 1.5rem; background: var(--card-background); border-radius: 12px; border: 2px solid var(--primary-orange);">
            <div class="inquiry-header" style="text-align: center; margin-bottom: 1.5rem;">
                <h3 style="color: var(--primary-orange); margin-bottom: 0.5rem;">
                    <i class="fa-solid fa-envelope-circle-check"></i> Get Final Quote & Book Now
                </h3>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                    Fill in your details and we'll send you the final quote and booking instructions within 24 hours
                </p>
            </div>
            
            <form id="email-inquiry-form" class="inquiry-form">
                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="input-wrapper">
                        <label for="inquiry-name">
                            <i class="fa-solid fa-user"></i> Full Name *
                        </label>
                        <input 
                            type="text" 
                            id="inquiry-name" 
                            required 
                            placeholder="John Doe"
                            value="${State.currentUser?.name || ''}"
                        />
                    </div>
                    <div class="input-wrapper">
                        <label for="inquiry-email">
                            <i class="fa-solid fa-envelope"></i> Email Address *
                        </label>
                        <input 
                            type="email" 
                            id="inquiry-email" 
                            required 
                            placeholder="john@example.com"
                            value="${State.currentUser?.email || ''}"
                        />
                    </div>
                </div>
                
                <div class="input-wrapper" style="margin-bottom: 1rem;">
                    <label for="inquiry-phone">
                        <i class="fa-solid fa-phone"></i> Phone Number
                    </label>
                    <input 
                        type="tel" 
                        id="inquiry-phone" 
                        placeholder="+1 234 567 8900"
                    />
                </div>
                
                <div class="input-wrapper" style="margin-bottom: 1rem;">
                    <label for="inquiry-message">
                        <i class="fa-solid fa-message"></i> Additional Requirements (Optional)
                    </label>
                    <textarea 
                        id="inquiry-message" 
                        rows="3" 
                        placeholder="Any special requirements, preferred pickup time, delivery instructions, etc."
                    ></textarea>
                </div>
                
                <div class="inquiry-quote-summary" style="background: var(--background-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                        <strong>You're inquiring about:</strong>
                    </p>
                    <p style="font-size: 0.9rem; color: var(--text-primary);">
                        ${serviceType.toUpperCase()} - ${quotes.length} quote${quotes.length > 1 ? 's' : ''} received
                        ${selectedQuote ? ` | Selected: ${selectedQuote.carrierName} - ${State.currentCurrency.symbol}${selectedQuote.totalCost.toFixed(2)}` : ''}
                    </p>
                </div>
                
                <button type="submit" class="main-submit-btn" style="width: 100%; padding: 1rem; font-size: 1.1rem;">
                    <i class="fa-solid fa-paper-plane"></i> Send Inquiry & Get Final Quote
                </button>
                
                <p style="text-align: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-secondary);">
                    <i class="fa-solid fa-clock"></i> We'll respond within 24 hours
                </p>
            </form>
        </div>
    `;
}

/**
 * Attaches event listener to email inquiry form
 */
export function attachEmailInquiryListeners(serviceType: string, quotes: Quote[], shipmentDetails: any) {
    const form = document.getElementById('email-inquiry-form') as HTMLFormElement;
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = (document.getElementById('inquiry-name') as HTMLInputElement).value.trim();
        const email = (document.getElementById('inquiry-email') as HTMLInputElement).value.trim();
        const phone = (document.getElementById('inquiry-phone') as HTMLInputElement).value.trim();
        const message = (document.getElementById('inquiry-message') as HTMLTextAreaElement).value.trim();
        
        if (!name || !email) {
            showToast('Please fill in your name and email address.', 'error');
            return;
        }
        
        // Get selected quote if any
        const selectedQuoteBtn = document.querySelector('.quote-card.selected, .select-quote-btn.active');
        let selectedQuote: Quote | undefined;
        if (selectedQuoteBtn) {
            const quoteId = selectedQuoteBtn.getAttribute('data-quote-id');
            if (quoteId !== null) {
                selectedQuote = quotes[parseInt(quoteId)];
            }
        }
        
        try {
            const success = await sendQuoteInquiry({
                serviceType,
                quotes,
                customerDetails: {
                    name,
                    email,
                    phone: phone || undefined
                },
                shipmentDetails: {
                    ...shipmentDetails,
                    customer_message: message || undefined
                },
                selectedQuote
            });
            
            if (success) {
                // Show success message and disable form
                form.innerHTML = `
                    <div style="text-align: center; padding: 2rem;">
                        <i class="fa-solid fa-circle-check" style="font-size: 3rem; color: var(--success-green); margin-bottom: 1rem;"></i>
                        <h3 style="color: var(--success-green); margin-bottom: 0.5rem;">Inquiry Sent Successfully!</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                            We've received your inquiry and will get back to you ASAP with the final quote and booking instructions.
                        </p>
                        <p style="font-size: 0.9rem; color: var(--text-secondary);">
                            Check your email (${email}) for confirmation.
                        </p>
                    </div>
                `;
            }
        } catch (error: any) {
            console.error('Failed to send inquiry:', error);
            // Error is already handled by sendQuoteInquiry
        }
    });
}





