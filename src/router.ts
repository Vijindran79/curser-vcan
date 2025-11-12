import SimpleLogin from './components/SimpleLogin';
import { showToast } from './ui';

// Error boundary for route loading
const handleRouteError = (error: any, routeName: string) => {
  console.error(`[ROUTER] Failed to load ${routeName}:`, error);
  showToast(`Failed to load ${routeName}. Please refresh the page.`, 'error');
  // Redirect to login on critical error
  window.location.href = '/#/login';
};

export const routes = {
  '/login': SimpleLogin,
  '/': SimpleLogin, // Show login on home page too
  '/dashboard': async () => {
    try {
      const module = await import('./components/Dashboard');
      return module.default;
    } catch (error) {
      handleRouteError(error, 'Dashboard');
      // Return fallback component
      return () => {
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>⚠️ Dashboard Loading Error</h2>
            <p>Please refresh the page or contact support.</p>
            <button 
              onClick={() => window.location.reload()}
              style={{ padding: '10px 20px', marginTop: '20px' }}
            >
              Refresh Page
            </button>
          </div>
        );
      };
    }
  },
  '/payment': async () => {
    try {
      const module = await import('./components/PaymentPage');
      return module.default;
    } catch (error) {
      handleRouteError(error, 'Payment Page');
      return () => <div>Payment page loading error. Please try again.</div>;
    }
  }
};

// Router navigation with error handling
export function navigateTo(path: string) {
  try {
    window.location.hash = path;
    console.log('[ROUTER] Navigated to:', path);
  } catch (error) {
    console.error('[ROUTER] Navigation error:', error);
    showToast('Navigation failed. Please try again.', 'error');
  }
}