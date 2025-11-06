// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { mountService } from './router';
// FIX: Import 'showAuthModal' to handle login button clicks from the mobile menu.
import { switchPage, showToast, showPrelaunchModal, closePrelaunchModal, toggleLoading, showAuthModal } from './ui';
import { Page, Service, State, setState } from './state';
import { initializePaymentPage } from './payment';
import { initializeLocaleSwitcher } from './LocaleSwitcher';
import { initializeAuth, handleLogout, updateUIForAuthState, handleSignInWithEmailLink } from './auth';
import { initializeStaticPages, renderApiHubPage } from './static_pages';
import { initializeDashboard } from './dashboard';
import { initializeAccountPages }from './account';
import { initializeI18n, updateStaticUIText, t } from './i18n';
import { initializeSidebar, getAllServicesConfig } from './sidebar';
import { unmountPromotionBanner } from './promotions';
import { initializeSettings } from './settings';
import { makeDraggable } from './utils';
import { getChatbotResponse } from './api';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Expose switchPage and mountService to global scope for HTML onclick handlers
(window as any).switchPage = switchPage;
(window as any).mountService = mountService;

// --- Global state for chat ---
let conversationHistory: { role: 'user' | 'model', text: string }[] = [];

// --- Chat Window Helpers ---
function openChatWindow() {
    const chatWindow = document.getElementById('chat-window');
    const input = document.getElementById('chat-input') as HTMLInputElement;
    if (chatWindow) {
        chatWindow.classList.remove('hidden');
        if (input) {
            setTimeout(() => input.focus(), 100);
        }
    } else {
        console.error('[CHAT] Chat window element not found!');
    }
}
function closeChatWindow() {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatWindow.classList.add('hidden');
    }
}

// --- Theme Management ---
function applyTheme(theme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vcanship-theme', theme);
    updateThemeIcons();
}

function updateThemeIcons() {
    // Update all theme switch buttons to show correct icon
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    
    // Update icon opacity
    document.querySelectorAll('.theme-switch-icons').forEach(icons => {
        const sunIcon = icons.querySelector('.fa-sun') as HTMLElement;
        const moonIcon = icons.querySelector('.fa-moon') as HTMLElement;
        if (sunIcon && moonIcon) {
            if (currentTheme === 'dark') {
                sunIcon.style.opacity = '1';
                moonIcon.style.opacity = '0.3';
            } else {
                sunIcon.style.opacity = '0.3';
                moonIcon.style.opacity = '1';
            }
        }
    });
    
    // Update theme mode text
    const themeText = document.getElementById('theme-mode-text');
    if (themeText) {
        themeText.textContent = currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('vcanship-theme');
    // Default to light (daylight) mode if no saved preference
    const initialTheme = (savedTheme || 'light') as 'light' | 'dark';
    applyTheme(initialTheme);

    // Use event delegation on the body for theme switches in header AND mobile menu
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const themeSwitch = target.closest('.theme-switch');
        if (!themeSwitch) return;

        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        if (State.currentPage === 'api-hub') {
            renderApiHubPage(); // Re-render API hub to apply theme to Monaco editor
        }
    });
}

// --- Mobile Scroll Behavior for Header ---
function initializeHeaderScroll() {
    let lastScrollTop = 0;
    const delta = 5;
    const header = document.querySelector('header');

    window.addEventListener('scroll', () => {
        if (!header) return;
        if (window.innerWidth > 992) {
            header.classList.remove('header-hidden');
            return;
        }
        
        const scrollTop = window.scrollY;

        if (Math.abs(lastScrollTop - scrollTop) <= delta) return;

        if (scrollTop > lastScrollTop && scrollTop > header.offsetHeight){
            header.classList.add('header-hidden');
        } else {
            if(scrollTop + window.innerHeight < document.documentElement.scrollHeight) {
                header.classList.remove('header-hidden');
            }
        }
        lastScrollTop = scrollTop;
    }, false);
}

