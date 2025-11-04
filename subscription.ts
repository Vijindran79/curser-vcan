// subscription.ts
// Stripe Subscription Management for Pro Tier

import { State, setState } from './state';
import { showToast, toggleLoading } from './ui';
import { functions, db } from './firebase';
import { mountService } from './router';

// Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51RnhihPyJngwy6BVymsoYDsBfigGqBOYaHHnPyviDja1dmlD8YgxNQDdupAsCBzkH2ztCAU0IKyNVJRUa1MJ02tv00VJO88S52';

let stripe: any = null;

/**
 * Subscription Pricing Strategy (Optimized for User Acquisition)
 * 
 * RECOMMENDATION: $9.99/month OR $99/year (17% savings)
 * 
 * Why this pricing works:
 * - Under $10/month = Impulse purchase territory
 * - 17% annual discount = Encourages yearly commitment
 * - Competitive with industry (other logistics platforms charge $15-50/month)
 * - Low barrier to entry = Maximum conversions
 * - Value proposition clear: Unlimited real-time rates
 */
// IMPORTANT: After creating prices in Stripe Dashboard, update these Price IDs
// You'll get the Price IDs when you create the prices in Stripe Dashboard
const SUBSCRIPTION_PRICES = {
    monthly: {
        amount: 999, // $9.99 in cents
        priceId: process.env.STRIPE_PRICE_MONTHLY || 'price_monthly_pro', // TODO: Replace with actual Price ID from Stripe
        label: '$9.99/month',
        savings: null
    },
    yearly: {
        amount: 9900, // $99.00 in cents (17% discount)
        priceId: process.env.STRIPE_PRICE_YEARLY || 'price_yearly_pro', // TODO: Replace with actual Price ID from Stripe
        label: '$99/year',
        savings: '$20.88 (17% off)'
    }
};

/**
 * Load Stripe.js
 */
async function loadStripe(): Promise<void> {
    try {
        if (typeof window !== 'undefined' && (window as any).Stripe) {
            // Suppress Stripe HTTP warnings during initialization
            const originalWarn = console.warn;
            console.warn = function(...args: any[]) {
                if (args.length > 0 && typeof args[0] === 'string' && 
                    args[0].includes('Stripe.js') && args[0].includes('HTTP')) {
                    return; // Suppress Stripe HTTP warning
                }
                originalWarn.apply(console, args);
            };
            
            stripe = (window as any).Stripe(STRIPE_PUBLISHABLE_KEY);
            
            // Restore console.warn after short delay
            setTimeout(() => {
                console.warn = originalWarn;
            }, 100);
            
            return;
        }
        
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined' || typeof document === 'undefined') {
                resolve(); // Server-side rendering, skip
                return;
            }
            
            // Suppress Stripe HTTP warnings during script loading
            const originalWarn = console.warn;
            console.warn = function(...args: any[]) {
                if (args.length > 0 && typeof args[0] === 'string' && 
                    args[0].includes('Stripe.js') && args[0].includes('HTTP')) {
                    return; // Suppress Stripe HTTP warning
                }
                originalWarn.apply(console, args);
            };
            
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.async = true;
            script.onload = () => {
                if ((window as any).Stripe) {
                    stripe = (window as any).Stripe(STRIPE_PUBLISHABLE_KEY);
                }
                // Restore console.warn after initialization
                setTimeout(() => {
                    console.warn = originalWarn;
                }, 100);
                resolve();
            };
            script.onerror = () => {
                console.warn = originalWarn; // Restore on error
                resolve(); // Don't reject - allow app to continue
            };
            document.head.appendChild(script);
        });
    } catch (error) {
        // Don't throw - allow app to continue
    }
}

/**
 * Render subscription pricing page
 */
