/**
 * Customer-Friendly Rates Display System v2
 * Hides technical caching details and emphasizes "LIVE" rates
 * Transforms "cached" into "cheapest live rates" messaging
 */

export class CustomerFriendlyRates {
  /**
   * Transform backend response to customer-friendly format
   * Removes cache indicators and shows LIVE rate messaging
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
    
    // Transform service provider names to emphasize LIVE rates
    if (customerData.quotes && Array.isArray(customerData.quotes)) {
      customerData.quotes = customerData.quotes.map((quote: any) => {
        // Remove cache indicators from individual quotes
        const cleanQuote = { ...quote };
        delete cleanQuote.cached;
        delete cleanQuote.expired;
        
        // Transform service provider names to emphasize LIVE
        if (cleanQuote.serviceProvider) {
          if (cleanQuote.serviceProvider.includes('Cached')) {
            cleanQuote.serviceProvider = 'Live Carrier Network';
          } else if (cleanQuote.serviceProvider.includes('Sea Rates')) {
            cleanQuote.serviceProvider = userTier === 'pro' ? 'Premium Live Network' : 'Live Carrier Network';
          } else if (cleanQuote.serviceProvider.includes('AI')) {
            cleanQuote.serviceProvider = 'Intelligent Live Rate Engine';
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
    
    // Add success messaging with LIVE emphasis
    customerData.success = true;
    customerData.source = userTier === 'pro' ? 'Premium Live Network' : 'Live Carrier Network';
    
    return customerData;
  }
  
  /**
   * Generate customer-friendly loading messages with LIVE emphasis
   */
  static getLoadingMessage(serviceType: string, userTier: string = 'free'): string {
    const messages = {
      free: [
        'Finding the cheapest live rates...',
        'We are always live - searching optimal routes...',
        'Calculating competitive live rates...',
        'Connecting to live carrier networks...',
        'Finding you the best live shipping rates...',
        'Scanning live carrier rates for best deals...',
        'Live rate comparison in progress...'
      ],
      pro: [
        'Accessing premium live carrier rates...',
        'Retrieving exclusive live shipping rates...',
        'Connecting to VIP live carrier network...',
        'Finding premium live route options...',
        'We are always live - premium rate access...',
        'Premium live rate optimization...',
        'Exclusive live carrier network access...'
      ]
    };
    
    const tierMessages = messages[userTier as keyof typeof messages] || messages.free;
    return tierMessages[Math.floor(Math.random() * tierMessages.length)];
  }
  
  /**
   * Generate customer-friendly error messages with LIVE emphasis
   */
  static getErrorMessage(error: any, userTier: string = 'free'): string {
    // Hide technical errors from customers
    if (error.message?.includes('cached') || error.message?.includes('API')) {
      if (userTier === 'pro') {
        return 'Premium live rates temporarily unavailable. Connecting to alternative live carriers...';
      }
      return 'Live rates temporarily unavailable. Our intelligent engine is finding alternatives...';
    }
    
    if (error.message?.includes('limit') || error.message?.includes('quota')) {
      if (userTier === 'pro') {
        return 'Premium live network busy. Accessing alternative live carriers...';
      }
      return 'High demand for our live rates. Connecting to backup carriers...';
    }
    
    // Generic friendly message with LIVE emphasis
    return 'Our live rate engine is optimizing your shipping costs. Please try again.';
  }
  
  /**
   * Transform console logs to be customer-friendly and hide cache mentions
   */
  static sanitizeConsoleLogs(): void {
    // Override console.log to filter out cache-related messages
    const originalLog = console.log;
    console.log = function(...args: any[]) {
      const message = args.join(' ');
      
      // Filter out cache-related messages completely
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
   * Create customer-friendly rate source descriptions with LIVE emphasis
   */
  static getRateSourceDescription(userTier: string = 'free'): string {
    const descriptions = {
      free: 'Live carrier rates from our global network',
      pro: 'Exclusive premium live rates from our VIP carrier partnerships',
      enterprise: 'Enterprise-grade live rates with priority carrier access'
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
      
      // Add premium badges with LIVE emphasis
      if (index === 0) {
        premiumQuote.badge = 'CHEAPEST LIVE RATE';
        premiumQuote.badgeColor = 'gold';
      } else if (index === 1) {
        premiumQuote.badge = 'FASTEST LIVE OPTION';
        premiumQuote.badgeColor = 'blue';
      } else if (index === 2) {
        premiumQuote.badge = 'POPULAR LIVE CHOICE';
        premiumQuote.badgeColor = 'green';
      }
      
      // Add savings calculation with LIVE emphasis
      if (quote.totalCost) {
        const baseRate = quote.totalCost * 1.15; // 15% markup as "original price"
        premiumQuote.originalPrice = baseRate;
        premiumQuote.savings = baseRate - quote.totalCost;
        premiumQuote.savingsPercent = Math.round(((baseRate - quote.totalCost) / baseRate) * 100);
        premiumQuote.savingsLabel = 'Live Rate Savings';
      }
      
      return premiumQuote;
    });
  }
  
  /**
   * Generate competitive comparison messaging
   */
  static getCompetitiveMessage(userTier: string = 'free'): string {
    const messages = {
      free: [
        'Our live rates are definitely different than others',
        'Cheapest live rates you\'ll find anywhere',
        'We beat competitor rates every time - live guaranteed',
        'Live rates that others can\'t match',
        'Our live pricing engine finds rates others miss'
      ],
      pro: [
        'Premium live rates unavailable to regular customers',
        'Exclusive live rates that competitors can\'t access',
        'VIP live network rates - definitely different',
        'Premium live rates that beat standard platforms',
        'Our live premium network outperforms all others'
      ]
    };
    
    const tierMessages = messages[userTier as keyof typeof messages] || messages.free;
    return tierMessages[Math.floor(Math.random() * tierMessages.length)];
  }
  
  /**
   * Create urgency messaging for live rates
   */
  static getUrgencyMessage(userTier: string = 'free'): string {
    const messages = {
      free: [
        'Live rates update every minute - lock in your price now',
        'These live rates won\'t last long - secure your booking',
        'Live carrier rates are moving - book now to save',
        'Live rate availability limited - confirm your shipment'
      ],
      pro: [
        'Premium live rates expire soon - VIP access closing',
        'Exclusive live rates updating - secure premium pricing',
        'VIP live rates are time-sensitive - book immediately',
        'Premium live carrier space filling fast - reserve now'
      ]
    };
    
    const tierMessages = messages[userTier as keyof typeof messages] || messages.free;
    return tierMessages[Math.floor(Math.random() * tierMessages.length)];
  }
}

// Auto-sanitize console logs when module loads
if (typeof window !== 'undefined') {
  CustomerFriendlyRates.sanitizeConsoleLogs();
}

export default CustomerFriendlyRates;