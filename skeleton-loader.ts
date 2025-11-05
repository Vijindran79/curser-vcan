import { state } from './state';

/**
 * Skeleton Loader System
 * Provides visual feedback during quote fetching across all services
 * Shows carrier logos, progress indicators, and estimated wait times
 */

export interface SkeletonConfig {
  service: 'fcl' | 'lcl' | 'air' | 'parcel' | 'rail' | 'inland';
  estimatedTime: number; // in seconds
  showCarrierLogos?: boolean;
  showProgressBar?: boolean;
}

const CARRIER_LOGOS = {
  fcl: [
    { name: 'Maersk', logo: '🚢', color: '#00243D' },
    { name: 'MSC', logo: '⚓', color: '#003087' },
    { name: 'CMA CGM', logo: '🌊', color: '#009FE3' },
    { name: 'Hapag-Lloyd', logo: '🛳️', color: '#EC6608' },
    { name: 'ONE', logo: '🚢', color: '#DA0063' }
  ],
  lcl: [
    { name: 'Maersk', logo: '📦', color: '#00243D' },
    { name: 'CMA CGM', logo: '📦', color: '#009FE3' },
    { name: 'Hapag-Lloyd', logo: '📦', color: '#EC6608' }
  ],
  air: [
    { name: 'Emirates SkyCargo', logo: '✈️', color: '#D71921' },
    { name: 'Qatar Airways Cargo', logo: '✈️', color: '#5C0632' },
    { name: 'Lufthansa Cargo', logo: '✈️', color: '#05164D' },
    { name: 'Singapore Airlines', logo: '✈️', color: '#003087' }
  ],
  parcel: [
    { name: 'DHL', logo: '📮', color: '#FFCC00' },
    { name: 'FedEx', logo: '📦', color: '#4D148C' },
    { name: 'UPS', logo: '📦', color: '#351C15' }
  ],
  rail: [
    { name: 'China Railway', logo: '🚂', color: '#C41E3A' },
    { name: 'Russian Railways', logo: '🚂', color: '#0033A0' },
    { name: 'DB Cargo', logo: '🚂', color: '#EC0016' }
  ],
  inland: [
    { name: 'XPO Logistics', logo: '🚛', color: '#0066B2' },
    { name: 'J.B. Hunt', logo: '🚛', color: '#005EB8' },
    { name: 'Schneider', logo: '🚛', color: '#FF6A13' }
  ]
};

const SERVICE_MESSAGES = {
  fcl: 'Fetching real ocean freight rates from global carriers...',
  lcl: 'Finding best LCL consolidation rates...',
  air: 'Searching air cargo rates from major airlines...',
  parcel: 'Comparing rates from DHL, FedEx, UPS...',
  rail: 'Checking rail freight options across Eurasia...',
  inland: 'Finding best road freight rates...'
};

let currentLoadingInterval: number | null = null;
let progressInterval: number | null = null;

