// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { State, setState } from './state';
import { switchPage, showAuthModal, closeAuthModal, toggleLoading, showToast } from './ui';
import { mountService } from './router';
import { auth, firebaseConfig, GoogleAuthProvider, AppleAuthProvider, getAuth } from './firebase';
import { t } from './i18n';

/**
 * Updates the UI based on the current authentication state.
 */
export function updateUIForAuthState() {
    const { isLoggedIn, currentUser } = State;

    const loginBtn = document.getElementById('login-signup-btn');
    const accountDropdown = document.getElementById('my-account-dropdown');
    const dashboardLink = document.getElementById('header-dashboard-link');

    if (loginBtn) loginBtn.classList.toggle('hidden', isLoggedIn);
    if (accountDropdown) accountDropdown.classList.toggle('hidden', !isLoggedIn);
    if (dashboardLink) dashboardLink.style.display = isLoggedIn ? 'flex' : 'none';
    
    if (isLoggedIn && currentUser) {
        const userNameDisplay = document.getElementById('user-name-display');
        const userAvatar = document.getElementById('user-avatar');
        if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
        if (userAvatar) {
            // Get user initials
            const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2);
            userAvatar.textContent = initials;
        }
    }


    // Update welcome banner on landing page
    const welcomeBanner = document.getElementById('welcome-banner');
    if (welcomeBanner) {
        if (isLoggedIn && currentUser) {
            welcomeBanner.innerHTML = `
                <h2 class="welcome-title">Welcome back, ${currentUser.name}!</h2>
                <p>What would you like to ship today?</p>
            `;
             welcomeBanner.classList.remove('hidden');
        } else {
            // Hide the banner if not logged in to keep the focus on the parcel form
            welcomeBanner.innerHTML = '';
            welcomeBanner.classList.add('hidden');
        }
    }
}


// --- MODAL AND FORM LOGIC ---

/**
 * Toggles between the various views within the authentication modal.
 * @param viewToShow The view to display.
 */
function switchAuthView(viewToShow: 'email-entry' | 'password-entry' | 'signup' | 'magic-link-sent') {
    const container = document.getElementById('auth-container');
    if (!container) return;

    const currentView = container.querySelector('.auth-view.active');
    const nextView = document.getElementById(`${viewToShow}-view`);

    if (currentView && nextView && currentView !== nextView) {
        currentView.classList.add('exiting');
        currentView.addEventListener('animationend', () => {
            currentView.classList.remove('active', 'exiting');
            nextView.classList.add('active');
        }, { once: true });
    } else if (nextView) {
        nextView.classList.add('active');
    }
}

// --- AUTHENTICATION ACTIONS ---

/**
 * Finalizes the login process for any authentication method.
 * @param user The Firebase user object.
 */
function completeLogin(user: { displayName: string | null, email: string | null }) {
    if (!user.email) {
        showToast(t('auth.errors.no_email'), "error");
        return;
    }
    const userProfile = { 
        name: user.displayName || user.email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        email: user.email 
    };

    localStorage.setItem('vcanship_user', JSON.stringify(userProfile));
    localStorage.removeItem('vcanship_guest_lookups'); // Clear guest counter on login
    localStorage.setItem('vcanship_free_lookups', '5'); // Set free user counter

    setState({
        isLoggedIn: true,
        currentUser: userProfile,
        subscriptionTier: 'free',
        aiLookupsRemaining: 5,
    });
    
    updateUIForAuthState();
    closeAuthModal();
    
    if (State.postLoginRedirectService) {
        mountService(State.postLoginRedirectService);
        setState({ postLoginRedirectService: null });
    } else {
        switchPage('dashboard');
    }
}

/**
 * Generic helper function to send a magic link for passwordless sign-in.
 * @param email The user's email address.
 * @param name Optional user's name, used during the signup flow.
 */
