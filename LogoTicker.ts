/**
 * Bloomberg-Style Logo Ticker Component
 * Creates an infinite scrolling banner of carrier logos
 * Perfect for landing pages, dashboards, and promotional areas
 */

import { createStyledLogo } from './CarrierLogo';

/**
 * Props for the LogoTicker component
 */
export interface LogoTickerProps {
  carriers: string[];                    // Array of carrier names
  speed?: number;                        // Animation speed in seconds (default: 25)
  direction?: 'left' | 'right';         // Scroll direction (default: 'left')
  height?: string;                       // Height of ticker (default: '60px')
  backgroundColor?: string;              // Background color (default: 'white')
  className?: string;                    // Additional CSS classes
  showText?: boolean;                    // Show carrier names (default: true)
  size?: 'small' | 'medium' | 'large';  // Logo size (default: 'medium')
  pauseOnHover?: boolean;                // Pause animation on hover (default: true)
  repeat?: number;                       // How many times to repeat carriers (default: 2)
  spacing?: string;                      // Spacing between logos (default: '32px')
}

/**
 * Bloomberg-Style Logo Ticker Component
 */
export class LogoTicker {
  private element: HTMLElement;
  private props: LogoTickerProps;
  private animationId: number | null = null;
  private isPaused = false;

  constructor(props: LogoTickerProps) {
    this.props = {
      carriers: [],
      speed: 25,
      direction: 'left',
      height: '60px',
      backgroundColor: 'white',
      className: '',
      showText: true,
      size: 'medium',
      pauseOnHover: true,
      repeat: 2,
      spacing: '32px',
      ...props
    };
    this.element = this.createElement();
  }

  /**
   * Create the ticker element with CSS animation
   */
  private createElement(): HTMLElement {
    const { 
      carriers, speed, direction, height, backgroundColor, className, 
      showText, size, pauseOnHover, repeat, spacing 
    } = this.props;

    const container = document.createElement('div');
    container.className = `logo-ticker w-full overflow-hidden whitespace-nowrap ${className}`;
    container.style.cssText = `
      height: ${height};
      background: ${backgroundColor};
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    `;

    // Create the scrolling content
    const tickerContent = document.createElement('div');
    tickerContent.className = 'ticker-content inline-block';
    
    // Duplicate carriers to create infinite scroll effect
    const repeatedCarriers = [];
    for (let i = 0; i < repeat; i++) {
      repeatedCarriers.push(...carriers);
    }

    // Create logo elements
    repeatedCarriers.forEach((carrier, index) => {
      const logoElement = createStyledLogo(carrier, size);
      logoElement.style.cssText = `
        margin: 0 ${spacing};
        display: inline-flex;
        align-items: center;
        gap: 8px;
      `;
      tickerContent.appendChild(logoElement);
    });

    // Add CSS animation
    const animationName = 'ticker-scroll';
    const keyframes = `
      @keyframes ${animationName} {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `;

    tickerContent.style.cssText = `
      animation: ${animationName} ${speed}s linear infinite;
      animation-direction: ${direction === 'right' ? 'reverse' : 'normal'};
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
    `;

    // Add hover pause functionality
    if (pauseOnHover) {
      tickerContent.addEventListener('mouseenter', () => {
        this.pause();
      });
      tickerContent.addEventListener('mouseleave', () => {
        this.resume();
      });
    }

    // Add the keyframes to document if not already present
    this.addKeyframes(keyframes);

    // Build the component
    container.appendChild(tickerContent);

    return container;
  }

  /**
   * Add CSS keyframes to document head
   */
  private addKeyframes(keyframes: string): void {
    if (!document.querySelector('#ticker-keyframes')) {
      const style = document.createElement('style');
      style.id = 'ticker-keyframes';
      style.textContent = keyframes;
      document.head.appendChild(style);
    }
  }

  /**
   * Get the DOM element
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Pause the animation
   */
  pause(): void {
    this.isPaused = true;
    const tickerContent = this.element.querySelector('.ticker-content') as HTMLElement;
    if (tickerContent) {
      tickerContent.style.animationPlayState = 'paused';
    }
  }

  /**
   * Resume the animation
   */
  resume(): void {
    this.isPaused = false;
    const tickerContent = this.element.querySelector('.ticker-content') as HTMLElement;
    if (tickerContent) {
      tickerContent.style.animationPlayState = 'running';
    }
  }

