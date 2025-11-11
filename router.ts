// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { showToast, switchPage, showAuthModal, toggleLoading, showPrelaunchModal } from './ui';
import { State, setState, type Service, Page } from './state';

// Static imports for all service modules
import { startParcel } from './parcel';
import { startBaggage } from './baggage';
import { startFcl } from './fcl';
import { startLcl } from './lcl';
import { startAirfreight } from './airfreight';
import { startRailway } from './railway';
import { startInland } from './inland';
import { startBulk } from './bulk';
import { startSecureTrade } from './secure-trade';
// import { startWarehouse } from './warehouse'; // Temporarily removed - API integration pending
// FIX: Enabled import for startEcom.
import { startEcom } from './ecommerce';
import { startSchedules } from './schedules';
import { startRegister } from './register';
import { startServiceProviderRegister } from './service-provider-register';
import { renderLandingPage, renderHelpPage, renderApiHubPage, renderPrivacyPage, renderTermsPage } from './static_pages';
import { renderDashboard } from './dashboard';
import { renderAddressBook, renderAccountSettings } from './account';
import { mountPromotionBanner, unmountPromotionBanner } from './promotions';
import { renderTrackingPage } from './tracking';


/**
 * Retrieves the correct start function for a given service.
 * This function acts as the central switchboard for all service modules.
 * @param service The key of the service.
 * @returns The start function or null if not found.
 */
function getServiceModule(service: string): (() => void) | null {
    switch (service) {
        case 'parcel': return startParcel;
        case 'baggage': return startBaggage;
        case 'fcl': return startFcl;
        case 'lcl': return startLcl;
        case 'airfreight': return startAirfreight;
        // case 'warehouse': return startWarehouse; // Temporarily removed - API integration pending
        case 'ecommerce': return startEcom;
        case 'schedules': return startSchedules;
        case 'register': return startRegister; // Trade Finance
        case 'service-provider-register': return startServiceProviderRegister;
        case 'railway': return startRailway;
        case 'inland': return startInland;
        case 'bulk': return startBulk;
        case 'secure-trade': return startSecureTrade;
        default: return null;
    }
}

/**
 * Retrieves the correct render function for a static page.
 * @param page The key of the page.
 * @returns The render function or null if not a static page.
 */
function getStaticPageRenderer(page: string): (() => void) | null {
    switch(page) {
        case 'landing': return renderLandingPage;
        case 'dashboard': return renderDashboard;
        case 'address-book': return renderAddressBook;
        case 'settings': return renderAccountSettings;
        case 'api-hub': return renderApiHubPage;
        case 'help': return renderHelpPage;
        case 'privacy': return renderPrivacyPage;
        case 'terms': return renderTermsPage;
        case 'tracking': return () => renderTrackingPage();
        case 'address-autocomplete':
            return async () => {
                try {
                    const { renderAddressAutocompletePage, initializeAddressAutocomplete } = await import('./address-autocomplete');
                    const page = document.getElementById('page-address-autocomplete');
                    if (page) {
                        page.innerHTML = renderAddressAutocompletePage();
                        await initializeAddressAutocomplete();
                        switchPage('address-autocomplete');
                    } else {
                        console.error('Address autocomplete page element not found');
                        showToast('Address page not available', 'error');
                    }
                } catch (error) {
                    console.error('Failed to load address autocomplete page:', error);
                    showToast('Failed to load address page', 'error');
                }
            };
        case 'subscription': 
            return async () => {
                try {
                    const { renderSubscriptionPage } = await import('./subscription');
                    const page = document.getElementById('page-subscription');
                    if (page) {
                        page.innerHTML = renderSubscriptionPage();
                        switchPage('subscription');
                    } else {
                        console.error('Subscription page element not found');
                        showToast('Subscription page not available', 'error');
                    }
                } catch (error) {
                    console.error('Failed to load subscription page:', error);
                    const { showToast } = await import('./ui');
                    showToast('Failed to load subscription page', 'error');
                }
            };
        default: return null;
    }
}


/**
 * Mounts a service page based on the service key.
 * @param pageOrService The key of the page or service to mount.
 */
export const mountService = async (pageOrService: string) => {
    // Always clear promotional banners when navigating
    unmountPromotionBanner();
    
    // Service provider registration is a public page and doesn't require login
    if (pageOrService === 'service-provider-register') {
        // Fall through to logic
    } else {
        // Services that require a user to be logged in.
        const servicesRequiringAuth = [
            'ecommerce',
            'dashboard',
            'address-book',
            'settings',
        ];

        if (servicesRequiringAuth.includes(pageOrService) && !State.isLoggedIn) {
            setState({ postLoginRedirectService: pageOrService as Service });
            showAuthModal();
            return;
        }
    }
    
    // Handle static/account pages by directly rendering them
    const pageRenderer = getStaticPageRenderer(pageOrService);
    if (pageRenderer) {
        setState({ currentService: null }); // It's not a dynamic service, it's a static page view
        pageRenderer();
        switchPage(pageOrService as Page);
        return;
    }
    
    // Handle dynamic service modules
    const serviceModule = getServiceModule(pageOrService);
    if (typeof serviceModule === 'function') {
        try {
            setState({ currentService: pageOrService as Service });
            serviceModule();
            mountPromotionBanner(pageOrService as Service); // Mount the banner for this service
        } catch (error) {
            console.error(`Failed to load service module for '${pageOrService}':`, error);
            showToast(`Could not load the ${pageOrService} service. Please try again.`, 'error');
            // Ensure we return to a stable state
            if (State.currentPage !== 'landing') {
                switchPage('landing');
            }
        }
    } else {
        showToast(`The '${pageOrService}' service is not available yet.`, 'info');
        console.warn(`Attempted to mount unknown service: ${pageOrService}`);
    }
};