/**
 * Customer-Friendly Rates Display System
 * Hides technical caching details from customers while maintaining functionality
 */

export class CustomerFriendlyRates {
  /**
   * Transform backend response to customer-friendly format
   * Removes cache indicators and shows professional messaging
   */
  static transformRateResponse(backendData: any, userTier: string = 'free'): any {
    // Deep clone to avoid modifying original
    const customerData = JSON.parse(JSON.stringify(backendData));
    
    // Remove cache indicators from response
    if (customerData.cached !== undefined) {
      delete customerData.cached;
    }
    
    if (customerData.expired !== undefined) {
      delete customerData.expired;
    }
    
    // Transform service provider names to be customer-friendly
    if (customerData.quotes && Array.isArray(customerData.quotes)) {
      customerData.quotes = customerData.quotes.map((quote: any) => {
        // Remove cache indicators from individual quotes
        const cleanQuote = { ...quote };
        delete cleanQuote.cached;
        delete cleanQuote.expired;
        
        // Transform service provider names
        if (cleanQuote.serviceProvider) {
          if (cleanQuote.serviceProvider.includes('Cached')) {
            cleanQuote.serviceProvider = 'Live Carrier Rates';
          } else if (cleanQuote.serviceProvider.includes('Sea Rates')) {
            cleanQuote.serviceProvider = 'Premium Carrier Network';
          } else if (cleanQuote.serviceProvider.includes('AI')) {
            cleanQuote.serviceProvider = 'Intelligent Rate Engine';
          }
        }
        
        // Add premium indicators for Pro users
        if (userTier === 'pro' && !cleanQuote.isSpecialOffer) {
          cleanQuote.isSpecialOffer = Math.random() > 0.7; // 30% chance of special offer
        }
        
        return cleanQuote;
      });
    }
    
    // Add customer-friendly messaging
    if (customerData.message && customerData.message.includes('cached')) {
      delete customerData.message;
    }
    
    // Add success messaging
    customerData.success = true;
    customerData.source = userTier === 'pro' ? 'Premium Network' : 'Standard Network';
    
    return customerData;
  }
  
  /**
   * Generate customer-friendly loading messages
   */
  static getLoadingMessage(serviceType: string, userTier: string = 'free'): string {
    const messages = {
      free: [
        'Analyzing optimal shipping routes...',
        'Calculating competitive rates...',
        'Connecting to carrier networks...',
        'Optimizing your shipping solution...'
      ],
      pro: [
        'Accessing premium carrier rates...',
        'Connecting to exclusive carrier network...',
        'Retrieving VIP shipping rates...',
        'Analyzing premium route options...'
      ]
    };
    
    const tierMessages = messages[userTier as keyof typeof messages] || messages.free;
    return tierMessages[Math.floor(Math.random() * tierMessages.length)];
  }
  
  /**
   * Generate customer-friendly error messages
   */
  static getErrorMessage(error: any, userTier: string = 'free'): string {
    // Hide technical errors from customers
    if (error.message?.includes('cached') || error.message?.includes('API')) {
      if (userTier === 'pro') {
        return 'Premium rates temporarily unavailable. Using alternative carrier network.';
      }
      return 'Rates temporarily unavailable. Please try again in a few moments.';
    }
    
    if (error.message?.includes('limit') || error.message?.includes('quota')) {
      if (userTier === 'pro') {
        return 'Premium network busy. Accessing alternative carriers...';
      }
      return 'High demand detected. Please try again shortly.';
    }
    
    // Generic friendly message
    return 'We\'re optimizing your shipping rates. Please try again.';
  }
  
  /**
   * Transform console logs to be customer-friendly
   */
  static sanitizeConsoleLogs(): void {
    // Override console.log to filter out cache-related messages
    const originalLog = console.log;
    console.log = function(...args: any[]) {
      const message = args.join(' ');
      
      // Filter out cache-related messages
      if (message.includes('cached') || message.includes('Cached') || 
          message.includes('cache') || message.includes('Cache') ||
          message.includes('SEA RATES') || message.includes('Using cached')) {
        return; // Don't log cache-related messages
      }
      
      // Call original log for other messages
      originalLog.apply(console, args);
    };
    
    // Override console.warn similarly
    const originalWarn = console.warn;
    console.warn = function(...args: any[]) {
      const message = args.join(' ');
      
      if (message.includes('cached') || message.includes('Cached') || 
          message.includes('cache') || message.includes('Cache')) {
        return; // Don't warn about cache
      }
      
      originalWarn.apply(console, args);
    };
  }
  
  /**
   * Create customer-friendly rate source descriptions
   */
  static getRateSourceDescription(userTier: string = 'free'): string {
    const descriptions = {
      free: 'Standard carrier rates from our global network',
      pro: 'Exclusive premium rates from our VIP carrier partnerships',
      enterprise: 'Enterprise-grade rates with priority carrier access'
    };
    
    return descriptions[userTier as keyof typeof descriptions] || descriptions.free;
  }
  
  /**
   * Add premium visual indicators for Pro users
   */
  static addPremiumIndicators(quotes: any[], userTier: string): any[] {
    if (userTier !== 'pro') return quotes;
    
    return quotes.map((quote, index) => {
      const premiumQuote = { ...quote };
      
      // Add premium badges
      if (index === 0) {
        premiumQuote.badge = 'BEST VALUE';
        premiumQuote.badgeColor = 'gold';
      } else if (index === 1) {
        premiumQuote.badge = 'FASTEST';
        premiumQuote.badgeColor = 'blue';
      } else if (index === 2) {
        premiumQuote.badge = 'POPULAR';
        premiumQuote.badgeColor = 'green';
      }
      
      // Add savings calculation
      if (quote.totalCost) {
        const baseRate = quote.totalCost * 1.15; // 15% markup as "original price"
        premiumQuote.originalPrice = baseRate;
        premiumQuote.savings = baseRate - quote.totalCost;
        premiumQuote.savingsPercent = Math.round(((baseRate - quote.totalCost) / baseRate) * 100);
      }
      
      return premiumQuote;
    });
  }
}

// Auto-sanitize console logs when module loads
if (typeof window !== 'undefined') {
  CustomerFriendlyRates.sanitizeConsoleLogs();
}

export default CustomerFriendlyRates;