async function sendMagicLink(email: string, name?: string) {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        showToast(t('toast.invalid_email'), 'error');
        return;
    }
    
    if (name) {
        window.localStorage.setItem('nameForSignIn', name);
    }
    
    // Use current window location for magic link callback
    const continueUrl = `${window.location.origin}${window.location.pathname}`;

    const actionCodeSettings = {
        url: continueUrl,
        handleCodeInApp: true,
    };

    toggleLoading(true, t('loading.sending_magic_link'));
    try {
        // Get fresh auth instance
        const currentAuth = getAuth ? getAuth() : auth;
        if (!currentAuth) {
            throw new Error(t('toast.auth_not_available'));
        }
        
        await currentAuth.sendSignInLinkToEmail(email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
        showToast(t('toast.magic_link_sent').replace('{email}', email), 'success');
        switchAuthView('magic-link-sent');
        (document.getElementById('magic-link-email-display') as HTMLElement).textContent = email;

    } catch (error: any) {
        console.error("Magic link error:", error);
        const errorMessage = error.message || t('toast.magic_link_failed');
        
        // If magic link fails, show helpful error and fallback to password
        if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/unexpected-error') {
            showToast('Magic link is not available. Please use password sign-in or Google/Apple login.', 'error');
            // Fall back to showing password screen if it was a login attempt
            const emailEl = document.getElementById('password-entry-email') as HTMLElement;
            if (emailEl && emailEl.textContent) {
                setTimeout(() => switchAuthView('password-entry'), 1500);
            }
        } else {
            showToast(errorMessage, 'error');
        }
    } finally {
        toggleLoading(false);
    }
}

/**
 * Handles social login using Firebase's popup method for a seamless UX.
 * @param providerName The social provider ('Google' or 'Apple').
 */
async function handleSocialLogin(providerName: 'Google' | 'Apple') {
    // Get fresh auth instance
    const currentAuth = getAuth ? getAuth() : auth;
    if (!currentAuth) {
        showToast(t('toast.auth_not_available'), 'error');
        toggleLoading(false);
        return;
    }
    
    // Get providers from window.firebase directly if needed
    let ProviderClass: any = null;
    if (providerName === 'Google') {
        ProviderClass = GoogleAuthProvider;
        if (!ProviderClass && typeof window !== 'undefined' && (window as any).firebase) {
            ProviderClass = (window as any).firebase.auth?.GoogleAuthProvider;
        }
        if (!ProviderClass) {
            showToast('Google sign-in is not available. Please check Firebase configuration.', 'error');
            toggleLoading(false);
            return;
        }
    } else {
        // Apple uses OAuthProvider with 'apple.com' providerId
        if (AppleAuthProvider) {
            ProviderClass = AppleAuthProvider;
        } else if (typeof window !== 'undefined' && (window as any).firebase) {
            ProviderClass = (window as any).firebase.auth?.OAuthProvider;
        }
        if (!ProviderClass) {
            showToast('Apple sign-in is not available. Please check Firebase configuration.', 'error');
            toggleLoading(false);
            return;
        }
    }
    
    let provider;
    if (providerName === 'Google') {
        provider = new ProviderClass();
    } else {
        provider = new ProviderClass('apple.com');
    }

    toggleLoading(true, t('loading.signing_in_with').replace('{provider}', providerName));
    
    // Try popup first, fallback to redirect if blocked
    try {
        // Check if we're in a context that supports popups (not in iframe, not extension)
        const canUsePopup = typeof window !== 'undefined' && 
                           window.top === window.self && // Not in iframe
                           !window.location.href.includes('chrome-extension://'); // Not in extension
        
        if (canUsePopup) {
            try {
                const result = await currentAuth.signInWithPopup(provider);
                if (result.user) {
                    completeLogin(result.user);
                    toggleLoading(false);
                    return;
                } else {
                    throw new Error(t('toast.social_signin_failed'));
                }
            } catch (popupError: any) {
                // If popup is blocked or fails, try redirect
                if (popupError.code === 'auth/popup-blocked' || 
                    popupError.code === 'auth/popup-closed-by-user' ||
                    popupError.message?.includes('popup') ||
                    popupError.message?.includes('blocked')) {
                    
                    // Use redirect method instead
                    try {
                        await currentAuth.signInWithRedirect(provider);
                        toggleLoading(false);
                        return; // Will redirect, so we return here
                    } catch (redirectError: any) {
                        // Redirect also failed
                        throw redirectError;
                    }
                }
                throw popupError;
            }
        } else {
            // Can't use popup, use redirect
            await currentAuth.signInWithRedirect(provider);
            toggleLoading(false);
            return;
        }
    } catch (error: any) {
        // Handle common errors gracefully
        let errorMessage = t('toast.social_signin_failed_provider').replace('{provider}', providerName);
        
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/popup-blocked') {
            showToast(t('toast.signin_cancelled'), 'info');
            toggleLoading(false);
            return;
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            showToast(t('toast.account_exists'), 'error');
            toggleLoading(false);
            return;
        } else if (error.code === 'auth/internal-error') {
            errorMessage = t('toast.social_provider_not_configured')?.replace('{provider}', providerName) || `${providerName} sign-in is not properly configured. Please contact support.`;
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = t('toast.unauthorized_domain') || 'This domain is not authorized for Firebase authentication.';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = t('toast.provider_not_enabled')?.replace('{provider}', providerName) || `${providerName} sign-in is not enabled. Please contact support.`;
        } else if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key') {
            errorMessage = t('toast.auth_api_key_invalid') || 'Firebase API key is invalid. Please check your Firebase configuration.';
        }
        
        showToast(errorMessage, 'error');
        toggleLoading(false);
    }
}