  /**
   * Toggle pause/resume
   */
  toggle(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Update carriers list
   */
  updateCarriers(carriers: string[]): void {
    this.props.carriers = carriers;
    const newElement = this.createElement();
    this.element.parentNode?.replaceChild(newElement, this.element);
    this.element = newElement;
  }

  /**
   * Update animation speed
   */
  updateSpeed(speed: number): void {
    this.props.speed = speed;
    const tickerContent = this.element.querySelector('.ticker-content') as HTMLElement;
    if (tickerContent) {
      tickerContent.style.animationDuration = `${speed}s`;
    }
  }

  /**
   * Destroy the component and clean up
   */
  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.element.remove();
  }
}

/**
 * Factory function for quick ticker creation
 */
export function createLogoTicker(carriers: string[], options: Partial<LogoTickerProps> = {}): HTMLElement {
  const ticker = new LogoTicker({ carriers, ...options });
  return ticker.getElement();
}

/**
 * Predefined carrier groups for common use cases
 */
export const carrierGroups = {
  // Major sea carriers
  majorSeaCarriers: [
    'MAERSK', 'CMA CGM', 'MSC', 'HAPAG-LLOYD', 'EVERGREEN', 
    'ONE', 'COSCO', 'CSAV', 'PIL', 'YANG MING'
  ],

  // Major parcel carriers
  majorParcelCarriers: [
    'DHL', 'FEDEX', 'UPS', 'TNT', 'ARAMEX', 'DPD', 
    'EVRI', 'HERMES', 'GLS', 'USPS'
  ],

  // Airlines and air cargo
  airlines: [
    'SINGAPORE AIRLINES', 'LUFTHANSA CARGO', 'CMA CGM AIR CARGO', 
    'MSC AIR CARGO', 'FEDEX EXPRESS', 'EMIRATES', 'QATAR AIRWAYS'
  ],

  // E-commerce platforms
  ecommercePlatforms: [
    'AMAZON', 'EBAY', 'SHOPIFY', 'ETSY', 'WALMART', 
    'ALIBABA', 'ALIEXPRESS', 'SHOPEE', 'LAZADA', 'TIKTOK SHOP'
  ],

  // Fashion brands
  fashionBrands: [
    'H&M', 'ZARA', 'UNIQLO', 'ADIDAS', 'NIKE', 
    'GUCCI', 'PRADA', 'LOUIS VUITTON', 'CHANEL', 'HERMÈS'
  ],

  // All major carriers combined
  allMajor: [
    'MAERSK', 'CMA CGM', 'MSC', 'DHL', 'FEDEX', 'UPS', 
    'SINGAPORE AIRLINES', 'AMAZON', 'EBAY', 'SHOPIFY'
  ]
};

/**
 * Create ticker with predefined carrier group
 */
export function createGroupTicker(
  group: keyof typeof carrierGroups, 
  options: Partial<LogoTickerProps> = {}
): HTMLElement {
  return createLogoTicker(carrierGroups[group], options);
}

/**
 * Create ticker with random carrier selection
 */
export function createRandomTicker(
  totalCarriers: number = 20, 
  includeGroups: (keyof typeof carrierGroups)[] = ['allMajor'],
  options: Partial<LogoTickerProps> = {}
): HTMLElement {
  // Combine carriers from selected groups
  const allCarriers = includeGroups.flatMap(group => carrierGroups[group]);
  
  // Remove duplicates and shuffle
  const uniqueCarriers = [...new Set(allCarriers)];
  const selectedCarriers = uniqueCarriers
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(totalCarriers, uniqueCarriers.length));

  return createLogoTicker(selectedCarriers, options);
}

/**
 * Create responsive ticker that adapts to screen size
 */
export function createResponsiveTicker(options: Partial<LogoTickerProps> = {}): HTMLElement {
  const isMobile = window.innerWidth < 768;
  
  const responsiveOptions: Partial<LogoTickerProps> = {
    size: isMobile ? 'small' : 'medium',
    showText: !isMobile,
    height: isMobile ? '50px' : '60px',
    spacing: isMobile ? '16px' : '32px',
    speed: isMobile ? 20 : 25,
    ...options
  };

  // Use fewer carriers on mobile
  const carriers = isMobile ? carrierGroups.allMajor.slice(0, 8) : carrierGroups.allMajor;
  
  return createLogoTicker(carriers, responsiveOptions);
}