// Professional E-commerce Page with Logo Integration
// Bloomberg-level professional e-commerce interface with carrier branding

import { useState, useEffect } from 'react';

interface EcommerceProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  brand: string;
  image: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  shippingPartner: string;
  shippingLogo: string;
  shippingColor: string;
}

interface EcommerceBrandingProps {
  category?: string;
  onProductSelect: (product: EcommerceProduct) => void;
}

const ecommerceProducts: EcommerceProduct[] = [
  {
    id: 1,
    name: "Premium Shipping Container - 40HC",
    description: "High-cube 40ft container with professional logistics support",
    price: 2500.00,
    originalPrice: 3200.00,
    category: "Shipping Equipment",
    brand: "Maersk Certified",
    image: "container-40hc",
    rating: 4.8,
    reviews: 127,
    inStock: true,
    shippingPartner: "Maersk",
    shippingLogo: "maersk-logo",
    shippingColor: "#003087"
  },
  {
    id: 2,
    name: "Professional Cargo Insurance - Premium",
    description: "Comprehensive cargo insurance with worldwide coverage",
    price: 299.99,
    originalPrice: 399.99,
    category: "Insurance",
    brand: "MSC Approved",
    image: "insurance-premium",
    rating: 4.9,
    reviews: 89,
    inStock: true,
    shippingPartner: "MSC",
    shippingLogo: "msc-logo",
    shippingColor: "#000000"
  },
  {
    id: 3,
    name: "Professional Freight Forwarding Service",
    description: "End-to-end logistics management with carrier partnerships",
    price: 499.99,
    originalPrice: 699.99,
    category: "Freight Services",
    brand: "CMA CGM Partner",
    image: "freight-service",
    rating: 4.7,
    reviews: 156,
    inStock: true,
    shippingPartner: "CMA CGM",
    shippingLogo: "cma-cgm-logo",
    shippingColor: "#E60012"
  },
  {
    id: 4,
    name: "Premium Tracking & Analytics Dashboard",
    description: "Real-time tracking with Bloomberg-level analytics",
    price: 199.99,
    originalPrice: 299.99,
    category: "Technology",
    brand: "COSCO Tech",
    image: "tracking-dashboard",
    rating: 4.6,
    reviews: 203,
    inStock: true,
    shippingPartner: "COSCO",
    shippingLogo: "cosco-logo",
    shippingColor: "#003DA5"
  },
  {
    id: 5,
    name: "Professional Customs Clearance Service",
    description: "Expert customs handling with compliance guarantee",
    price: 799.99,
    originalPrice: 999.99,
    category: "Customs Services",
    brand: "Hapag-Lloyd Pro",
    image: "customs-service",
    rating: 4.8,
    reviews: 94,
    inStock: true,
    shippingPartner: "Hapag-Lloyd",
    shippingLogo: "hapag-lloyd-logo",
    shippingColor: "#E2001A"
  },
  {
    id: 6,
    name: "Premium Supply Chain Management",
    description: "End-to-end supply chain optimization with AI insights",
    price: 1499.99,
    originalPrice: 1999.99,
    category: "Supply Chain",
    brand: "ONE Enterprise",
    image: "supply-chain",
    rating: 4.9,
    reviews: 67,
    inStock: true,
    shippingPartner: "ONE",
    shippingLogo: "one-logo",
    shippingColor: "#00539F"
  }
];

