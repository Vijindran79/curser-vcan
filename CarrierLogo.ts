/**
 * Universal CarrierLogo Component
 * Displays carrier logos with automatic fallback and error handling
 * Works with all shipping carriers, airlines, and e-commerce platforms
 */

import { getLogoUrl, hasLogo } from './logoMap';

/**
 * Props for the CarrierLogo component
 */
export interface CarrierLogoProps {
  carrier: string;        // "CMA CGM", "Maersk", "Amazon", etc.
  size?: number;          // Size in pixels (default: 32)
  className?: string;     // Additional CSS classes
  alt?: string;           // Alt text (auto-generated if not provided)
  fallbackIcon?: string;  // FontAwesome icon class for fallback (default: 'fa-solid fa-box')
  showText?: boolean;     // Show carrier name alongside logo
  textSize?: string;      // CSS font-size for text (default: '0.875rem')
  loading?: 'lazy' | 'eager'; // Loading strategy
  priority?: number;      // Loading priority for above-fold images
  style?: string;         // Additional inline styles
}

/**
 * Universal CarrierLogo Component
 * Automatically finds and displays the correct logo for any carrier/platform
 */
export class CarrierLogo {
  private element: HTMLElement;
  private props: CarrierLogoProps;

  constructor(props: CarrierLogoProps) {
    this.props = {
      size: 32,
      className: '',
      alt: '',
      fallbackIcon: 'fa-solid fa-box',
      showText: false,
      textSize: '0.875rem',
      loading: 'lazy',
      priority: 0,
      style: '',
      ...props
    };
    this.element = this.createElement();
  }

  /**
   * Create the logo element with all features
   */
  private createElement(): HTMLElement {
    const { carrier, size, className, alt, fallbackIcon, showText, textSize, loading, priority, style } = this.props;
    
    const container = document.createElement('div');
    container.className = `carrier-logo-container inline-flex items-center gap-2 ${className}`;
    if (style) container.style.cssText = style;

    // Create logo image element
    const logoImg = document.createElement('img');
    const logoUrl = getLogoUrl(carrier);
    
    logoImg.src = logoUrl;
    logoImg.alt = alt || `${carrier} logo`;
    logoImg.width = size;
    logoImg.height = size;
    logoImg.className = 'carrier-logo inline-block object-contain';
    logoImg.loading = loading;
    
    if (priority > 0) {
      logoImg.setAttribute('fetchpriority', priority === 1 ? 'high' : 'low');
    }

    // Error handling - if logo fails to load, show fallback
    logoImg.onerror = (e) => {
      console.warn(`Logo failed to load for ${carrier}: ${logoUrl}`);
      
      // Create fallback icon
      const fallbackIcon = document.createElement('i');
      fallbackIcon.className = `${this.props.fallbackIcon} text-gray-400`;
      fallbackIcon.style.fontSize = `${size * 0.7}px`;
      fallbackIcon.setAttribute('aria-label', `${carrier} (no logo available)`);
      
      // Replace image with icon
      container.innerHTML = '';
      container.appendChild(fallbackIcon);
      
      // Add text if requested
      if (showText) {
        container.appendChild(this.createTextElement());
      }
    };

    // Success - logo loaded properly
    logoImg.onload = () => {
      console.log(`Logo loaded successfully for ${carrier}: ${logoUrl}`);
    };

    // Build the component
    container.innerHTML = '';
    container.appendChild(logoImg);
    
    if (showText) {
      container.appendChild(this.createTextElement());
    }

    // Add accessibility attributes
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', `${carrier} logo`);
    
    // Add tooltip with carrier name
    container.title = carrier;

    return container;
  }

  /**
   * Create text element for carrier name
   */
  private createTextElement(): HTMLElement {
    const textSpan = document.createElement('span');
    textSpan.textContent = this.props.carrier;
    textSpan.style.cssText = `
      font-size: ${this.props.textSize};
      font-weight: 500;
      color: var(--text-color, #374151);
      white-space: nowrap;
    `;
    return textSpan;
  }

  /**
   * Get the DOM element
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Update carrier name and refresh logo
   */
  updateCarrier(carrier: string): void {
    this.props.carrier = carrier;
    const newElement = this.createElement();
    
    // Replace the element while preserving position
    this.element.parentNode?.replaceChild(newElement, this.element);
    this.element = newElement;
  }

  /**
   * Update size
   */
  updateSize(size: number): void {
    this.props.size = size;
    const logoImg = this.element.querySelector('img') as HTMLImageElement;
    if (logoImg) {
      logoImg.width = size;
      logoImg.height = size;
    }
    
    const fallbackIcon = this.element.querySelector('i') as HTMLElement;
    if (fallbackIcon) {
      fallbackIcon.style.fontSize = `${size * 0.7}px`;
    }
  }

  /**
   * Check if carrier has a logo available
   */
  hasAvailableLogo(): boolean {
    return hasLogo(this.props.carrier);
  }
}

/**
 * Factory function for quick logo creation
 */
export function createCarrierLogo(carrier: string, options: Partial<CarrierLogoProps> = {}): HTMLElement {
  const logo = new CarrierLogo({ carrier, ...options });
  return logo.getElement();
}

/**
 * Utility function to get logo URL for any carrier
 */
export function getCarrierLogoUrl(carrier: string): string {
  return getLogoUrl(carrier);
}

/**
 * Utility function to check if carrier has logo
 */
export function carrierHasLogo(carrier: string): boolean {
  return hasLogo(carrier);
}

/**
 * Batch create logos for multiple carriers
 */
export function createMultipleLogos(carriers: string[], options: Partial<CarrierLogoProps> = {}): HTMLElement[] {
  return carriers.map(carrier => createCarrierLogo(carrier, options));
}

/**
 * Create logo with custom styling for specific use cases
 */
export function createStyledLogo(carrier: string, style: 'small' | 'medium' | 'large' | 'ticker' = 'medium'): HTMLElement {
  const styles = {
    small: { size: 24, textSize: '0.75rem', className: 'carrier-logo-small' },
    medium: { size: 32, textSize: '0.875rem', className: 'carrier-logo-medium' },
    large: { size: 48, textSize: '1rem', className: 'carrier-logo-large' },
    ticker: { size: 28, textSize: '0.75rem', className: 'carrier-logo-ticker' }
  };

  return createCarrierLogo(carrier, {
    ...styles[style],
    showText: style !== 'ticker',
    loading: style === 'ticker' ? 'eager' : 'lazy'
  });
}