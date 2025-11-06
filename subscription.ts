// subscription.ts - Simplified Stripe Payment Link Implementation
import { State } from "./state";
import { showToast } from "./ui";
import { mountService } from "./router";
import { t } from "./i18n";

const SUBSCRIPTION_PAYMENT_LINKS = {
    monthly: {
        amount: 999,
        url: import.meta.env.DEV ? "https://buy.stripe.com/6oU8wR9WDbDgayL6gv7Vm00" : "https://buy.stripe.com/6oU8wR9WDbDgayL6gv7Vm00",
        label: "$9.99/month"
    },
    yearly: {
        amount: 9900,
        url: import.meta.env.DEV ? "https://buy.stripe.com/3cI4gBfgX36KdKXgV97Vm01" : "https://buy.stripe.com/3cI4gBfgX36KdKXgV97Vm01",
        label: "$99/year"
    }
} as const;

function initializeCheckout(plan: "monthly" | "yearly") {
    if (!State.isLoggedIn || !State.currentUser) {
        showToast("🔒 Please sign in first to subscribe", "error");
        mountService("auth");
        return;
    }
    
    // Add error handling for Stripe payment links
    try {
        // Show loading message
        showToast("🔄 Redirecting to secure payment...", "info", 3000);
        
        // Open in new window to avoid issues with current page
        const paymentWindow = window.open(SUBSCRIPTION_PAYMENT_LINKS[plan].url, '_blank');
        
        // Check if popup was blocked
        if (!paymentWindow || paymentWindow.closed || typeof paymentWindow.closed === 'undefined') {
            showToast("🔒 Popup blocked. Please allow popups for this site.", "warning");
            // Fallback: redirect in same tab
            setTimeout(() => {
                window.location.href = SUBSCRIPTION_PAYMENT_LINKS[plan].url;
            }, 1000);
        } else {
            // Success: payment window opened
            showToast("💳 Payment window opened. Complete your subscription there.", "success", 5000);
        }
    } catch (error) {
        console.error('Stripe payment link error:', error);
        showToast("⚠️ Payment service unavailable. Please try again later.", "error");
        
        // Fallback: Show contact information
        setTimeout(() => {
            showToast("📧 Contact support@vcanship.com for manual subscription", "info", 8000);
        }, 2000);
    }
}

export function renderSubscriptionPage() {
    const isPro = State.subscriptionTier === "pro";
    return `
        <div class="subscription-container" style="padding: 2rem; max-width: 1200px; margin: 0 auto;">
            <h2 style="text-align: center; margin-bottom: 2rem; color: var(--dark-gray);">Choose Your Plan</h2>
            <div class="pricing-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
                <div class="pricing-card monthly card" style="border: 1px solid var(--border-color); border-radius: var(--card-border-radius); padding: 2rem; text-align: center; transition: all 0.3s ease;">
                    <h3 style="margin-bottom: 1rem; color: var(--dark-gray);">Monthly Pro</h3>
                    <div class="price" style="font-size: 2rem; font-weight: bold; color: var(--primary-orange); margin-bottom: 1.5rem;">${SUBSCRIPTION_PAYMENT_LINKS.monthly.label}</div>
                    <div style="margin-bottom: 1.5rem; color: var(--medium-gray);">
                        <p style="margin: 0.5rem 0;">✓ Unlimited quotes</p>
                        <p style="margin: 0.5rem 0;">✓ Real-time rates</p>
                        <p style="margin: 0.5rem 0;">✓ Priority support</p>
                    </div>
                    <button onclick="window.location.href='${SUBSCRIPTION_PAYMENT_LINKS.monthly.url}'" ${isPro ? "disabled" : ""} 
                        class="main-submit-btn" 
                        style="width: 100%; padding: 1rem; background: ${isPro ? 'var(--medium-gray)' : 'var(--primary-orange)'}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: ${isPro ? 'not-allowed' : 'pointer'}; transition: all 0.3s ease;">
                        ${isPro ? "Current Plan" : "Subscribe Monthly"}
                    </button>
                </div>
                <div class="pricing-card yearly card" style="border: 2px solid var(--primary-orange); border-radius: var(--card-border-radius); padding: 2rem; text-align: center; transition: all 0.3s ease; position: relative;">
                    <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--primary-orange); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">
                        BEST VALUE
                    </div>
                    <h3 style="margin-bottom: 1rem; color: var(--dark-gray);">Yearly Pro</h3>
                    <div class="price" style="font-size: 2rem; font-weight: bold; color: var(--primary-orange); margin-bottom: 0.5rem;">${SUBSCRIPTION_PAYMENT_LINKS.yearly.label}</div>
                    <div class="savings" style="color: var(--success-color); font-size: 0.9rem; font-weight: bold; margin-bottom: 1.5rem;">Save 17% (2 months free)</div>
                    <div style="margin-bottom: 1.5rem; color: var(--medium-gray);">
                        <p style="margin: 0.5rem 0;">✓ Everything in Monthly</p>
                        <p style="margin: 0.5rem 0;">✓ Priority booking</p>
                        <p style="margin: 0.5rem 0;">✓ Dedicated support</p>
                    </div>
                    <button onclick="window.location.href='${SUBSCRIPTION_PAYMENT_LINKS.yearly.url}'" ${isPro ? "disabled" : ""} 
                        class="main-submit-btn" 
                        style="width: 100%; padding: 1rem; background: ${isPro ? 'var(--medium-gray)' : 'var(--primary-orange)'}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: ${isPro ? 'not-allowed' : 'pointer'}; transition: all 0.3s ease;">
                        ${isPro ? "Current Plan" : "Subscribe Yearly"}
                    </button>
                </div>
            </div>
            ${isPro ? `
                <div class="current-plan-notice card" style="background: var(--success-color-light); border: 1px solid var(--success-color); border-radius: var(--card-border-radius); padding: 1.5rem; text-align: center; margin-top: 2rem;">
                    <i class="fa-solid fa-check-circle" style="color: var(--success-color); font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p style="margin: 0; font-size: 1.1rem;">You are currently on <strong>Pro Plan</strong>. Thank you for your subscription!</p>
                </div>
            ` : `
                <div class="free-tier-info card" style="background: var(--background-color); border: 1px solid var(--border-color); border-radius: var(--card-border-radius); padding: 2rem; margin-top: 2rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--dark-gray);">Free Tier Includes:</h3>
                    <ul style="list-style: none; padding: 0; margin-bottom: 1.5rem;">
                        <li style="padding: 0.5rem 0; color: var(--medium-gray);">✓ Basic container quotes</li>
                        <li style="padding: 0.5rem 0; color: var(--medium-gray);">✓ Standard rate estimates</li>
                        <li style="padding: 0.5rem 0; color: var(--medium-gray);">✓ Limited monthly quotes</li>
                        <li style="padding: 0.5rem 0; color: var(--medium-gray);">✓ Essential booking features</li>
                    </ul>
                    <p class="upgrade-cta" style="margin: 0; color: var(--primary-orange); font-weight: 600; font-size: 1.1rem;">Upgrade to Pro for unlimited real-time container rates & instant quotes!</p>
                </div>
            `}
            <div style="margin-top: 2rem; text-align: center; font-size: 0.9rem; color: var(--medium-gray);">
                <p style="margin: 0.5rem 0;">Secure payments powered by Stripe • Cancel anytime</p>
                <p style="margin: 0.5rem 0;">Need help? <a href="#" onclick="mountService('help')" style="color: var(--primary-orange); text-decoration: none;">Contact Support</a></p>
            </div>
        </div>
    `;
}