// --- Mobile Menu & FAB ---
function populateMobileMenu() {
    const contentContainer = document.getElementById('mobile-menu-content');
    if (!contentContainer) return;
    
    const { isLoggedIn, currentUser } = State;
    const services = getAllServicesConfig();

    let authSectionHtml = '';
    if (isLoggedIn && currentUser) {
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        authSectionHtml = `
            <div class="mobile-menu-user">
                <div class="user-avatar">${initials}</div>
                <span>${currentUser.name}</span>
            </div>
            <button class="mobile-menu-nav-item static-link" data-page="dashboard"><i class="fa-solid fa-table-columns"></i> ${t('mobile_menu.dashboard')}</button>
            <button class="mobile-menu-nav-item static-link" data-page="address-book"><i class="fa-solid fa-address-book"></i> ${t('mobile_menu.address_book')}</button>
            <button class="mobile-menu-nav-item static-link" data-page="settings"><i class="fa-solid fa-gear"></i> ${t('mobile_menu.account_settings')}</button>
        `;
    }

    const servicesHtml = services.map(s => `
        <button class="mobile-menu-nav-item sidebar-btn-service" data-service="${s.id}"><i class="${s.icon}"></i> ${s.name}</button>
    `).join('');
    
    const staticLinksHtml = `
        <button class="mobile-menu-nav-item static-link" data-page="api-hub"><i class="fa-solid fa-code"></i> ${t('sidebar.apiHub')}</button>
        <button class="mobile-menu-nav-item static-link" data-page="help"><i class="fa-solid fa-question-circle"></i> ${t('sidebar.helpCenter')}</button>
    `;

    let loginLogoutHtml = '';
    if (isLoggedIn) {
        loginLogoutHtml = `<button class="mobile-menu-nav-item" id="mobile-logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> ${t('mobile_menu.logout')}</button>`;
    } else {
        loginLogoutHtml = `<button class="mobile-menu-nav-item" id="mobile-login-btn"><i class="fa-solid fa-arrow-right-to-bracket"></i> ${t('mobile_menu.login')}</button>`;
    }

    contentContainer.innerHTML = `
        <div class="mobile-menu-header">
            <a href="#" class="logo static-link" data-page="landing" aria-label="VCanship Home">
                <img src="./logo.svg" alt="VCanship Logo" class="logo-img">
            </a>
            <button class="header-icon-btn" id="close-mobile-menu-btn" aria-label="Close menu" data-i18n-aria="aria.close_menu">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
        <nav class="mobile-menu-nav">
            ${authSectionHtml}
            ${isLoggedIn ? '<div class="mobile-menu-divider"></div>' : ''}
            <h4 class="mobile-menu-section-title">${t('mobile_menu.services')}</h4>
            ${servicesHtml}
            <div class="mobile-menu-divider"></div>
            ${staticLinksHtml}
        </nav>
        <div class="mobile-menu-footer">
            ${loginLogoutHtml}
            <div class="mobile-menu-settings-group">
                <button id="settings-language-btn" class="header-icon-btn" aria-label="Change region and language" data-i18n-aria="aria.change_locale">
                    <i class="fa-solid fa-globe"></i>
                </button>
                <button class="header-icon-btn theme-switch" aria-label="Toggle theme" data-i18n-aria="aria.toggle_theme">
                    <i class="fas fa-moon"></i>
                    <i class="fas fa-sun"></i>
                </button>
            </div>
        </div>
    `;

    // Attach listeners for dynamically added elements that aren't handled by delegation
    document.getElementById('mobile-login-btn')?.addEventListener('click', showAuthModal);
    document.getElementById('mobile-logout-btn')?.addEventListener('click', handleLogout);
}