export function showSkeletonLoader(config: SkeletonConfig): void {
  const container = document.getElementById('quote-results');
  if (!container) return;

  // Clear any existing loaders
  hideSkeletonLoader();

  const carriers = CARRIER_LOGOS[config.service] || CARRIER_LOGOS.fcl;
  const message = SERVICE_MESSAGES[config.service];

  const skeletonHTML = `
    <div id="skeleton-loader" class="skeleton-loader-container">
      <!-- Header Message -->
      <div class="skeleton-header">
        <div class="loading-spinner"></div>
        <h3 class="skeleton-message">${message}</h3>
        <p class="skeleton-time">Expected wait: <span id="skeleton-timer">${config.estimatedTime}</span> seconds</p>
      </div>

      ${config.showProgressBar !== false ? `
        <div class="skeleton-progress-container">
          <div class="skeleton-progress-bar">
            <div id="skeleton-progress" class="skeleton-progress-fill"></div>
          </div>
          <p class="skeleton-progress-text">
            <span id="skeleton-progress-percent">0</span>% complete
          </p>
        </div>
      ` : ''}

      ${config.showCarrierLogos !== false ? `
        <div class="skeleton-carriers">
          <p class="skeleton-carriers-label">Searching carriers:</p>
          <div class="skeleton-carriers-grid">
            ${carriers.map((carrier, index) => `
              <div class="skeleton-carrier-card pulse-${index % 3}" style="border-left-color: ${carrier.color}">
                <div class="skeleton-carrier-logo">${carrier.logo}</div>
                <div class="skeleton-carrier-name">${carrier.name}</div>
                <div class="skeleton-carrier-loading">
                  <div class="skeleton-line skeleton-line-1"></div>
                  <div class="skeleton-line skeleton-line-2"></div>
                  <div class="skeleton-line skeleton-line-3"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Quote Skeletons -->
      <div class="skeleton-quotes">
        ${[1, 2, 3].map(i => `
          <div class="skeleton-quote-card pulse-${i % 3}">
            <div class="skeleton-quote-header">
              <div class="skeleton-circle"></div>
              <div class="skeleton-text skeleton-text-carrier"></div>
            </div>
            <div class="skeleton-quote-body">
              <div class="skeleton-text skeleton-text-route"></div>
              <div class="skeleton-text skeleton-text-route-short"></div>
              <div class="skeleton-price-box">
                <div class="skeleton-price-pulse"></div>
              </div>
              <div class="skeleton-details">
                <div class="skeleton-text skeleton-text-detail"></div>
                <div class="skeleton-text skeleton-text-detail"></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="skeleton-tip">
        <span class="tip-icon">💡</span>
        <span class="tip-text">Pro tip: Rates may vary by season and demand. Book early for best prices!</span>
      </div>
    </div>
  `;

  container.innerHTML = skeletonHTML;

  // Start countdown timer
  let timeLeft = config.estimatedTime;
  const timerElement = document.getElementById('skeleton-timer');
  currentLoadingInterval = window.setInterval(() => {
    timeLeft--;
    if (timerElement && timeLeft > 0) {
      timerElement.textContent = timeLeft.toString();
    }
    if (timeLeft <= 0 && currentLoadingInterval) {
      clearInterval(currentLoadingInterval);
      if (timerElement) {
        timerElement.textContent = 'Almost there...';
      }
    }
  }, 1000);

  // Animate progress bar
  if (config.showProgressBar !== false) {
    let progress = 0;
    const progressFill = document.getElementById('skeleton-progress');
    const progressPercent = document.getElementById('skeleton-progress-percent');
    const increment = 100 / (config.estimatedTime * 2); // Update every 500ms

    progressInterval = window.setInterval(() => {
      progress += increment;
      if (progress > 95) progress = 95; // Cap at 95% until real data arrives
      
      if (progressFill) {
        progressFill.style.width = `${progress}%`;
      }
      if (progressPercent) {
        progressPercent.textContent = Math.round(progress).toString();
      }
    }, 500);
  }
}

export function hideSkeletonLoader(): void {
  if (currentLoadingInterval) {
    clearInterval(currentLoadingInterval);
    currentLoadingInterval = null;
  }
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }

  const skeleton = document.getElementById('skeleton-loader');
  if (skeleton) {
    // Smooth fade out
    skeleton.style.opacity = '0';
    setTimeout(() => {
      skeleton.remove();
    }, 300);
  }
}

export function updateSkeletonProgress(percent: number, message?: string): void {
  const progressFill = document.getElementById('skeleton-progress');
  const progressPercent = document.getElementById('skeleton-progress-percent');
  const messageElement = document.querySelector('.skeleton-message');

  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }
  if (progressPercent) {
    progressPercent.textContent = Math.round(percent).toString();
  }
  if (message && messageElement) {
    messageElement.textContent = message;
  }
}

// Add CSS styles
export function injectSkeletonStyles(): void {
  if (document.getElementById('skeleton-loader-styles')) return;

  const style = document.createElement('style');
  style.id = 'skeleton-loader-styles';
  style.textContent = `
    .skeleton-loader-container {
      padding: 2rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border-radius: 12px;
      margin: 1rem 0;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .skeleton-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #e0e0e0;
      border-top-color: #2196F3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .skeleton-message {
      font-size: 1.25rem;
      color: #333;
      margin: 0.5rem 0;
      font-weight: 600;
    }

    .skeleton-time {
      color: #666;
      font-size: 0.95rem;
      margin: 0.5rem 0;
    }

    #skeleton-timer {
      font-weight: 700;
      color: #2196F3;
    }

    .skeleton-progress-container {
      margin: 1.5rem 0;
      padding: 0 2rem;
    }

    .skeleton-progress-bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      position: relative;
    }

    .skeleton-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #2196F3, #1976D2);
      border-radius: 10px;
      transition: width 0.5s ease;
      position: relative;
      overflow: hidden;
    }

    .skeleton-progress-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .skeleton-progress-text {
      text-align: center;
      margin-top: 0.5rem;
      color: #666;
      font-size: 0.9rem;
    }

    #skeleton-progress-percent {
      font-weight: 700;
      color: #2196F3;
    }

    .skeleton-carriers {
      margin: 2rem 0;
    }

    .skeleton-carriers-label {
      font-weight: 600;
      color: #555;
      margin-bottom: 1rem;
      font-size: 1rem;
    }

    .skeleton-carriers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .skeleton-carrier-card {
      background: white;
      border-radius: 8px;
      padding: 1rem;
      border-left: 4px solid #2196F3;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: transform 0.2s;
    }

    .skeleton-carrier-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .skeleton-carrier-logo {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .skeleton-carrier-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 0.75rem;
      font-size: 0.95rem;
    }

    .skeleton-carrier-loading {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .skeleton-line {
      height: 8px;
      background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
      background-size: 200% 100%;
      border-radius: 4px;
      animation: loading 1.5s infinite;
    }

    .skeleton-line-1 { width: 80%; }
    .skeleton-line-2 { width: 60%; }
    .skeleton-line-3 { width: 90%; }

    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .pulse-0 { animation: pulse 2s ease-in-out infinite; }
    .pulse-1 { animation: pulse 2s ease-in-out 0.3s infinite; }
    .pulse-2 { animation: pulse 2s ease-in-out 0.6s infinite; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .skeleton-quotes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }

    .skeleton-quote-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .skeleton-quote-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .skeleton-circle {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
    }

    .skeleton-text {
      height: 12px;
      background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
      background-size: 200% 100%;
      border-radius: 4px;
      animation: loading 1.5s infinite;
    }

    .skeleton-text-carrier {
      width: 120px;
    }

    .skeleton-text-route {
      width: 100%;
      margin-bottom: 0.5rem;
    }

    .skeleton-text-route-short {
      width: 70%;
      margin-bottom: 1rem;
    }

    .skeleton-text-detail {
      width: 85%;
      margin-bottom: 0.5rem;
    }

    .skeleton-quote-body {
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }

    .skeleton-price-box {
      background: linear-gradient(135deg, #f5f5f5, #e8e8e8);
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1rem 0;
      text-align: center;
    }

    .skeleton-price-pulse {
      height: 32px;
      width: 150px;
      margin: 0 auto;
      background: linear-gradient(90deg, #d0d0d0 25%, #e0e0e0 50%, #d0d0d0 75%);
      background-size: 200% 100%;
      border-radius: 6px;
      animation: loading 1.5s infinite;
    }

    .skeleton-details {
      margin-top: 1rem;
    }

    .skeleton-tip {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: linear-gradient(135deg, #fff3cd, #fff8e1);
      border-left: 4px solid #FFC107;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin-top: 2rem;
    }

    .tip-icon {
      font-size: 1.5rem;
    }

    .tip-text {
      color: #856404;
      font-size: 0.95rem;
      line-height: 1.4;
    }

    @media (max-width: 768px) {
      .skeleton-loader-container {
        padding: 1rem;
      }

      .skeleton-carriers-grid {
        grid-template-columns: 1fr;
      }

      .skeleton-quotes {
        grid-template-columns: 1fr;
      }

      .skeleton-progress-container {
        padding: 0 1rem;
      }
    }
  `;

  document.head.appendChild(style);
}

// Initialize styles when module loads
if (typeof document !== 'undefined') {
  injectSkeletonStyles();
}
