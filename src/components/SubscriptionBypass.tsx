import React from 'react';

export const SubscriptionBypass: React.FC = () => (
  <div className="subscription-container" style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Choose Your Plan</h2>

    <div className="pricing-cards" style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
      {/* Monthly */}
      <div className="card" style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1.5rem', width: 260, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3>Monthly Pro</h3>
        <div className="price" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#5469d4' }}>$9.99/month</div>
        <div style={{ color: '#666', fontSize: '0.9rem', margin: '0.5rem 0' }}>
          ✓ Unlimited quotes<br/>
          ✓ Real-time rates<br/>
          ✓ Priority support
        </div>
        <button
          onClick={() => window.open('https://buy.stripe.com/6oU8wR9uDb0gayL6gv7Vm00', '_blank')}
          className="subscribe-btn"
          style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: '#5469d4', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', width: '100%', fontWeight: '600' }}
        >
          Subscribe Monthly
        </button>
      </div>

      {/* Yearly */}
      <div className="card" style={{ border: '2px solid #5469d4', borderRadius: 8, padding: '1.5rem', width: 260, boxShadow: '0 4px 8px rgba(84,105,212,0.2)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#5469d4', color: 'white', padding: '0.25rem 0.75rem', borderRadius: 12, fontSize: '0.8rem', fontWeight: 'bold' }}>
          BEST VALUE
        </div>
        <h3>Yearly Pro</h3>
        <div className="price" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#5469d4' }}>$99/year</div>
        <div className="savings" style={{ color: '#28a745', fontSize: '0.9rem', fontWeight: 'bold' }}>Save 17% (2 months free)</div>
        <div style={{ color: '#666', fontSize: '0.9rem', margin: '0.5rem 0' }}>
          ✓ Everything in Monthly<br/>
          ✓ Priority booking<br/>
          ✓ Dedicated support
        </div>
        <button
          onClick={() => window.open('https://buy.stripe.com/3cI4g8fgX36kdKXgV97Vm01', '_blank')}
          className="subscribe-btn"
          style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', background: '#5469d4', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', width: '100%', fontWeight: '600' }}
        >
          Subscribe Yearly
        </button>
      </div>
    </div>

    <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666', maxWidth: 600, margin: '2rem auto 0' }}>
      <strong>Free tier:</strong> basic quotes, limited monthly usage. 
      <strong>Pro tier:</strong> unlimited real-time rates, priority support, and instant booking.
    </div>

    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#999' }}>
      Secure payments powered by Stripe • Cancel anytime
    </div>
  </div>
);