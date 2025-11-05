/**
 * Guest Checkout System
 * 
 * Allows users to pay without registration
 * Prompts for optional account creation after successful payment
 * Stores order details for later registration
 */

import { State } from './state';
import { showToast } from './ui';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export interface GuestOrderData {
    shipmentId: string;
    service: string;
    email: string;
    phone?: string;
    fullName?: string;
    totalAmount: number;
    paymentIntentId: string;
    timestamp: number;
    origin: any;
    destination: any;
    quote: any;
}

/**
 * Store guest order data in localStorage for post-payment signup
 */
export function storeGuestOrder(orderData: GuestOrderData) {
    try {
        localStorage.setItem('vcanship_guest_order', JSON.stringify(orderData));
        localStorage.setItem('vcanship_guest_order_time', Date.now().toString());
    } catch (error) {
        console.error('Failed to store guest order:', error);
    }
}

/**
 * Get stored guest order data
 */
export function getGuestOrder(): GuestOrderData | null {
    try {
        const data = localStorage.getItem('vcanship_guest_order');
        const time = localStorage.getItem('vcanship_guest_order_time');
        
        if (!data || !time) return null;
        
        // Only return if order is less than 24 hours old
        const orderTime = parseInt(time);
        const hoursSince = (Date.now() - orderTime) / (1000 * 60 * 60);
        
        if (hoursSince > 24) {
            clearGuestOrder();
            return null;
        }
        
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to get guest order:', error);
        return null;
    }
}

/**
 * Clear guest order data
 */
export function clearGuestOrder() {
    localStorage.removeItem('vcanship_guest_order');
    localStorage.removeItem('vcanship_guest_order_time');
}

/**
 * Show post-payment signup modal
 */
export function showPostPaymentSignup() {
    const guestOrder = getGuestOrder();
    if (!guestOrder || State.isLoggedIn) {
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'post-payment-signup-modal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; animation: slideInUp 0.3s ease-out;">
            <div style="text-align: center; padding: 1.5rem 0 1rem;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                    <i class="fa-solid fa-check" style="font-size: 2.5rem; color: white;"></i>
                </div>
                <h2 style="margin: 0 0 0.5rem; color: var(--text-color); font-size: 1.5rem;">Payment Successful!</h2>
                <p style="color: var(--text-secondary); margin: 0 0 1rem; font-size: 0.9375rem;">
                    Your shipment ID: <strong>${guestOrder.shipmentId}</strong>
                </p>
            </div>

            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 0.75rem; color: white; display: flex; align-items: center; gap: 0.5rem; font-size: 1.125rem;">
                    <i class="fa-solid fa-gift"></i>
                    Create Your Free Account
                </h3>
                <ul style="margin: 0; padding-left: 1.5rem; color: rgba(255, 255, 255, 0.95); font-size: 0.9375rem; line-height: 1.8;">
                    <li>Track all your shipments in one place</li>
                    <li>Access your order history anytime</li>
                    <li>Faster checkout for future orders</li>
                    <li>Get exclusive deals and discounts</li>
                    <li>Download invoices and receipts</li>
                </ul>
            </div>

            <form id="post-payment-signup-form">
                <div style="display: grid; gap: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.375rem; font-weight: 500; color: var(--text-color); font-size: 0.875rem;">
                            Full Name
                        </label>
                        <input 
                            type="text" 
                            id="signup-name" 
                            value="${guestOrder.fullName || ''}"
                            required
                            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.9375rem; background: var(--card-bg); color: var(--text-color);"
                            placeholder="Enter your full name"
                        />
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.375rem; font-weight: 500; color: var(--text-color); font-size: 0.875rem;">
                            Email
                        </label>
                        <input 
                            type="email" 
                            id="signup-email" 
                            value="${guestOrder.email}"
                            readonly
                            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.9375rem; background: var(--input-disabled-bg); color: var(--text-secondary);"
                        />
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.375rem; font-weight: 500; color: var(--text-color); font-size: 0.875rem;">
                            Create Password
                        </label>
                        <input 
                            type="password" 
                            id="signup-password" 
                            required
                            minlength="6"
                            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.9375rem; background: var(--card-bg); color: var(--text-color);"
                            placeholder="Minimum 6 characters"
                        />
                    </div>

                    <div>
                        <label style="display: block; margin-bottom: 0.375rem; font-weight: 500; color: var(--text-color); font-size: 0.875rem;">
                            Phone Number (Optional)
                        </label>
                        <input 
                            type="tel" 
                            id="signup-phone" 
                            value="${guestOrder.phone || ''}"
                            style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.9375rem; background: var(--card-bg); color: var(--text-color);"
                            placeholder="For shipment updates"
                        />
                    </div>
                </div>

                <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                    <button 
                        type="submit" 
                        style="flex: 1; padding: 0.875rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9375rem; transition: transform 0.2s;"
                        onmouseover="this.style.transform='translateY(-2px)'"
                        onmouseout="this.style.transform='translateY(0)'"
                    >
                        <i class="fa-solid fa-user-plus"></i> Create Account
                    </button>
                    <button 
                        type="button" 
                        id="skip-signup-btn"
                        style="flex: 1; padding: 0.875rem; background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 0.9375rem; transition: all 0.2s;"
                        onmouseover="this.style.borderColor='var(--primary-color)'; this.style.color='var(--primary-color)'"
                        onmouseout="this.style.borderColor='var(--border-color)'; this.style.color='var(--text-secondary)'"
                    >
                        <i class="fa-solid fa-forward"></i> Skip for Now
                    </button>
                </div>

                <p style="text-align: center; margin-top: 1rem; font-size: 0.75rem; color: var(--text-secondary);">
                    We'll send a tracking link to your email regardless of signup
                </p>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Form submission
    const form = document.getElementById('post-payment-signup-form') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePostPaymentSignup(modal);
    });

    // Skip button
    const skipBtn = document.getElementById('skip-signup-btn');
    skipBtn?.addEventListener('click', () => {
        closeSignupModal(modal);
        showToast('You can track your order using the tracking ID sent to your email', 'info', 5000);
    });
}

