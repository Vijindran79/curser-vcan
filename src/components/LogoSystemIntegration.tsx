// Logo System Integration Component
// Comprehensive integration of all branding components with Bloomberg-level professionalism

import { useState, useEffect } from 'react';
import { BloombergSchedules } from './BloombergSchedules';
import { EcommercePageBranding } from './EcommercePageBranding';
import { PaymentPageBranding } from './PaymentPageBranding';
import { carrierLogos, getCarrierLogo, getProfessionalLogoStyle } from '../data/carrierLogos';

interface LogoSystemIntegrationProps {
  mode: 'schedules' | 'ecommerce' | 'payment' | 'all';
  showHeader?: boolean;
  compact?: boolean;
  theme?: 'bloomberg' | 'professional' | 'minimal';
}

export function LogoSystemIntegration({ 
  mode = 'all', 
  showHeader = true, 
  compact = false,
  theme = 'bloomberg'
}: LogoSystemIntegrationProps) {
  const [selectedCarrier, setSelectedCarrier] = useState<string>('MAERSK');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleProductSelect = (product: any) => {
    console.log('Product selected:', product);
    // Handle product selection logic
  };

  const handlePaymentComplete = (paymentData: any) => {
    console.log('Payment completed:', paymentData);
    // Handle payment completion logic
  };

  const getThemeStyles = () => {
    switch (theme) {
      case 'bloomberg':
        return {
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          border: '2px solid #333',
          primaryColor: '#00ff41',
          secondaryColor: '#00a0df',
          accentColor: '#ff6600',
          textColor: '#ffffff',
          mutedColor: '#888888'
        };
      case 'professional':
        return {
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          border: '2px solid #dee2e6',
          primaryColor: '#0056b3',
          secondaryColor: '#6c757d',
          accentColor: '#28a745',
          textColor: '#212529',
          mutedColor: '#6c757d'
        };
      case 'minimal':
        return {
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          primaryColor: '#000000',
          secondaryColor: '#666666',
          accentColor: '#ff0000',
          textColor: '#333333',
          mutedColor: '#999999'
        };
      default:
        return getThemeStyles();
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <div className="logo-system-integration">
      <style jsx>{`
        .logo-system-integration {
          background: ${themeStyles.background};
          border: ${themeStyles.border};
          border-radius: 16px;
          padding: 30px;
          margin: 20px 0;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
          font-family: 'Arial', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .integration-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid ${themeStyles.mutedColor}40;
        }

        .integration-title {
          color: ${themeStyles.primaryColor};
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${themeStyles.primaryColor};
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: ${themeStyles.primaryColor};
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .current-time {
          color: ${themeStyles.mutedColor};
          font-size: 12px;
          font-family: 'Courier New', monospace;
        }

        .carrier-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }

        .carrier-option {
          background: ${themeStyles.mutedColor}20;
          border: 2px solid ${themeStyles.mutedColor}40;
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: ${themeStyles.textColor};
        }

        .carrier-option:hover {
          border-color: ${themeStyles.primaryColor};
          transform: translateY(-1px);
        }

        .carrier-option.active {
          border-color: ${themeStyles.primaryColor};
          background: ${themeStyles.primaryColor}20;
          color: ${themeStyles.primaryColor};
        }

        .component-section {
          margin-bottom: 40px;
          padding: 20px;
          background: ${themeStyles.mutedColor}10;
          border-radius: 12px;
          border: 1px solid ${themeStyles.mutedColor}30;
        }

        .section-title {
          color: ${themeStyles.secondaryColor};
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-icon {
          font-size: 20px;
        }

        .logo-showcase {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .logo-card {
          background: ${themeStyles.mutedColor}15;
          border: 1px solid ${themeStyles.mutedColor}40;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .logo-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          border-color: ${themeStyles.primaryColor};
        }

        .logo-display {
          width: 100%;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          border-radius: 4px;
          overflow: hidden;
        }

        .logo-name {
          color: ${themeStyles.textColor};
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .logo-details {
          color: ${themeStyles.mutedColor};
          font-size: 10px;
          line-height: 1.3;
        }

        .integration-footer {
          text-align: center;
          color: ${themeStyles.mutedColor};
          font-size: 12px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid ${themeStyles.mutedColor}40;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .trust-indicators {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
          flex-wrap: wrap;
        }

        .trust-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
          color: ${themeStyles.mutedColor};
          font-size: 11px;
          font-weight: bold;
        }

        .bloomberg-ticker {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, ${themeStyles.primaryColor} 0%, transparent 100%);
          animation: bloomberg-ticker 6s linear infinite;
        }

        @keyframes bloomberg-ticker {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @media (max-width: 768px) {
          .logo-system-integration {
            padding: 20px;
            margin: 10px 0;
          }
          
          .integration-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }
          
          .carrier-selector {
            justify-content: center;
          }
          
          .logo-showcase {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }
        }
      `}</style>

      <div className="bloomberg-ticker"></div>

      {showHeader && (
        <div className="integration-header">
          <div className="integration-title">
            🏆 VCANSHIP LOGO SYSTEM
          </div>
          <div className="live-indicator">
            <div className="live-dot"></div>
            LIVE SYSTEM
          </div>
          <div className="current-time">
            {currentTime.toLocaleTimeString()}
          </div>
        </div>
      )}

      <div className="carrier-selector">
        {carrierLogos.slice(0, 8).map((carrier) => (
          <div
            key={carrier.code}
            className={`carrier-option ${selectedCarrier === carrier.code ? 'active' : ''}`}
            onClick={() => setSelectedCarrier(carrier.code)}
            style={{
              backgroundColor: selectedCarrier === carrier.code ? carrier.color : undefined,
              color: selectedCarrier === carrier.code ? carrier.secondaryColor : undefined
            }}
          >
            {carrier.name}
          </div>
        ))}
      </div>

      {(mode === 'schedules' || mode === 'all') && (
        <div className="component-section">
          <div className="section-title">
            <span className="section-icon">🚢</span>
            Bloomberg Effect Schedules
          </div>
          <BloombergSchedules 
            refreshInterval={30000}
            showHeader={true}
            compact={compact}
          />
        </div>
      )}

      {(mode === 'ecommerce' || mode === 'all') && (
        <div className="component-section">
          <div className="section-title">
            <span className="section-icon">🛒</span>
            Professional E-commerce Integration
          </div>
          <EcommercePageBranding 
            onProductSelect={handleProductSelect}
          />
        </div>
      )}

      {(mode === 'payment' || mode === 'all') && (
        <div className="component-section">
          <div className="section-title">
            <span className="section-icon">💳</span>
            Premium Payment Page Branding
          </div>
          <PaymentPageBranding
            totalAmount={2999.99}
            currency="USD"
            serviceType="premium"
            onPaymentComplete={() => console.log('Payment completed')}
          />
        </div>
      )}

      <div className="component-section">
        <div className="section-title">
          <span className="section-icon">🎨</span>
          Professional Carrier Logo Showcase
        </div>
        <div className="logo-showcase">
          {carrierLogos.slice(0, 6).map((carrier) => (
            <div key={carrier.code} className="logo-card">
              <div 
                className="logo-display" 
                style={{ backgroundColor: carrier.color }}
                dangerouslySetInnerHTML={{ __html: carrier.svg }}
              />
              <div className="logo-name">{carrier.name}</div>
              <div className="logo-details">
                {carrier.headquarters}<br/>
                Fleet: {carrier.fleetSize} vessels<br/>
                Founded: {carrier.founded}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="trust-indicators">
        <div className="trust-indicator">
          🔒 SSL Secured
        </div>
        <div className="trust-indicator">
          🚢 Carrier Verified
        </div>
        <div className="trust-indicator">
          ⭐ Professional Grade
        </div>
        <div className="trust-indicator">
          🌍 Worldwide Coverage
        </div>
        <div className="trust-indicator">
          ⚡ Real-time Updates
        </div>
      </div>

      <div className="integration-footer">
        🏆 WORLD-CLASS LOGISTICS • BLOOMBERG-LEVEL PROFESSIONALISM • TRUSTED BY THOUSANDS
      </div>
    </div>
  );
}

// Export individual components for standalone use
export { BloombergSchedules } from './BloombergSchedules';
export { EcommercePageBranding } from './EcommercePageBranding';
export { PaymentPageBranding } from './PaymentPageBranding';
export { carrierLogos, getCarrierLogo, getProfessionalLogoStyle } from '../data/carrierLogos';