function initializeSimpleChatFab() {
    console.log('[FAB DEBUG] Initializing floating glass buttons');
    
    // Glass FAB: Chat
    const chatFab = document.getElementById('glass-fab-chat');
    if (chatFab) {
        let clickTimeout: any;
        let isDragging = false;
        
        chatFab.addEventListener('mousedown', () => {
            isDragging = false;
            clickTimeout = setTimeout(() => { isDragging = true; }, 200);
        });
        
        chatFab.addEventListener('mouseup', () => {
            clearTimeout(clickTimeout);
            if (!isDragging) {
                console.log('[FAB] Chat button clicked');
                openChatWindow();
            }
        });
        
        chatFab.addEventListener('touchstart', () => {
            isDragging = false;
            clickTimeout = setTimeout(() => { isDragging = true; }, 200);
        });
        
        chatFab.addEventListener('touchend', (e) => {
            clearTimeout(clickTimeout);
            if (!isDragging) {
                e.preventDefault();
                console.log('[FAB] Chat button tapped');
                openChatWindow();
            }
        });
        
        makeDraggable(chatFab, 'glass-fab-chat-position');
    }
    
    // Glass FAB: Settings
    const settingsFab = document.getElementById('glass-fab-settings');
    const settingsPanel = document.getElementById('glass-settings-panel');
    const closeSettings = document.getElementById('close-settings-panel');
    const backdrop = document.getElementById('glass-panel-backdrop');
    
    if (settingsFab && settingsPanel && backdrop) {
        let clickTimeout: any;
        let isDragging = false;
        
        settingsFab.addEventListener('mousedown', () => {
            isDragging = false;
            clickTimeout = setTimeout(() => { isDragging = true; }, 200);
        });
        
        settingsFab.addEventListener('mouseup', async () => {
            clearTimeout(clickTimeout);
            if (!isDragging) {
                console.log('[FAB] Settings button clicked');
                settingsPanel.classList.remove('hidden');
                backdrop.classList.remove('hidden');
                // Refresh translations when panel opens
                const { updateStaticUIText } = await import('./i18n');
                updateStaticUIText();
            }
        });
        
        settingsFab.addEventListener('touchend', (e) => {
            clearTimeout(clickTimeout);
            if (!isDragging) {
                e.preventDefault();
                settingsPanel.classList.remove('hidden');
                backdrop.classList.remove('hidden');
            }
        });
        
        makeDraggable(settingsFab, 'glass-fab-settings-position');
    }
    
    if (closeSettings && settingsPanel && backdrop) {
        closeSettings.addEventListener('click', () => {
            settingsPanel.classList.add('hidden');
            backdrop.classList.add('hidden');
        });
    }
    
    // Glass FAB: Contact
    const contactFab = document.getElementById('glass-fab-contact');
    const contactPanel = document.getElementById('glass-contact-panel');
    const closeContact = document.getElementById('close-contact-panel');
    
    if (contactFab && contactPanel && backdrop) {
        let clickTimeout: any;
        let isDragging = false;
        
        contactFab.addEventListener('mousedown', () => {
            isDragging = false;
            clickTimeout = setTimeout(() => { isDragging = true; }, 200);
        });
        
        contactFab.addEventListener('mouseup', () => {
            clearTimeout(clickTimeout);
            if (!isDragging) {
                console.log('[FAB] Contact button clicked');
                contactPanel.classList.remove('hidden');
                backdrop.classList.remove('hidden');
            }
        });
        
        contactFab.addEventListener('touchend', (e) => {
            clearTimeout(clickTimeout);
            if (!isDragging) {
                e.preventDefault();
                contactPanel.classList.remove('hidden');
                backdrop.classList.remove('hidden');
            }
        });
        
        makeDraggable(contactFab, 'glass-fab-contact-position');
    }
    
    if (closeContact && contactPanel && backdrop) {
        closeContact.addEventListener('click', () => {
            contactPanel.classList.add('hidden');
            backdrop.classList.add('hidden');
        });
    }
    
    // Close panels when backdrop is clicked
    if (backdrop && settingsPanel && contactPanel) {
        backdrop.addEventListener('click', () => {
            settingsPanel.classList.add('hidden');
            contactPanel.classList.add('hidden');
            backdrop.classList.add('hidden');
        });
    }
    
    // Settings Panel: Locale button
    const panelLocaleBtn = document.getElementById('panel-locale-btn');
    const headerLocaleBtn = document.getElementById('header-locale-btn');
    if (panelLocaleBtn && headerLocaleBtn) {
        panelLocaleBtn.addEventListener('click', () => {
            headerLocaleBtn.click(); // Trigger existing locale switcher
        });
    }
    
    // Settings Panel: Theme toggle - handled by event delegation on body
    // No need for separate handler, the .theme-switch class triggers the global handler
    
    // Settings Panel: Login button
    const panelLoginBtn = document.getElementById('panel-login-btn');
    if (panelLoginBtn) {
        panelLoginBtn.addEventListener('click', () => {
            showAuthModal();
            if (settingsPanel && backdrop) {
                settingsPanel.classList.add('hidden');
                backdrop.classList.add('hidden');
            }
        });
    }
    
    // Settings Panel: Logout button
    const panelLogoutBtn = document.getElementById('panel-logout-btn');
    if (panelLogoutBtn) {
        panelLogoutBtn.addEventListener('click', () => {
            handleLogout();
            if (settingsPanel && backdrop) {
                settingsPanel.classList.add('hidden');
                backdrop.classList.add('hidden');
            }
        });
    }
    
    // Update panel UI based on auth state
    updatePanelAuthState();
    
    console.log('[FAB DEBUG] Floating glass buttons initialized');
}

