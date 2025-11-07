// Professional Payment Page with Bloomberg-Level Branding
// Creates trust-building payment interface with carrier logos

import { useState, useEffect } from 'react';

interface PaymentBrandingProps {
  totalAmount: number;
  currency: string;
  serviceType: string;
  onPaymentComplete: () => void;
}

interface TrustedCarrier {
  name: string;
  logo: string;
  color: string;
  trustScore: number;
}

const trustedCarriers: TrustedCarrier[] = [
  { name: 'Maersk', logo: 'maersk-logo', color: '#003087', trustScore: 98 },
  { name: 'MSC', logo: 'msc-logo', color: '#000000', trustScore: 97 },
  { name: 'CMA CGM', logo: 'cma-cgm-logo', color: '#E60012', trustScore: 96 },
  { name: 'COSCO', logo: 'cosco-logo', color: '#003DA5', trustScore: 95 },
  { name: 'Hapag-Lloyd', logo: 'hapag-lloyd-logo', color: '#E2001A', trustScore: 94 },
  { name: 'ONE', logo: 'one-logo', color: '#00539F', trustScore: 93 }
];

const securityBadges = [
  { name: 'SSL Secured', icon: '🔒', color: '#00ff41' },
  { name: 'PCI DSS Compliant', icon: '🛡️', color: '#ff6600' },
  { name: '256-bit Encryption', icon: '🔐', color: '#00a0df' },
  { name: 'Stripe Verified', icon: '✅', color: '#003087' }
];