export function EcommercePageBranding({ category, onProductSelect }: EcommerceBrandingProps) {
  const [selectedProduct, setSelectedProduct] = useState<EcommerceProduct | null>(null);
  const [cartItems, setCartItems] = useState<EcommerceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const filteredProducts = category 
    ? ecommerceProducts.filter(product => product.category === category)
    : ecommerceProducts;

  const handleAddToCart = (product: EcommerceProduct) => {
    setIsLoading(true);
    setTimeout(() => {
      setCartItems(prev => [...prev, product]);
      setIsLoading(false);
    }, 1000);
  };

  const handleProductSelect = (product: EcommerceProduct) => {
    setSelectedProduct(product);
    onProductSelect(product);
  };

  return (
    <div className="ecommerce-branding-container">
      <style jsx>{`
        .ecommerce-branding-container {
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          border: 2px solid #333;
          border-radius: 16px;
          padding: 30px;
          margin: 20px 0;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
          font-family: 'Arial', sans-serif;
        }

        .ecommerce-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #444;
        }

        .ecommerce-title {
          color: #00ff41;
          font-family: 'Courier New', monospace;
          font-size: 24px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .market-badge {
          background: linear-gradient(135deg, #ff6600 0%, #ff8800 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 25px;
          margin-bottom: 30px;
        }

        .product-card {
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          border: 1px solid #444;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
          border-color: #555;
        }

        .product-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .product-branding {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .carrier-logo-small {
          width: 40px;
          height: 25px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .product-brand {
          color: #ccc;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .product-rating {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #ffcc00;
          font-size: 12px;
        }

        .product-name {
          color: white;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
          line-height: 1.3;
        }

        .product-description {
          color: #aaa;
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 15px;
        }

        .product-pricing {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }

        .price-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .current-price {
          color: #00ff41;
          font-size: 20px;
          font-weight: bold;
        }

        .original-price {
          color: #888;
          font-size: 14px;
          text-decoration: line-through;
        }

        .discount-badge {
          background: linear-gradient(135deg, #ff6600 0%, #ff8800 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }

        .shipping-info {
          background: linear-gradient(135deg, ${'#shippingColor'}15 0%, ${'#shippingColor'}05 100%);
          border: 1px solid ${'#shippingColor'}30;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .shipping-logo {
          width: 30px;
          height: 20px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 8px;
          font-weight: bold;
        }

        .shipping-text {
          color: #ccc;
          font-size: 11px;
          font-weight: bold;
        }

        .product-actions {
          display: flex;
          gap: 10px;
        }

        .add-to-cart-btn {
          background: linear-gradient(135deg, #00ff41 0%, #00cc33 100%);
          color: #000;
          border: none;
          border-radius: 8px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.3s ease;
          flex: 1;
          box-shadow: 0 4px 12px rgba(0, 255, 65, 0.3);
        }

        .add-to-cart-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 255, 65, 0.4);
        }

        .add-to-cart-btn:disabled {
          background: #444;
          color: #888;
          cursor: not-allowed;
          box-shadow: none;
        }

        .view-details-btn {
          background: transparent;
          color: #00a0df;
          border: 2px solid #00a0df;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .view-details-btn:hover {
          background: #00a0df20;
          transform: translateY(-1px);
        }

        .stock-indicator {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #00ff41;
          color: #000;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .ecommerce-footer {
          text-align: center;
          color: #888;
          font-size: 12px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #444;
        }

        .trust-indicators {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
        }

        .trust-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #aaa;
          font-size: 11px;
        }

        .bloomberg-ticker {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #00ff41 0%, transparent 100%);
          animation: bloomberg-ticker 6s linear infinite;
        }

        @keyframes bloomberg-ticker {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @media (max-width: 768px) {
          .ecommerce-branding-container {
            padding: 20px;
            margin: 10px 0;
          }
          
          .products-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .product-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          
          .product-actions {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="ecommerce-header">
        <div className="ecommerce-title">
          🛒 PROFESSIONAL E-COMMERCE
        </div>
        <div className="market-badge">
          TRUSTED BY 50,000+ BUSINESSES
        </div>
      </div>

      <div className="bloomberg-ticker"></div>

      <div className="products-grid">
        {filteredProducts.map((product) => (
          <div key={product.id} className="product-card">
            {product.inStock && (
              <div className="stock-indicator">IN STOCK</div>
            )}
            
            <div className="product-header">
              <div className="product-branding">
                <div 
                  className="carrier-logo-small" 
                  style={{ backgroundColor: product.shippingColor }}
                >
                  {product.shippingPartner.substring(0, 3)}
                </div>
                <div className="product-brand">{product.brand}</div>
              </div>
              <div className="product-rating">
                ⭐ {product.rating} ({product.reviews})
              </div>
            </div>

            <div className="product-name">{product.name}</div>
            <div className="product-description">{product.description}</div>

            <div className="product-pricing">
              <div className="price-container">
                <div className="current-price">${product.price.toFixed(2)}</div>
                {product.originalPrice && (
                  <>
                    <div className="original-price">${product.originalPrice.toFixed(2)}</div>
                    <div className="discount-badge">
                      SAVE {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="shipping-info" style={{ borderColor: product.shippingColor }}>
              <div 
                className="shipping-logo" 
                style={{ backgroundColor: product.shippingColor }}
              >
                {product.shippingPartner.substring(0, 3)}
              </div>
              <div className="shipping-text">
                Ships with {product.shippingPartner} • Professional logistics
              </div>
            </div>

            <div className="product-actions">
              <button 
                className="add-to-cart-btn"
                onClick={() => handleAddToCart(product)}
                disabled={isLoading || !product.inStock}
              >
                {isLoading ? 'ADDING...' : 'ADD TO CART'}
              </button>
              <button 
                className="view-details-btn"
                onClick={() => handleProductSelect(product)}
              >
                VIEW DETAILS
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="trust-indicators">
        <div className="trust-indicator">
          🔒 SSL Secured
        </div>
        <div className="trust-indicator">
          🚢 Carrier Verified
        </div>
        <div className="trust-indicator">
          ⭐ 4.8/5 Rating
        </div>
        <div className="trust-indicator">
          🌍 Worldwide Shipping
        </div>
      </div>

      <div className="ecommerce-footer">
        💳 SECURE PAYMENT • CARRIER VERIFIED • WORLDWIDE SHIPPING
      </div>
    </div>
  );
}