// Update settings panel to show user info or login button
export function updatePanelAuthState() {
    const panelUserInfo = document.getElementById('panel-user-info');
    const panelLoginBtn = document.getElementById('panel-login-btn');
    const panelUserName = document.getElementById('panel-user-name');
    const panelUserAvatar = document.getElementById('panel-user-avatar');
    
    // Sync locale display
    syncPanelLocale();
    
    if (!State.isLoggedIn || !State.currentUser) {
        // User not logged in
        panelUserInfo?.style.setProperty('display', 'none');
        panelLoginBtn?.style.setProperty('display', 'flex');
    } else {
        // User logged in
        panelUserInfo?.style.setProperty('display', 'block');
        panelLoginBtn?.style.setProperty('display', 'none');
        
        if (panelUserName) {
            panelUserName.textContent = State.currentUser.name || State.currentUser.email || 'User';
        }
        
        if (panelUserAvatar) {
            // Create initials from user name or email
            const displayName = State.currentUser.name || State.currentUser.email || 'User';
            const initials = displayName.substring(0, 2).toUpperCase();
            panelUserAvatar.textContent = initials;
            panelUserAvatar.style.backgroundImage = '';
            panelUserAvatar.style.backgroundColor = 'var(--primary-orange)';
            panelUserAvatar.style.color = 'white';
        }
    }
}

// Make function available globally for auth.ts to call
(window as any).updatePanelAuthState = updatePanelAuthState;

// Sync locale display in panel
function syncPanelLocale() {
    const panelFlag = document.getElementById('panel-locale-flag');
    const panelLanguage = document.getElementById('panel-locale-language');
    const panelCountry = document.getElementById('panel-locale-country');
    
    const headerFlag = document.getElementById('header-locale-flag');
    const headerLanguage = document.getElementById('header-locale-language');
    const headerCountry = document.getElementById('header-locale-country');
    
    if (panelFlag && headerFlag) {
        panelFlag.textContent = headerFlag.textContent;
    }
    if (panelLanguage && headerLanguage) {
        panelLanguage.textContent = headerLanguage.textContent;
    }
    if (panelCountry && headerCountry) {
        panelCountry.textContent = headerCountry.textContent;
    }
}


