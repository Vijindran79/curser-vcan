/**
 * Bloomberg Branding Deployment Fix
 * Senior-level solution to bypass all caching and timing issues
 */

export class BloombergFix {
  private static instance: BloombergFix;
  private isApplied = false;
  private retryCount = 0;
  private maxRetries = 5;

  static getInstance(): BloombergFix {
    if (!BloombergFix.instance) {
      BloombergFix.instance = new BloombergFix();
    }
    return BloombergFix.instance;
  }

  /**
   * Force apply Bloomberg branding with aggressive bypass techniques
   */
  forceApplyBranding(): void {
    console.log('🚀 BloombergFix: Starting aggressive branding application...');
    
    // 1. KILL SERVICE WORKER CACHE
    this.killServiceWorker();
    
    // 2. FORCE RELOAD CSS
    this.forceReloadCSS();
    
    // 3. WAIT FOR DOM THEN APPLY
    this.waitForDomAndApply();
    
    // 4. SET UP MUTATION OBSERVER FOR DYNAMIC CONTENT
    this.setupMutationObserver();
    
    // 5. ADD VISIBILITY CHECKER
    this.addVisibilityChecker();
  }

  private killServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister().then(() => {
            console.log('🗑️ Service Worker killed:', registration.scope);
          });
        });
      });
    }
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
          console.log('🗑️ Cache cleared:', cacheName);
        });
      });
    }
  }

  private forceReloadCSS(): void {
    // Find all CSS links and force reload
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        // Add timestamp to force reload
        const newHref = href.split('?')[0] + '?t=' + Date.now();
        link.setAttribute('href', newHref);
        console.log('🔄 CSS force reloaded:', newHref);
      }
    });
  }

  private waitForDomAndApply(): void {
    const tryApply = () => {
      if (this.retryCount >= this.maxRetries) {
        console.log('❌ Max retries reached, stopping application');
        return;
      }

      this.retryCount++;
      console.log(`🔄 Attempt ${this.retryCount}/${this.maxRetries}`);

      // Try multiple strategies
      this.applyBrandingStrategies();
      
      // Check if branding is visible
      setTimeout(() => {
        if (!this.isBrandingVisible()) {
          console.log('👀 Branding not visible yet, retrying...');
          setTimeout(tryApply, 1000);
        } else {
          console.log('✅ Branding successfully applied!');
          this.isApplied = true;
        }
      }, 500);
    };

    // Start immediately and also on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryApply);
    } else {
      tryApply();
    }
  }

  private applyBrandingStrategies(): void {
    // Strategy 1: Direct DOM manipulation
    this.applyDirectStyling();
    
    // Strategy 2: Inject styles
    this.injectBloombergStyles();
    
    // Strategy 3: Override existing styles
    this.overrideExistingStyles();
    
    // Strategy 4: Force logo visibility
    this.forceLogoVisibility();
  }

  private applyDirectStyling(): void {
    // Header styling
    const header = document.querySelector('header, .header, [role="banner"]');
    if (header) {
      header.style.background = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
      header.style.borderBottom = '3px solid #ffd700';
      header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      console.log('🎨 Header styled directly');
    }

    // Navigation styling
    const nav = document.querySelector('nav, .nav, .navigation');
    if (nav) {
      nav.style.background = 'rgba(30, 60, 114, 0.95)';
      nav.style.backdropFilter = 'blur(10px)';
      console.log('🎨 Navigation styled directly');
    }

    // Footer styling
    const footer = document.querySelector('footer, .footer, [role="contentinfo"]');
    if (footer) {
      footer.style.background = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
      footer.style.borderTop = '3px solid #ffd700';
      console.log('🎨 Footer styled directly');
    }
  }

  private injectBloombergStyles(): void {
    const styleId = 'bloomberg-emergency-styles';
    
    // Remove existing style if present
    const existing = document.getElementById(styleId);
    if (existing) {
      existing.remove();
    }

    const styles = `
      /* Bloomberg Emergency Styles - Highest Specificity */
      html body header,
      html body .header,
      html body [role="banner"] {
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%) !important;
        border-bottom: 3px solid #ffd700 !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
      }

      html body nav,
      html body .nav,
      html body .navigation {
        background: rgba(30, 60, 114, 0.95) !important;
        backdrop-filter: blur(10px) !important;
      }

      html body footer,
      html body .footer,
      html body [role="contentinfo"] {
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%) !important;
        border-top: 3px solid #ffd700 !important;
      }

      /* Force logo visibility */
      .carrier-logo,
      .logo-ticker,
      [class*="logo"] {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      /* Bloomberg font override */
      * {
        font-family: 'Arial', 'Helvetica', sans-serif !important;
      }

      .bloomberg-text {
        font-weight: 600 !important;
        letter-spacing: -0.5px !important;
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    console.log('🎨 Emergency Bloomberg styles injected');
  }

  private overrideExistingStyles(): void {
    // Find all elements with background colors and override
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const computed = window.getComputedStyle(el);
      if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        // Override specific colors that might conflict
        if (computed.backgroundColor.includes('rgb(255, 255, 255)') || 
            computed.backgroundColor.includes('rgb(248, 249, 250)') ||
            computed.backgroundColor.includes('rgb(250, 250, 250)')) {
          (el as HTMLElement).style.backgroundColor = 'transparent';
        }
      }
    });
  }

  private forceLogoVisibility(): void {
    // Force all logos to be visible
    const logos = document.querySelectorAll('[class*="logo"], [src*="logo"], [alt*="logo"]');
    logos.forEach(logo => {
      (logo as HTMLElement).style.display = 'block !important';
      (logo as HTMLElement).style.visibility = 'visible !important';
      (logo as HTMLElement).style.opacity = '1 !important';
    });
    
    console.log('👁️ Forced logo visibility for', logos.length, 'elements');
  }

  private setupMutationObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Re-apply branding to new elements
          setTimeout(() => {
            this.applyBrandingStrategies();
            console.log('🔄 Branding re-applied to new DOM elements');
          }, 100);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('👀 Mutation observer activated');
  }

  private addVisibilityChecker(): void {
    // Check visibility every 2 seconds
    const visibilityCheck = setInterval(() => {
      if (this.isBrandingVisible()) {
        console.log('✅ Branding is visible and working!');
        clearInterval(visibilityCheck);
      } else {
        console.log('👀 Branding still not visible, continuing monitoring...');
        this.applyBrandingStrategies(); // Re-apply
      }
    }, 2000);

    // Stop checking after 30 seconds
    setTimeout(() => {
      clearInterval(visibilityCheck);
      console.log('⏰ Visibility monitoring stopped');
    }, 30000);
  }

  private isBrandingVisible(): boolean {
    // Check if Bloomberg styling is visible
    const header = document.querySelector('header, .header, [role="banner"]');
    if (header) {
      const bg = window.getComputedStyle(header).backgroundImage;
      return bg.includes('gradient') && bg.includes('1e3c72');
    }
    return false;
  }

  /**
   * Emergency reset - clears everything and starts fresh
   */
  emergencyReset(): void {
    console.log('🚨 EMERGENCY RESET - Clearing all caches and reloading...');
    
    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(c => { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Force reload with cache bypass
    window.location.reload();
  }
}

// Auto-initialize when module loads
export function initBloombergFix(): void {
  console.log('🚀 BloombergFix: Auto-initializing...');
  const fix = BloombergFix.getInstance();
  
  // Try multiple initialization strategies
  setTimeout(() => fix.forceApplyBranding(), 100);
  setTimeout(() => fix.forceApplyBranding(), 1000);
  setTimeout(() => fix.forceApplyBranding(), 5000);
  
  // Add global access for manual triggering
  (window as any).bloombergFix = fix;
  (window as any).emergencyReset = () => fix.emergencyReset();
  
  console.log('✅ BloombergFix ready! Use window.bloombergFix.forceApplyBranding() to manually trigger');
}

// Initialize immediately
initBloombergFix();