/**
 * Handle post-payment signup
 */
async function handlePostPaymentSignup(modal: HTMLElement) {
    const nameInput = document.getElementById('signup-name') as HTMLInputElement;
    const emailInput = document.getElementById('signup-email') as HTMLInputElement;
    const passwordInput = document.getElementById('signup-password') as HTMLInputElement;
    const phoneInput = document.getElementById('signup-phone') as HTMLInputElement;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const phone = phoneInput.value.trim();

    if (!name || !email || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const submitBtn = modal.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

    try {
        // Create Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Send verification email
        await sendEmailVerification(user);

        // Store user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            email,
            name,
            phone: phone || null,
            createdAt: new Date().toISOString(),
            emailVerified: false,
            subscriptionTier: 'free',
            registeredVia: 'guest-checkout'
        });

        // Link guest order to user account
        const guestOrder = getGuestOrder();
        if (guestOrder) {
            await setDoc(doc(db, 'orders', guestOrder.shipmentId), {
                userId: user.uid,
                ...guestOrder,
                linkedAt: new Date().toISOString()
            });
        }

        // Clear guest order data
        clearGuestOrder();

        // Show success
        showToast('Account created successfully! Check your email to verify.', 'success', 5000);
        
        // Update state
        State.isLoggedIn = true;
        State.currentUser = { name, email, uid: user.uid };

        // Close modal
        closeSignupModal(modal);

        // Redirect to dashboard
        setTimeout(() => {
            window.location.hash = 'dashboard';
        }, 1500);

    } catch (error: any) {
        console.error('Signup error:', error);
        
        let message = 'Failed to create account. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            message = 'This email is already registered. Please sign in instead.';
        } else if (error.code === 'auth/weak-password') {
            message = 'Password is too weak. Use at least 6 characters.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email address.';
        }
        
        showToast(message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Close signup modal
 */
function closeSignupModal(modal: HTMLElement) {
    modal.classList.add('fade-out');
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

/**
 * Check if should show signup prompt
 */
export function checkShowSignupPrompt() {
    // Don't show if already logged in
    if (State.isLoggedIn) {
        return;
    }

    // Don't show if no guest order
    const guestOrder = getGuestOrder();
    if (!guestOrder) {
        return;
    }

    // Check if already dismissed recently
    const dismissed = localStorage.getItem('vcanship_signup_dismissed');
    if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const hoursSince = (Date.now() - dismissedTime) / (1000 * 60 * 60);
        if (hoursSince < 24) {
            return;
        }
    }

    // Show after a short delay
    setTimeout(() => {
        showPostPaymentSignup();
    }, 2000);
}

/**
 * Collect guest information during checkout
 */
export function showGuestInfoCollector(): Promise<{ email: string; fullName?: string; phone?: string } | null> {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <h2 style="margin: 0 0 1rem;">
                    <i class="fa-solid fa-user"></i> Checkout as Guest
                </h2>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                    We'll send your tracking information to this email
                </p>

                <form id="guest-info-form">
                    <div style="display: grid; gap: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                                Email Address <span style="color: #ef4444;">*</span>
                            </label>
                            <input 
                                type="email" 
                                id="guest-email" 
                                required
                                style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1rem;"
                                placeholder="your@email.com"
                            />
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                                Full Name (Optional)
                            </label>
                            <input 
                                type="text" 
                                id="guest-name" 
                                style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1rem;"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">
                                Phone Number (Optional)
                            </label>
                            <input 
                                type="tel" 
                                id="guest-phone" 
                                style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1rem;"
                                placeholder="+1 234 567 8900"
                            />
                        </div>
                    </div>

                    <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                        <button 
                            type="submit" 
                            style="flex: 1; padding: 0.875rem; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"
                        >
                            Continue to Payment
                        </button>
                        <button 
                            type="button" 
                            id="cancel-guest-btn"
                            style="padding: 0.875rem 1.5rem; background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); border-radius: 8px; font-weight: 500; cursor: pointer;"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                <p style="text-align: center; margin-top: 1rem; font-size: 0.875rem; color: var(--text-secondary);">
                    Already have an account? <a href="#" id="switch-to-login" style="color: var(--primary-color); text-decoration: none; font-weight: 500;">Sign In</a>
                </p>
            </div>
        `;

        document.body.appendChild(modal);

        const form = document.getElementById('guest-info-form') as HTMLFormElement;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = (document.getElementById('guest-email') as HTMLInputElement).value.trim();
            const fullName = (document.getElementById('guest-name') as HTMLInputElement).value.trim();
            const phone = (document.getElementById('guest-phone') as HTMLInputElement).value.trim();
            
            modal.remove();
            resolve({ email, fullName: fullName || undefined, phone: phone || undefined });
        });

        const cancelBtn = document.getElementById('cancel-guest-btn');
        cancelBtn?.addEventListener('click', () => {
            modal.remove();
            resolve(null);
        });

        const loginLink = document.getElementById('switch-to-login');
        loginLink?.addEventListener('click', (e) => {
            e.preventDefault();
            modal.remove();
            resolve(null);
            // Trigger login modal
            const loginBtn = document.getElementById('login-signup-btn') as HTMLButtonElement;
            loginBtn?.click();
        });
    });
}