/**
 * Handles the first step of the auth flow: email entry.
 */
async function handleEmailContinue(e: Event) {
    e.preventDefault();
    const emailInput = document.getElementById('auth-email') as HTMLInputElement;
    const email = emailInput.value.trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        showToast(t('toast.invalid_email'), 'error');
        return;
    }
    
    // Store email in localStorage for magic link handlers
    window.localStorage.setItem('emailForSignIn', email);
    
    toggleLoading(true, t('loading.checking'));
    try {
        // Get fresh auth instance
        const currentAuth = getAuth ? getAuth() : auth;
        if (!currentAuth) {
            throw new Error(t('toast.auth_not_available'));
        }
        
        const methods = await currentAuth.fetchSignInMethodsForEmail(email);
        if (methods.length > 0) {
            // User exists, show password screen
            const passwordEmailEl = document.getElementById('password-entry-email') as HTMLElement;
            if (passwordEmailEl) {
                passwordEmailEl.textContent = email;
            }
            // Set hidden email field for password form accessibility
            const hiddenEmailField = document.getElementById('password-form-email') as HTMLInputElement;
            if (hiddenEmailField) {
                hiddenEmailField.value = email;
            }
            switchAuthView('password-entry');
            // Auto-focus password input
            setTimeout(() => {
                const passwordInput = document.getElementById('auth-password') as HTMLInputElement;
                if (passwordInput) passwordInput.focus();
            }, 100);
        } else {
            // New user, show signup screen
            const signupEmailEl = document.getElementById('signup-view-email') as HTMLElement;
            if (signupEmailEl) {
                signupEmailEl.textContent = email;
            }
            // Set hidden email field for password form accessibility
            const hiddenEmailField = document.getElementById('password-form-email') as HTMLInputElement;
            if (hiddenEmailField) {
                hiddenEmailField.value = email;
            }
            switchAuthView('signup');
            // Auto-focus name input
            setTimeout(() => {
                const nameInput = document.getElementById('signup-name') as HTMLInputElement;
                if (nameInput) nameInput.focus();
            }, 100);
        }
    } catch (error: any) {
        console.error("Error checking email:", error);
        
        // Handle specific Firebase errors
        let errorMessage = error.message || 'An error occurred';
        if (error.code === 'auth/api-key-not-valid') {
            errorMessage = t('toast.auth_api_key_invalid') || 'Firebase API key is invalid. Please check your Firebase configuration.';
        } else if (error.code === 'auth/invalid-api-key') {
            errorMessage = t('toast.auth_api_key_invalid') || 'Firebase API key is invalid. Please check your Firebase configuration.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = t('toast.network_error') || 'Network error. Please check your internet connection.';
        }
        
        showToast(errorMessage, 'error');
    } finally {
        toggleLoading(false);
    }
}


/**
 * Signs a user in with email and password using Firebase Auth.
 */
