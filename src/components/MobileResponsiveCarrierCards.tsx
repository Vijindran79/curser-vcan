/**
 * Mobile-Responsive Carrier Cards with Movable Black Design
 * Enhanced viewport-scaling awareness and manual zoom capability
 * Features draggable black carrier cards with increased ship capacity
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag } from 'react-use-gesture';
import { CarrierLogo } from './CarrierLogo';
import { LogoTicker } from './LogoTicker';

interface CarrierCard {
  id: string;
  carrier: string;
  rate: number;
  transitTime: string;
  position: { x: number; y: number };
  isVisible: boolean;
}

interface MobileResponsiveCarrierCardsProps {
  quotes: any[];
  onRateSelect?: (quote: any) => void;
  className?: string;
}

export const MobileResponsiveCarrierCards: React.FC<MobileResponsiveCarrierCardsProps> = ({
  quotes,
  onRateSelect,
  className = ''
}) => {
  const [cards, setCards] = useState<CarrierCard[]>([]);
  const [viewportScale, setViewportScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Enhanced viewport scaling detection
  useEffect(() => {
    const updateViewportScale = () => {
      const scale = window.visualViewport?.scale || 1;
      const width = window.innerWidth;
      const isMobileDevice = width <= 768 || navigator.maxTouchPoints > 0;
      
      setViewportScale(scale);
      setIsMobile(isMobileDevice);
      
      // Apply viewport-aware scaling
      if (containerRef.current) {
        containerRef.current.style.transform = `scale(${Math.min(scale, 1.2)})`;
        containerRef.current.style.transformOrigin = 'top center';
      }
    };

    updateViewportScale();
    window.addEventListener('resize', updateViewportScale);
    window.visualViewport?.addEventListener('resize', updateViewportScale);
    
    return () => {
      window.removeEventListener('resize', updateViewportScale);
      window.visualViewport?.removeEventListener('resize', updateViewportScale);
    };
  }, []);

  // Initialize cards with increased capacity
  useEffect(() => {
    if (quotes && quotes.length > 0) {
      const initialCards: CarrierCard[] = quotes.slice(0, 8).map((quote, index) => ({
        id: `card-${index}`,
        carrier: quote.carrierName || quote.carrier || 'Unknown Carrier',
        rate: quote.totalCost || quote.total_rate || 0,
        transitTime: quote.estimatedTransitTime || quote.transit_time || 'N/A',
        position: { 
          x: (index % 2) * 160, // 2 columns for mobile
          y: Math.floor(index / 2) * 120 // Staggered rows
        },
        isVisible: true
      }));
      setCards(initialCards);
    }
  }, [quotes]);

  // Drag functionality for movable cards
  const bind = useDrag(({ args: [cardId], offset: [x, y], first, last }) => {
    if (first) {
      // Bring card to front during drag
      setCards(prev => {
        const cardIndex = prev.findIndex(card => card.id === cardId);
        if (cardIndex === -1) return prev;
        
        const updatedCards = [...prev];
        const [draggedCard] = updatedCards.splice(cardIndex, 1);
        return [...updatedCards, { ...draggedCard, isVisible: true }];
      });
    }
    
    if (last) {
      setCards(prev => prev.map(card => 
        card.id === cardId 
          ? { ...card, position: { x, y } }
          : card
      ));
    }
  });

  // Enhanced mobile-responsive styles
  const mobileStyles = {
    container: {
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'auto',
      overflowY: 'visible',
      padding: '16px',
      touchAction: 'manipulation',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      position: 'relative' as const,
      minHeight: '400px'
    },
    card: {
      position: 'absolute' as const,
      width: isMobile ? '140px' : '160px',
      height: isMobile ? '100px' : '120px',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      borderRadius: '12px',
      padding: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      cursor: 'grab',
      touchAction: 'none',
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      userSelect: 'none',
      transform: `scale(${Math.min(viewportScale, 1.2)})`,
      transformOrigin: 'center',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'space-between',
      alignItems: 'center',
      color: '#ffffff',
      fontSize: isMobile ? '12px' : '14px',
      fontWeight: '500'
    },
    cardActive: {
      cursor: 'grabbing',
      transform: `scale(${Math.min(viewportScale * 1.1, 1.3)})`,
      boxShadow: '0 12px 48px rgba(0, 0, 0, 0.8), 0 6px 24px rgba(0, 0, 0, 0.4)',
      zIndex: 1000
    },
    logoContainer: {
      width: '48px',
      height: '48px',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '4px'
    },
    rateText: {
      fontSize: isMobile ? '14px' : '16px',
      fontWeight: 'bold',
      color: '#ffd700',
      marginBottom: '4px',
      textAlign: 'center' as const
    },
    transitText: {
      fontSize: isMobile ? '10px' : '12px',
      color: '#cccccc',
      textAlign: 'center' as const
    },
    dragIndicator: {
      position: 'absolute' as const,
      top: '4px',
      right: '4px',
      width: '20px',
      height: '20px',
      background: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'grab',
      fontSize: '12px',
      color: '#ffffff'
    }
  };

  // Handle card selection
  const handleCardClick = (card: CarrierCard, index: number) => {
    if (onRateSelect && quotes[index]) {
      onRateSelect(quotes[index]);
    }
  };

  // Enhanced touch and zoom handling
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      ref={containerRef}
      className={`mobile-responsive-carrier-cards ${className}`}
      style={mobileStyles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className="cards-header" style={{ 
        marginBottom: '16px', 
        color: '#ffffff',
        fontSize: isMobile ? '16px' : '18px',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        🚢 Live Carrier Rates - Drag to Compare
      </div>
      
      <AnimatePresence>
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            className="carrier-card"
            style={{
              ...mobileStyles.card,
              left: card.position.x,
              top: card.position.y + 50, // Offset for header
              ...(card.isVisible ? {} : { opacity: 0.3 })
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            {...bind(card.id)}
            onClick={() => handleCardClick(card, index)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Drag indicator */}
            <div className="drag-indicator" style={mobileStyles.dragIndicator}>
              ⋮⋮
            </div>
            
            {/* Carrier Logo */}
            <div style={mobileStyles.logoContainer}>
              <CarrierLogo 
                carrier={card.carrier} 
                size={isMobile ? 32 : 40}
              />
            </div>
            
            {/* Rate Information */}
            <div style={mobileStyles.rateText}>
              ${card.rate.toLocaleString()}
            </div>
            
            <div style={mobileStyles.transitText}>
              {card.transitTime}
            </div>
            
            {/* Live Rate Indicator */}
            <div style={{
              position: 'absolute',
              bottom: '4px',
              left: '4px',
              background: '#28a745',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              LIVE
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Mobile zoom instructions */}
      {isMobile && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#cccccc',
          fontSize: '12px',
          textAlign: 'center',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '8px 12px',
          borderRadius: '8px',
          backdropFilter: 'blur(4px)'
        }}>
          📱 Pinch to zoom • Drag cards to compare • Tap to select
        </div>
      )}
    </div>
  );
};

// Enhanced CSS for mobile responsiveness
export const MobileResponsiveStyles = `
  .mobile-responsive-carrier-cards {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-x pan-y;
    -webkit-user-select: none;
    user-select: none;
  }
  
  .carrier-card {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    touch-action: none;
    will-change: transform;
  }
  
  @media (max-width: 768px) {
    .mobile-responsive-carrier-cards {
      padding: 12px !important;
      min-height: 350px !important;
    }
    
    .carrier-card {
      width: 120px !important;
      height: 85px !important;
      font-size: 11px !important;
    }
  }
  
  @media (max-width: 480px) {
    .mobile-responsive-carrier-cards {
      padding: 8px !important;
      min-height: 300px !important;
    }
    
    .carrier-card {
      width: 100px !important;
      height: 75px !important;
      font-size: 10px !important;
    }
  }
  
  /* High DPI display support */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .carrier-card {
      border-width: 0.5px !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
    }
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .mobile-responsive-carrier-cards {
      background: rgba(0, 0, 0, 0.8) !important;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .carrier-card {
      transition: none !important;
      animation: none !important;
    }
  }
`;

export default MobileResponsiveCarrierCards;