// --- Chatbot ---
function initializeChatbot() {
    const chatWindow = document.getElementById('chat-window');
    const closeBtn = document.getElementById('close-chat-btn');
    const form = document.getElementById('chat-form') as HTMLFormElement;
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const history = document.getElementById('chat-history');
    const suggestionsContainer = document.getElementById('chat-suggestions');

    if (!chatWindow || !closeBtn || !form || !history || !suggestionsContainer) return;

    closeBtn.addEventListener('click', closeChatWindow);
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = input.value.trim();
        if (!message) return;

        input.value = '';
        input.disabled = true;

        // Display user message
        const userMessageEl = document.createElement('div');
        userMessageEl.className = 'chat-message user-message';
        userMessageEl.textContent = message;
        history.appendChild(userMessageEl);
        
        conversationHistory.push({ role: 'user', text: message });
        
        // Hide suggestions
        suggestionsContainer.style.display = 'none';
        
        // Display thinking indicator
        const thinkingIndicator = document.createElement('div');
        thinkingIndicator.className = 'chat-message bot-message thinking-indicator';
        thinkingIndicator.innerHTML = `<span>${t('chatbot.thinking')}</span><div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
        history.appendChild(thinkingIndicator);
        history.scrollTop = history.scrollHeight;
        
        try {
            const responseText = await getChatbotResponse(message, conversationHistory);
            
            conversationHistory.push({ role: 'model', text: responseText });

            const botMessageEl = document.createElement('div');
            botMessageEl.className = 'chat-message bot-message';
            botMessageEl.textContent = responseText;
            history.appendChild(botMessageEl);
        } catch (error) {
            const errorMessageEl = document.createElement('div');
            errorMessageEl.className = 'chat-message bot-message error';
            errorMessageEl.textContent = t('chatbot.error');
            history.appendChild(errorMessageEl);
        } finally {
            thinkingIndicator.remove();
            input.disabled = false;
            input.focus();
            history.scrollTop = history.scrollHeight;
        }
    });

    suggestionsContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        if (target.classList.contains('suggestion-btn')) {
            input.value = target.textContent || '';
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    });
}

// --- Main App Initialization ---
async function initializeApp() {
    try {
        // Check for magic link sign-in first
        const signedIn = await handleSignInWithEmailLink();
        if (signedIn) {
          // If sign-in was handled, wait a moment for auth state to propagate before initializing everything else
          // This avoids race conditions with UI updates.
          setTimeout(() => {
              initializeCoreApp().catch(() => {
                  // Fail silently - UI will show error message
              });
          }, 500);
        } else {
          await initializeCoreApp();
        }
    } catch (error) {
        // Show error message but don't crash completely
        if (document.body) {
            document.body.innerHTML = `
                <div style="padding: 2rem; text-align: center; font-family: system-ui;">
                    <h1>Loading Error</h1>
                    <p>Please refresh the page. If the problem persists, contact support.</p>
                    <button onclick="location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem; cursor: pointer;">Refresh Page</button>
                </div>
            `;
        }
    }
}

// --- Service Worker Management ---
async function initializeServiceWorker() {
    // UNREGISTER all service workers - they're causing slow loading
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log('[SW] Unregistered service worker');
            }
            
            // Clear all caches
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('[SW] Cleared all caches');
        } catch (error) {
            console.error('[SW] Cleanup error:', error);
        }
    }
}

async function initializeCoreApp() {
    try {
        initializeTheme();
        initializeHeaderScroll();
        
        // Initialize service worker after everything else (non-blocking)
        // Don't await - let the app load first
        initializeServiceWorker().catch(() => {
            // Fail silently - service worker is not critical
        });
        
        // CRITICAL FIX: Await the initialization of i18n to ensure translations are loaded
        // before any other UI component tries to access them. This prevents race conditions.
        await initializeI18n();
        
        // Initialize Google GenAI API client
        // Note: This requires a Gemini API key. For production, this should be stored securely
        // and fetched from your backend or environment variables.
        try {
            // Check if API key is available in environment or localStorage
            // For now, we'll initialize without a key and let services handle the error gracefully
            // In production, you should provide a valid API key here
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || 'REPLACE_WITH_NEW_GEMINI_KEY';
            if (apiKey) {
                const genAI = new GoogleGenerativeAI(apiKey);
                setState({ api: genAI });
            } else {
                // Set to null explicitly so services can handle gracefully
                setState({ api: null });
            }
        } catch (error) {
            setState({ api: null });
        }
        
        // Initialize auth AFTER i18n is loaded so translations are available
        initializeAuth();
        
        // Initialize locale switcher (language/country/currency selector)
        await initializeLocaleSwitcher();

        // 🌍 Initialize country detection and auto-configuration
        try {
            const { initializeCountryDetection } = await import('./country-detection');
            await initializeCountryDetection();
            console.log('✅ Country detection initialized');
        } catch (error) {
            console.warn('Country detection failed:', error);
        }

        // 📱 Initialize phone rotation suggestion popup
        try {
            const { initializeRotationSuggestion } = await import('./rotation-popup');
            initializeRotationSuggestion();
            console.log('✅ Rotation popup initialized');
        } catch (error) {
            console.warn('Rotation popup failed:', error);
        }

        // 🛒 Initialize guest checkout system
        try {
            const { checkShowSignupPrompt } = await import('./guest-checkout');
            // Check if should show post-payment signup prompt
            checkShowSignupPrompt();
            console.log('✅ Guest checkout initialized');
        } catch (error) {
            console.warn('Guest checkout initialization failed:', error);
        }

        // Now that translations are ready, initialize the rest of the app.
        initializeStaticPages();
        initializeSidebar();
        console.log('[APP DEBUG] Initializing simple chat FAB');
        initializeSimpleChatFab(); // Simple chat FAB
        initializeSettings(); // Keep for potential non-mobile settings functionality
        initializeDashboard();
        initializeAccountPages();
        initializePaymentPage();
        
        // Initialize subscription system (non-blocking - don't wait for it)
        import('./subscription').then(({ initializeSubscription }) => {
            initializeSubscription().catch(() => {
                // Subscription is optional - fail silently
            });
        }).catch(() => {
            // Subscription module is optional - fail silently
        });
        
        initializeChatbot();

        // Attach listeners to static links
        document.body.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const staticLink = target.closest<HTMLElement>('.static-link');
            const serviceLink = target.closest<HTMLElement>('.sidebar-btn-service, .service-promo-card, .service-grid-item');

            if (staticLink?.dataset.page) {
                e.preventDefault();
                const page = staticLink.dataset.page as Page;
                if (page === State.currentPage) return;
                mountService(page);
            } else if (serviceLink?.dataset.service) {
                 e.preventDefault();
                const service = serviceLink.dataset.service as Service;
                mountService(service);
            }
        });

        // Tracking modal trigger
        if (DOMElements.trackBtn && DOMElements.trackingModal && DOMElements.closeTrackingModalBtn && DOMElements.trackingForm && DOMElements.trackingIdInput) {
            DOMElements.trackBtn.addEventListener('click', () => {
                DOMElements.trackingModal.classList.add('active');
            });
            DOMElements.closeTrackingModalBtn.addEventListener('click', () => {
                DOMElements.trackingModal.classList.remove('active');
            });
            DOMElements.trackingForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const trackingId = DOMElements.trackingIdInput.value.trim().toUpperCase();
                DOMElements.trackingModal.classList.remove('active');
                
                // Import tracking module dynamically
                const { renderTrackingPage } = await import('./tracking');
                renderTrackingPage(trackingId);
                
                // Update URL
                window.location.hash = `tracking/${trackingId}`;
            });
        }

        // Inspector modal trigger
        const inspectorBtn = document.getElementById('compliance-btn');
        if (inspectorBtn && DOMElements.inspectorModal && DOMElements.closeInspectorModalBtn) {
            inspectorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                DOMElements.inspectorModal.classList.add('active');
            });
            DOMElements.closeInspectorModalBtn.addEventListener('click', () => {
                DOMElements.inspectorModal.classList.remove('active');
            });
        }
    } catch (error) {
        // Show error notification but allow app to continue
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff4444; color: white; padding: 1rem; border-radius: 8px; z-index: 10000; max-width: 300px;';
        errorDiv.innerHTML = '<strong>Error loading some features</strong><br>Please refresh the page.<br><button onclick="location.reload()" style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; cursor: pointer;">Refresh</button>';
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 10000);
    }
}

// --- App Start ---
initializeApp().catch((error) => {
    console.error('Failed to initialize app:', error);
    // Show error to user
    document.body.innerHTML = `
        <div style="padding: 2rem; text-align: center; font-family: system-ui;">
            <h1>Loading Error</h1>
            <p>Please refresh the page. If the problem persists, contact support.</p>
            <button onclick="location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem; cursor: pointer;">Refresh Page</button>
        </div>
    `;
});

let lastScrollY = 0;
let headerHideRAF: number | null = null;

function initializeHeaderAutoHide() {
  const header = document.querySelector('header') as HTMLElement | null;
  if (!header) return;
  header.classList.add('header--visible');

  const onScroll = () => {
    const current = window.scrollY || 0;
    const delta = current - lastScrollY;
    lastScrollY = current;

    if (headerHideRAF) cancelAnimationFrame(headerHideRAF);
    headerHideRAF = requestAnimationFrame(() => {
      if (current <= 0) {
        header.classList.remove('header--hidden', 'header--compact');
        header.classList.add('header--visible');
        return;
      }
      if (delta > 4) {
        // Scrolling down -> hide
        header.classList.add('header--hidden', 'header--compact');
        header.classList.remove('header--visible');
      } else if (delta < -4) {
        // Scrolling up -> show compact
        header.classList.remove('header--hidden');
        header.classList.add('header--visible', 'header--compact');
      }
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
}

function initializeFloatingFabEnhancements() {
  const fab = document.getElementById('main-fab-toggle') as HTMLButtonElement | null;
  
  if (!fab) {
    // Legacy FAB element not found - this is expected, modern glass FABs are used instead
    return;
  }
  
  fab.classList.add('fab-glass', 'fab-draggable');
  console.log('[FAB DEBUG] Added CSS classes to FAB');

  // Create quick menu once
  let menu = document.getElementById('fab-quick-menu') as HTMLElement | null;
  console.log('[FAB DEBUG] Quick menu element:', menu ? 'Found' : 'Not found');
  
  if (!menu) {
    console.log('[FAB DEBUG] Creating new quick menu element');
    menu = document.createElement('div');
    menu.id = 'fab-quick-menu';
    menu.className = 'fab-quick-menu';
    menu.innerHTML = `
      <div class="menu-item" id="fab-lang">
        <i class="fa-solid fa-globe"></i>
        <span>Language & Region</span>
      </div>
      <div class="menu-item" id="fab-theme">
        <i class="fa-solid fa-circle-half-stroke"></i>
        <span>Toggle Theme</span>
      </div>
      <div class="menu-sep"></div>
      <div class="menu-item" id="fab-account">
        <i class="fa-solid fa-user"></i>
        <span>Sign In / Account</span>
      </div>
    `;
    document.body.appendChild(menu);
    console.log('[FAB DEBUG] Quick menu created and appended to body');
  }

  const toggleMenu = () => {
    menu!.classList.toggle('active');
  };
  fab.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMenu();
  });

  // Menu actions
  const langBtn = document.getElementById('fab-lang');
  const themeBtn = document.getElementById('fab-theme');
  const accountBtn = document.getElementById('fab-account');

  langBtn?.addEventListener('click', () => {
    // Open existing locale modal
    const openLocaleBtn = document.getElementById('header-locale-btn') as HTMLButtonElement | null;
    if (openLocaleBtn) openLocaleBtn.click();
    menu!.classList.remove('active');
  });
  themeBtn?.addEventListener('click', () => {
    // Trigger existing theme switch button
    const themeSwitch = document.querySelector('.theme-switch') as HTMLButtonElement | null;
    themeSwitch?.click();
    menu!.classList.remove('active');
  });
  accountBtn?.addEventListener('click', () => {
    // Open auth modal (existing button)
    const loginBtn = document.getElementById('login-signup-btn') as HTMLButtonElement | null;
    loginBtn?.click();
    menu!.classList.remove('active');
  });

  // Draggable (pointer events)
  let dragging = false;
  let startX = 0, startY = 0;
  let fabX = 0, fabY = 0;

  const setFabPos = (x: number, y: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = fab.getBoundingClientRect();
    const maxX = vw - rect.width - 8;
    const maxY = vh - rect.height - 8;
    const clampedX = Math.max(8, Math.min(x, maxX));
    const clampedY = Math.max(8, Math.min(y, maxY));
    fab.style.position = 'fixed';
    fab.style.left = `${clampedX}px`;
    fab.style.top = `${clampedY}px`;
  };

  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    fab.setPointerCapture(e.pointerId);
    const rect = fab.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    fabX = rect.left;
    fabY = rect.top;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const x = e.clientX - startX;
    const y = e.clientY - startY;
    setFabPos(x, y);
  };
  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    try { fab.releasePointerCapture(e.pointerId); } catch {}
  };

  fab.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

// Hook into app init
(function attachHeaderFabEnhancements(){
  console.log('[FAB DEBUG] Attaching header FAB enhancements');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeHeaderAutoHide();
      // initializeFloatingFabEnhancements(); // Disabled - element doesn't exist
    });
  } else {
    initializeHeaderAutoHide();
    // initializeFloatingFabEnhancements(); // Disabled - element doesn't exist
  }
})();