async function handleSignInWithEmailAndPassword(e: Event) {
    e.preventDefault();
    const email = (document.getElementById('password-entry-email') as HTMLElement).textContent || '';
    const password = (document.getElementById('auth-password') as HTMLInputElement).value;
    
    if (!email || !password) {
        showToast(t('toast.password_required'), "error");
        return;
    }

    toggleLoading(true, t('loading.logging_in'));
    try {
        // Get fresh auth instance
        const currentAuth = getAuth ? getAuth() : auth;
        if (!currentAuth) {
            throw new Error(t('toast.auth_not_available'));
        }
        
        const userCredential = await currentAuth.signInWithEmailAndPassword(email, password);
        if (userCredential.user) {
            completeLogin(userCredential.user);
        }
    } catch (error: any) {
        console.error("Sign-in error:", error);
        
        // Handle specific Firebase errors
        let errorMessage = error.message || 'An error occurred while signing in';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = t('toast.user_not_found') || 'No account found with this email. Please sign up first.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = t('toast.wrong_password') || 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = t('toast.invalid_email') || 'Please enter a valid email address.';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = t('toast.account_disabled') || 'This account has been disabled. Please contact support.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = t('toast.too_many_requests') || 'Too many sign-in attempts. Please try again later.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = t('toast.network_error') || 'Network error. Please check your internet connection.';
        } else if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key') {
            errorMessage = t('toast.auth_api_key_invalid') || 'Firebase API key is invalid. Please check your Firebase configuration.';
        }
        
        showToast(errorMessage, 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Signs a user up with email and password using Firebase Auth.
 */
async function handleSignUpWithEmailAndPassword(e: Event) {
    e.preventDefault();
    const name = (document.getElementById('signup-name') as HTMLInputElement).value;
    const email = (document.getElementById('signup-view-email') as HTMLElement).textContent || '';
    const password = (document.getElementById('signup-password') as HTMLInputElement).value;

    if (!name || !email || !password) {
        showToast(t('toast.fill_all_fields'), "error");
        return;
    }
    if (password.length < 6) {
        showToast(t('toast.password_length'), "error");
        return;
    }


    toggleLoading(true, t('loading.creating_account'));
    try {
        // Get fresh auth instance
        const currentAuth = getAuth ? getAuth() : auth;
        if (!currentAuth) {
            throw new Error(t('toast.auth_not_available'));
        }
        
        const userCredential = await currentAuth.createUserWithEmailAndPassword(email, password);
        if (userCredential.user) {
            await userCredential.user.updateProfile({ displayName: name });
            const user = { ...userCredential.user, displayName: name };
            completeLogin(user);
        }
    } catch (error: any) {
        console.error("Sign-up error:", error);
        
        // Handle specific Firebase errors
        let errorMessage = error.message || 'An error occurred while creating your account';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = t('toast.email_already_in_use') || 'An account with this email already exists. Please sign in instead.';
            showToast(errorMessage, 'error');
            // Offer to send password reset if email exists
            if (window.confirm('This email is already registered. Do you want to reset your password?')) {
                try {
                    const resetAuth = getAuth ? getAuth() : auth;
                    if (resetAuth) {
                        await resetAuth.sendPasswordResetEmail(email);
                        showToast('A password reset email has been sent!', 'success');
                    }
                } catch (resetError: any) {
                    console.error('Password reset error:', resetError);
                    showToast('Failed to send password reset email.', 'error');
                }
            }
            return;
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = t('toast.invalid_email') || 'Please enter a valid email address.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = t('toast.weak_password') || 'Password is too weak. Please choose a stronger password (at least 6 characters with a mix of letters and numbers).';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = t('toast.email_signup_not_enabled') || 'Email/password sign-up is not enabled. Please contact support.';
        } else if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key') {
            errorMessage = t('toast.auth_api_key_invalid') || 'Firebase API key is invalid. Please check your Firebase configuration.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = t('toast.network_error') || 'Network error. Please check your internet connection.';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = t('toast.unauthorized_domain') || 'This domain is not authorized for Firebase authentication.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = t('toast.too_many_requests') || 'Too many sign-up attempts. Please try again later.';
        } else if (error.code === 'auth/missing-continue-uri') {
            errorMessage = t('toast.config_error') || 'Firebase configuration error. Please contact support.';
        }
        
        showToast(errorMessage, 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Sends a magic link for passwordless LOGIN for an existing user.
 */
async function handleSendLoginMagicLink() {
    // Try multiple sources for the email
    const emailEl = document.getElementById('password-entry-email') as HTMLElement;
    let email = emailEl?.textContent?.trim();
    
    // If not found in DOM, try localStorage
    if (!email) {
        email = window.localStorage.getItem('emailForSignIn');
    }
    
    // If still not found, try the auth-email input (might still be filled)
    if (!email) {
        const emailInput = document.getElementById('auth-email') as HTMLInputElement;
        email = emailInput?.value?.trim();
    }
    
    if (!email) {
        showToast(t('toast.email_required_for_signin'), 'error');
        return;
    }
    
    await sendMagicLink(email);
}

/**
 * Sends a magic link for passwordless SIGNUP for a new user.
 */
async function handleSendSignupMagicLink() {
    // Try multiple sources for the email
    const emailEl = document.getElementById('signup-view-email') as HTMLElement;
    let email = emailEl?.textContent?.trim();
    
    // If not found in DOM, try localStorage
    if (!email) {
        email = window.localStorage.getItem('emailForSignIn');
    }
    
    // If still not found, try the auth-email input
    if (!email) {
        const emailInput = document.getElementById('auth-email') as HTMLInputElement;
        email = emailInput?.value?.trim();
    }
    
    const nameInput = document.getElementById('signup-name') as HTMLInputElement;
    const name = nameInput?.value?.trim();
    
    if (!email) {
        showToast(t('toast.email_required_for_signin'), 'error');
        return;
    }
    
    if (!name) {
        showToast(t('toast.name_required_signup'), "error");
        return;
    }
    
    await sendMagicLink(email, name);
}


/**
 * Handles resending a magic link using the email stored in localStorage.
 */
async function handleResendMagicLink() {
    const email = window.localStorage.getItem('emailForSignIn');
    if (email) {
        await sendMagicLink(email); 
    } else {
        showToast(t('toast.resend_email_not_found'), 'error');
        switchAuthView('email-entry');
    }
}


/**
 * Handles the user returning to the app from a magic link.
 * @returns {Promise<boolean>} True if sign-in was handled, false otherwise.
 */
export async function handleSignInWithEmailLink(): Promise<boolean> {
    const url = window.location.href;
    if (auth && auth.isSignInWithEmailLink(url)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt(t('prompt.email_confirmation'));
        }
        if (!email) {
            showToast(t('toast.email_required_for_signin'), 'error');
            history.replaceState(null, '', window.location.pathname);
            return false;
        }

        toggleLoading(true, t('loading.signing_you_in'));
        try {
            // Get fresh auth instance
            const freshAuth = getAuth ? getAuth() : auth;
            if (!freshAuth) {
                throw new Error(t('toast.auth_not_available'));
            }
            
            const result = await freshAuth.signInWithEmailLink(email, url);
            window.localStorage.removeItem('emailForSignIn');
            
            const name = window.localStorage.getItem('nameForSignIn');
            window.localStorage.removeItem('nameForSignIn');
            
            if (!result.user) throw new Error(t('toast.magic_link_signin_failed'));

            if (name && !result.user.displayName) {
                await result.user.updateProfile({ displayName: name });
            }

            const user = { ...result.user, displayName: name || result.user.displayName };
            history.replaceState(null, '', window.location.pathname);
            completeLogin(user);
            return true;

        } catch (error: any) {
            history.replaceState(null, '', window.location.pathname);
            console.error("Magic link error:", error);
            showToast(t('toast.magic_link_invalid'), 'error');
            return false;
        } finally {
            toggleLoading(false);
        }
    }
    return false;
}

/**
 * Handles the logout process.
 */
export async function handleLogout() {
    // Get fresh auth instance
    const currentAuth = getAuth ? getAuth() : auth;
    if (!currentAuth) {
        // Still clear local state
        localStorage.removeItem('vcanship_user');
        localStorage.removeItem('vcanship_free_lookups');
        setState({
            isLoggedIn: false,
            currentUser: null,
            subscriptionTier: 'guest',
            aiLookupsRemaining: 0,
        });
        updateUIForAuthState();
        switchPage('landing');
        return;
    }
    
    await currentAuth.signOut();
    localStorage.removeItem('vcanship_user');
    localStorage.removeItem('vcanship_free_lookups');
    setState({
        isLoggedIn: false,
        currentUser: null,
        subscriptionTier: 'guest',
        aiLookupsRemaining: 0,
    });
    updateUIForAuthState();
    switchPage('landing');
}

/**
 * Sets up all event listeners for the authentication flow.
 */
export function initializeAuth() {
    // Don't use translations here if i18n isn't loaded yet
    const loadingMsg = t('loading.authenticating') || 'Authenticating...';
    toggleLoading(true, loadingMsg);
    
    // Function to try initializing auth
    const tryInitialize = () => {
        // Get fresh auth instance in case Firebase loaded after module import
        let currentAuth = getAuth ? getAuth() : auth;
        
        // Check window.firebase directly
        if (!currentAuth && typeof window !== 'undefined' && (window as any).firebase) {
            try {
                const fb = (window as any).firebase;
                if (fb.apps && fb.apps.length === 0) {
                    fb.initializeApp(firebaseConfig);
                }
                currentAuth = fb.auth();
    } catch (error) {
        // Silently handle Firebase initialization errors
    }
        }
        
        if (currentAuth && typeof currentAuth.onAuthStateChanged === 'function') {
            continueAuthInitialization(currentAuth);
            return true;
        }
        return false;
    };
    
    // Try immediately
    if (tryInitialize()) {
        return;
    }
    
    // If not available, wait with retries
    let retryCount = 0;
    const maxRetries = 20; // Try for 6 seconds (20 * 300ms)
    const retryInterval = 300;
    
    const retryAuth = setInterval(() => {
        retryCount++;
        
        if (tryInitialize()) {
            clearInterval(retryAuth);
        } else if (retryCount >= maxRetries) {
            clearInterval(retryAuth);
            toggleLoading(false);
        }
    }, retryInterval);
}

async function continueAuthInitialization(authInstance: any) {
    if (!authInstance || typeof authInstance.onAuthStateChanged !== 'function') {
        toggleLoading(false);
        return;
    }
    
    try {
        // Check for redirect result first (for redirect-based auth)
        try {
            const redirectResult = await authInstance.getRedirectResult();
            if (redirectResult?.user) {
                completeLogin(redirectResult.user);
                toggleLoading(false);
                return;
            }
        } catch (redirectError: any) {
            // Ignore redirect errors - might not be from redirect
        }
        
        // Set up auth state listener
        authInstance.onAuthStateChanged((user: any) => {
            if (user) {
                const userProfile = { name: user.displayName || user.email!.split('@')[0], email: user.email! };
                const savedLookups = localStorage.getItem('vcanship_free_lookups');
                setState({
                    isLoggedIn: true,
                    currentUser: userProfile,
                    subscriptionTier: 'free',
                    aiLookupsRemaining: savedLookups ? parseInt(savedLookups, 10) : 5,
                });
            } else {
                 setState({
                    isLoggedIn: false,
                    currentUser: null,
                    subscriptionTier: 'guest',
                    aiLookupsRemaining: 0,
                });
            }
            updateUIForAuthState();
            toggleLoading(false);
        });
    } catch (error) {
        toggleLoading(false);
        return;
    }

    // Modal controls
    document.getElementById('login-signup-btn')?.addEventListener('click', () => {
        switchAuthView('email-entry'); // Always start at the first step
        showAuthModal();
        // Auto-focus email input when modal opens
        setTimeout(() => {
            const emailInput = document.getElementById('auth-email') as HTMLInputElement;
            if (emailInput) emailInput.focus();
        }, 100);
    });
    DOMElements.closeAuthModalBtn.addEventListener('click', closeAuthModal);

    // View switching
    document.querySelectorAll('.back-to-auth-start-btn').forEach(btn => {
        btn.addEventListener('click', () => switchAuthView('email-entry'));
    });
    
    // Form submissions
    document.getElementById('email-form')?.addEventListener('submit', handleEmailContinue);
    document.getElementById('password-form')?.addEventListener('submit', handleSignInWithEmailAndPassword);
    document.getElementById('signup-form')?.addEventListener('submit', handleSignUpWithEmailAndPassword);

    // Real-time email validation
    const emailInput = document.getElementById('auth-email');
    if (emailInput) {
        emailInput.addEventListener('input', (e) => {
            const input = e.target as HTMLInputElement;
            const isValid = /^\S+@\S+\.\S+$/.test(input.value);
            input.classList.toggle('invalid', !isValid && input.value.length > 0);
            input.classList.toggle('valid', isValid);
        });
    }

    // Magic Link Buttons
    document.getElementById('send-magic-link-instead-btn')?.addEventListener('click', handleSendLoginMagicLink);
    document.getElementById('magic-link-signup-btn')?.addEventListener('click', handleSendSignupMagicLink);
    document.getElementById('resend-magic-link-btn')?.addEventListener('click', handleResendMagicLink);

    // Logout Button
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });

    // Social Logins
    document.querySelectorAll('.google-login-btn').forEach(button => {
        button.addEventListener('click', () => handleSocialLogin('Google'));
    });
    document.querySelectorAll('.apple-login-btn').forEach(button => {
        button.addEventListener('click', () => handleSocialLogin('Apple'));
    });

    // Password visibility toggles
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const passwordInput = toggle.previousElementSibling as HTMLInputElement;
            const icon = toggle.querySelector('i');
            if (!passwordInput || !icon) return;

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}