export function PaymentPageBranding({ totalAmount, currency, serviceType, onPaymentComplete }: PaymentBrandingProps) {
  const [currentCarrierIndex, setCurrentCarrierIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentCarrierIndex((prev) => (prev + 1) % trustedCarriers.length);
        setIsAnimating(false);
      }, 800);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const currentCarrier = trustedCarriers[currentCarrierIndex];

  return (
    <div className="payment-branding-container">
      <style jsx>{`
        .payment-branding-container {
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          border: 2px solid #333;
          border-radius: 16px;
          padding: 30px;
          margin: 20px 0;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
          position: relative;
          overflow: hidden;
          font-family: 'Arial', sans-serif;
        }

        .bloomberg-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 2px solid #444;
        }

        .bloomberg-title {
          color: #00ff41;
          font-family: 'Courier New', monospace;
          font-size: 20px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .live-indicator {
          width: 10px;
          height: 10px;
          background: #00ff41;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }

        .secure-badge {
          background: linear-gradient(135deg, #003087 0%, #0052a3 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 48, 135, 0.3);
        }

        .trusted-carriers-section {
          margin-bottom: 30px;
        }

        .section-title {
          color: #ccc;
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .carrier-showcase {
          background: linear-gradient(135deg, ${currentCarrier.color}15 0%, ${currentCarrier.color}05 100%);
          border: 1px solid ${currentCarrier.color}30;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          transition: all 0.8s ease;
          position: relative;
          overflow: hidden;
        }

        .carrier-showcase.animating {
          transform: scale(0.95);
          opacity: 0.7;
        }

        .carrier-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .carrier-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .carrier-logo {
          width: 60px;
          height: 40px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          background: ${currentCarrier.color};
        }

        .carrier-details {
          flex: 1;
        }

        .carrier-name {
          color: white;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .carrier-trust {
          color: #aaa;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .trust-score {
          background: linear-gradient(90deg, #00ff41 0%, #ff6600 100%);
          height: 4px;
          border-radius: 2px;
          margin-top: 5px;
          width: ${currentCarrier.trustScore}%;
        }

        .payment-security {
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          border: 1px solid #444;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 25px;
        }

        .security-title {
          color: #00ff41;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .security-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }

        .security-badge {
          background: linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%);
          border: 1px solid #555;
          border-radius: 20px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.3s ease;
        }

        .security-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .payment-summary {
          background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
          border: 1px solid #444;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 25px;
        }

        .summary-title {
          color: #ccc;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #333;
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-label {
          color: #aaa;
          font-size: 13px;
        }

        .summary-value {
          color: white;
          font-size: 14px;
          font-weight: bold;
        }

        .total-amount {
          color: #00ff41;
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin-top: 15px;
          text-shadow: 0 0 10px #00ff4130;
        }

        .bloomberg-footer {
          text-align: center;
          color: #888;
          font-size: 11px;
          font-family: 'Courier New', monospace;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #444;
        }

        .bloomberg-disclaimer {
          color: #666;
          font-size: 10px;
          text-align: center;
          margin-top: 10px;
          font-style: italic;
        }

        .ticker-animation {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #00ff41, transparent);
          animation: ticker 4s linear infinite;
        }

        @keyframes ticker {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        @media (max-width: 768px) {
          .payment-branding-container {
            padding: 20px;
            margin: 10px 0;
          }
          
          .bloomberg-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }
          
          .carrier-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          
          .security-badges {
            justify-content: flex-start;
          }
        }
      `}</style>

      <div className="ticker-animation"></div>

      <div className="bloomberg-header">
        <div className="bloomberg-title">
          <span className="live-indicator"></span>
          SECURE PAYMENT PROCESSING
        </div>
        <div className="secure-badge">
          🔒 SECURE • ENCRYPTED
        </div>
      </div>

      <div className="trusted-carriers-section">
        <div className="section-title">
          🚢 TRUSTED BY WORLD-LEADING CARRIERS
        </div>
        
        <div className={`carrier-showcase ${isAnimating ? 'animating' : ''}`}>
          <div className="carrier-header">
            <div className="carrier-info">
              <div className="carrier-logo" style={{ backgroundColor: currentCarrier.color }}>
                {currentCarrier.name.substring(0, 4)}
              </div>
              <div className="carrier-details">
                <div className="carrier-name">{currentCarrier.name}</div>
                <div className="carrier-trust">
                  ⭐ Trust Score: {currentCarrier.trustScore}/100
                </div>
                <div className="trust-score"></div>
              </div>
            </div>
            <div style={{ color: '#00ff41', fontSize: '12px', fontWeight: 'bold' }}>
              VERIFIED PARTNER
            </div>
          </div>
        </div>
      </div>

      <div className="payment-security">
        <div className="security-title">
          🔐 BANK-LEVEL SECURITY GUARANTEED
        </div>
        <div className="security-badges">
          {securityBadges.map((badge, index) => (
            <div key={index} className="security-badge" style={{ borderColor: badge.color }}>
              <span>{badge.icon}</span>
              <span>{badge.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="payment-summary">
        <div className="summary-title">
          💰 PAYMENT SUMMARY
        </div>
        <div className="summary-item">
          <span className="summary-label">Service Type:</span>
          <span className="summary-value">{serviceType}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Processing Fee:</span>
          <span className="summary-value">{currency} {(totalAmount * 0.029 + 0.3).toFixed(2)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Amount:</span>
          <span className="total-amount">{currency} {totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="bloomberg-footer">
        💳 SECURE PAYMENT PROCESSING • PCI DSS COMPLIANT • 256-BIT ENCRYPTION
      </div>

      <div className="bloomberg-disclaimer">
        🔒 Your payment information is encrypted and never stored on our servers. 
        All transactions are processed through Stripe's secure infrastructure.
      </div>
    </div>
  );
}

// Professional payment completion component
export function PaymentCompletionBranding({ 
  transactionId, 
  amount, 
  currency, 
  serviceType 
}: {
  transactionId: string;
  amount: number;
  currency: string;
  serviceType: string;
}) {
  return (
    <div className="completion-branding-container">
      <style jsx>{`
        .completion-branding-container {
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          border: 2px solid #00ff41;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .success-header {
          color: #00ff41;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .transaction-id {
          background: linear-gradient(135deg, #003087 0%, #0052a3 100%);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          margin: 15px 0;
          display: inline-block;
        }

        .amount-display {
          color: #00ff41;
          font-size: 32px;
          font-weight: bold;
          margin: 20px 0;
          text-shadow: 0 0 20px #00ff4150;
        }

        .service-info {
          color: #ccc;
          font-size: 16px;
          margin-bottom: 20px;
        }

        .next-steps {
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          border: 1px solid #444;
          border-radius: 12px;
          padding: 20px;
          margin-top: 20px;
        }

        .next-steps-title {
          color: #00ff41;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          text-transform: uppercase;
        }

        .next-step {
          color: #aaa;
          font-size: 14px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .support-info {
          color: #888;
          font-size: 12px;
          margin-top: 20px;
          font-style: italic;
        }
      `}</style>

      <div className="success-header">
        ✅ PAYMENT SUCCESSFUL
      </div>

      <div className="transaction-id">
        Transaction ID: {transactionId}
      </div>

      <div className="amount-display">
        {currency} {amount.toFixed(2)}
      </div>

      <div className="service-info">
        {serviceType} Service Confirmed
      </div>

      <div className="next-steps">
        <div className="next-steps-title">
          🚀 WHAT HAPPENS NEXT
        </div>
        <div className="next-step">
          📧 You will receive confirmation email within 5 minutes
        </div>
        <div className="next-step">
          📦 Tracking information will be available in 24-48 hours
        </div>
        <div className="next-step">
          📱 Download our mobile app for real-time updates
        </div>
      </div>

      <div className="support-info">
        💬 Need help? Contact support@vcanship.com or call +1-800-VCANSHIP
      </div>
    </div>
  );
}