export function renderSubscriptionPage(): string {
    const currentTier = State.subscriptionTier;
    const isPro = currentTier === 'pro';
    
    return `
        <div class="subscription-page">
            <button class="back-btn" onclick="mountService('landing')">← Back to Home</button>
            
            <div class="subscription-header">
                <h1>Upgrade to Pro</h1>
                <p class="subtitle">Get unlimited real-time rates & premium features</p>
            </div>
            
            <div class="pricing-cards">
                <!-- Monthly Plan -->
                <div class="pricing-card ${!isPro ? 'recommended' : ''}">
                    <div class="pricing-badge">Most Popular</div>
                    <h3>Monthly</h3>
                    <div class="price">
                        <span class="currency">${State.currentCurrency.symbol}</span>
                        <span class="amount">9.99</span>
                        <span class="period">/month</span>
                    </div>
                    <ul class="features">
                        <li><i class="fa-solid fa-check"></i> Unlimited real-time Sea Rates API calls</li>
                        <li><i class="fa-solid fa-check"></i> Unlimited Shippo API (parcel quotes)</li>
                        <li><i class="fa-solid fa-check"></i> Priority customer support</li>
                        <li><i class="fa-solid fa-check"></i> Advanced analytics & reporting</li>
                        <li><i class="fa-solid fa-check"></i> API access for integrations</li>
                        <li><i class="fa-solid fa-check"></i> Cancel anytime</li>
                    </ul>
                    <button 
                        class="main-submit-btn ${isPro ? 'disabled' : ''}" 
                        id="subscribe-monthly-btn"
                        ${isPro ? 'disabled' : ''}
                    >
                        ${isPro ? 'Current Plan' : 'Subscribe Monthly'}
                    </button>
                </div>
                
                <!-- Yearly Plan -->
                <div class="pricing-card ${!isPro ? 'best-value' : ''}">
                    <div class="pricing-badge savings">Save 17%</div>
                    <h3>Yearly</h3>
                    <div class="price">
                        <span class="currency">${State.currentCurrency.symbol}</span>
                        <span class="amount">99</span>
                        <span class="period">/year</span>
                    </div>
                    <div class="savings-badge">Save $20.88 annually</div>
                    <ul class="features">
                        <li><i class="fa-solid fa-check"></i> Everything in Monthly</li>
                        <li><i class="fa-solid fa-check"></i> <strong>17% discount</strong></li>
                        <li><i class="fa-solid fa-check"></i> Best value for regular users</li>
                    </ul>
                    <button 
                        class="main-submit-btn ${isPro ? 'disabled' : ''}" 
                        id="subscribe-yearly-btn"
                        ${isPro ? 'disabled' : ''}
                    >
                        ${isPro ? 'Current Plan' : 'Subscribe Yearly'}
                    </button>
                </div>
            </div>
            
            ${isPro ? `
                <div class="current-plan-notice">
                    <i class="fa-solid fa-check-circle"></i>
                    <p>You're currently on the <strong>Pro Plan</strong>. Thank you for your subscription!</p>
                </div>
            ` : `
                <div class="free-tier-info">
                    <h3>What you get with Free:</h3>
                    <ul>
                        <li>✓ Unlimited Shippo API (parcel quotes)</li>
                        <li>✓ 50 Sea Rates API calls/month (shared pool)</li>
                        <li>✓ Cached rates (refreshed every 4 hours)</li>
                        <li>✓ AI estimates as fallback</li>
                    </ul>
                    <p class="upgrade-cta">Upgrade to Pro for unlimited real-time rates!</p>
                </div>
            `}
            
            <div class="pricing-faq">
                <h3>Frequently Asked Questions</h3>
                <div class="faq-item">
                    <h4>Can I cancel anytime?</h4>
                    <p>Yes! Cancel your subscription anytime from your account settings. No hidden fees.</p>
                </div>
                <div class="faq-item">
                    <h4>What payment methods do you accept?</h4>
                    <p>We accept all major credit cards, debit cards, and digital wallets via Stripe.</p>
                </div>
                <div class="faq-item">
                    <h4>Will I lose access if I cancel?</h4>
                    <p>You'll have access until the end of your billing period. After that, you'll revert to the free tier.</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Initialize subscription checkout
 */
async function initializeCheckout(plan: 'monthly' | 'yearly') {
    if (!State.isLoggedIn) {
        showToast('Please sign in to subscribe', 'error');
        mountService('auth');
        return;
    }
    
    toggleLoading(true, 'Preparing checkout...');
    
    try {
        if (!functions) {
            throw new Error('Functions not available. Please try again later.');
        }
        
        // Create Stripe Checkout Session via Firebase Function
        const createCheckoutSession = functions.httpsCallable('createSubscriptionCheckout');
        const result = await createCheckoutSession({
            priceId: SUBSCRIPTION_PRICES[plan].priceId,
            plan: plan,
            userEmail: State.currentUser?.email
        });
        
        const session = result.data;
        
        if (session?.url) {
            // Redirect to Stripe Checkout
            window.location.href = session.url;
        } else if (session?.sessionId && stripe) {
            // Alternative: Use Stripe Elements for embedded checkout
            const checkoutResult = await stripe.redirectToCheckout({ sessionId: session.sessionId });
            if (checkoutResult.error) {
                throw new Error(checkoutResult.error.message);
            }
        } else {
            throw new Error('Failed to create checkout session');
        }
    } catch (error: any) {
        console.error('Checkout error:', error);
        showToast(error.message || 'Failed to start checkout. Please try again.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Check subscription status from Firestore
 */
export async function checkSubscriptionStatus(): Promise<void> {
    if (!State.isLoggedIn || !State.currentUser?.email) {
        return;
    }
    
    try {
        if (!db) {
            console.warn('Firestore not initialized');
            return;
        }
        
        const userDoc = await db.collection('users').doc(State.currentUser.email).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const subscriptionTier = userData?.subscriptionTier || 'free';
            const subscriptionExpiry = userData?.subscriptionExpiry?.toDate();
            
            // Check if subscription is still active
            if (subscriptionTier === 'pro' && subscriptionExpiry && subscriptionExpiry > new Date()) {
                setState({ subscriptionTier: 'pro' });
            } else {
                setState({ subscriptionTier: 'free' });
            }
        }
    } catch (error) {
        console.error('Error checking subscription:', error);
        // Don't throw - just log the error
    }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(): Promise<void> {
    if (!State.isLoggedIn) {
        showToast('Please sign in', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to cancel your subscription? You\'ll have access until the end of your billing period.')) {
        return;
    }
    
    toggleLoading(true, 'Cancelling subscription...');
    
    try {
        if (!functions) {
            throw new Error('Functions not available');
        }
        
        const cancelSubscriptionFn = functions.httpsCallable('cancelSubscription');
        await cancelSubscriptionFn({});
        
        setState({ subscriptionTier: 'free' });
        showToast('Subscription cancelled successfully', 'success');
        
        // Update UI
        const page = document.getElementById('page-subscription');
        if (page) {
            page.innerHTML = renderSubscriptionPage();
            attachSubscriptionListeners();
        }
    } catch (error: any) {
        console.error('Cancel subscription error:', error);
        showToast(error.message || 'Failed to cancel subscription', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Attach event listeners for subscription page
 */
export function attachSubscriptionListeners() {
    document.getElementById('subscribe-monthly-btn')?.addEventListener('click', () => initializeCheckout('monthly'));
    document.getElementById('subscribe-yearly-btn')?.addEventListener('click', () => initializeCheckout('yearly'));
}

/**
 * Initialize subscription system
 */
export async function initializeSubscription() {
    try {
        await loadStripe();
    } catch (error) {
        // Stripe loading is optional - fail silently
    }
    
    try {
        await checkSubscriptionStatus();
    } catch (error) {
        // Subscription check is optional - fail silently
    }
}

