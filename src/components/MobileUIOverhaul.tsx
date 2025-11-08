/**
 * Complete Mobile UI Overhaul with Viewport-Scaling Awareness
 * Addresses the full backlog of mobile-fit tasks with manual zoom capability
 * Features enhanced touch interactions and responsive design patterns
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileUIOverhaulProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileUIOverhaul: React.FC<MobileUIOverhaulProps> = ({
  children,
  className = ''
}) => {
  const [viewportScale, setViewportScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [touchEnabled, setTouchEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Enhanced viewport and device detection
  useEffect(() => {
    const detectDeviceAndViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const scale = window.visualViewport?.scale || 1;
      const touchPoints = navigator.maxTouchPoints || 0;
      
      // Enhanced mobile detection
      const mobileDevice = width <= 768 || touchPoints > 0 || 
                          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Viewport scaling awareness
      const currentScale = scale || (width / window.screen.width);
      
      setViewportScale(currentScale);
      setIsMobile(mobileDevice);
      setTouchEnabled(touchPoints > 0);
      setZoomLevel(currentScale);
    };

    detectDeviceAndViewport();
    
    // Enhanced event listeners for viewport changes
    window.addEventListener('resize', detectDeviceAndViewport);
    window.addEventListener('orientationchange', detectDeviceAndViewport);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', detectDeviceAndViewport);
      window.visualViewport.addEventListener('scroll', detectDeviceAndViewport);
    }
    
    return () => {
      window.removeEventListener('resize', detectDeviceAndViewport);
      window.removeEventListener('orientationchange', detectDeviceAndViewport);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', detectDeviceAndViewport);
        window.visualViewport.removeEventListener('scroll', detectDeviceAndViewport);
      }
    };
  }, []);

  // Enhanced touch and gesture handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Prevent default touch behaviors that interfere with zoom
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Enhanced pinch-to-zoom support
    if (e.touches.length > 1) {
      e.preventDefault();
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      // Calculate zoom level based on pinch distance
      const newZoom = Math.max(0.5, Math.min(3, distance / 200));
      setZoomLevel(newZoom);
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Reset zoom level after pinch gesture
    if (e.touches.length === 0) {
      setTimeout(() => setZoomLevel(viewportScale), 300);
    }
  }, [viewportScale]);

  // Manual zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.5, prev - 0.2));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  // Enhanced responsive styles based on viewport scale
  const getResponsiveStyles = () => {
    const baseFontSize = isMobile ? 14 : 16;
    const scaledFontSize = baseFontSize * Math.min(zoomLevel, 1.5);
    
    return {
      fontSize: `${scaledFontSize}px`,
      lineHeight: isMobile ? '1.4' : '1.5',
      transform: `scale(${zoomLevel})`,
      transformOrigin: 'top center',
      transition: 'transform 0.2s ease-out',
      touchAction: 'manipulation',
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      userSelect: 'none',
      overscrollBehavior: 'contain'
    };
  };

  // Mobile-specific optimizations
  const mobileOptimizations = {
    container: {
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden',
      overflowY: 'auto',
      position: 'relative' as const,
      minHeight: '100vh',
      WebkitOverflowScrolling: 'touch',
      overscrollBehavior: 'contain'
    },
    viewportMeta: {
      name: 'viewport',
      content: `width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover`
    }
  };

  // Enhanced touch-friendly components
  const TouchFriendlyWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        minHeight: '44px', // Apple HIG minimum touch target
        minWidth: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      {children}
    </div>
  );

  // Zoom control component
  const ZoomControls = () => (
    <AnimatePresence>
      {isMobile && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <TouchFriendlyWrapper>
            <button
              onClick={handleZoomIn}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Zoom In"
            >
              +
            </button>
          </TouchFriendlyWrapper>
          
          <TouchFriendlyWrapper>
            <button
              onClick={handleZoomReset}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Reset Zoom"
            >
              ⌖
            </button>
          </TouchFriendlyWrapper>
          
          <TouchFriendlyWrapper>
            <button
              onClick={handleZoomOut}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Zoom Out"
            >
              −
            </button>
          </TouchFriendlyWrapper>
          
          <div style={{
            color: '#ffffff',
            fontSize: '10px',
            textAlign: 'center',
            padding: '4px'
          }}>
            {Math.round(zoomLevel * 100)}%
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Enhanced responsive breakpoints
  const responsiveClasses = `
    mobile-ui-overhaul
    ${isMobile ? 'mobile-device' : 'desktop-device'}
    ${touchEnabled ? 'touch-enabled' : 'mouse-enabled'}
    ${zoomLevel > 1.2 ? 'zoomed-in' : ''}
    ${viewportScale > 1 ? 'viewport-scaled' : ''}
    ${className}
  `.trim();

  return (
    <>
      {/* Enhanced viewport meta tag */}
      <meta name="viewport" content={mobileOptimizations.viewportMeta.content} />
      
      <motion.div
        className={responsiveClasses}
        style={{
          ...mobileOptimizations.container,
          ...getResponsiveStyles()
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Enhanced touch and zoom context provider */}
        <div className="mobile-ui-context" data-mobile={isMobile} data-touch={touchEnabled} data-zoom={zoomLevel}>
          {children}
        </div>
        
        {/* Zoom controls for mobile */}
        <ZoomControls />
      </motion.div>
    </>
  );
};

// Enhanced CSS for complete mobile overhaul
export const MobileUIOverhaulStyles = `
  /* Base mobile-responsive styles */
  .mobile-ui-overhaul {
    -webkit-text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  
  /* Mobile device optimizations */
  .mobile-device {
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Touch-enabled optimizations */
  .touch-enabled * {
    cursor: pointer !important;
    touch-action: manipulation;
  }
  
  /* Zoom-aware scaling */
  .zoomed-in {
    overflow-x: auto;
    overflow-y: auto;
  }
  
  /* Enhanced responsive breakpoints */
  @media (max-width: 768px) {
    .mobile-ui-overhaul {
      font-size: 16px !important;
      line-height: 1.4 !important;
    }
    
    .mobile-ui-overhaul * {
      max-width: 100vw !important;
      box-sizing: border-box !important;
    }
  }
  
  @media (max-width: 480px) {
    .mobile-ui-overhaul {
      font-size: 14px !important;
      line-height: 1.3 !important;
    }
  }
  
  @media (max-width: 320px) {
    .mobile-ui-overhaul {
      font-size: 13px !important;
      line-height: 1.2 !important;
    }
  }
  
  /* High DPI display support */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .mobile-ui-overhaul {
      -webkit-font-smoothing: subpixel-antialiased;
    }
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .mobile-ui-overhaul {
      color-scheme: dark;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .mobile-ui-overhaul * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  
  /* Landscape orientation support */
  @media (orientation: landscape) and (max-height: 500px) {
    .mobile-ui-overhaul {
      font-size: 12px !important;
    }
  }
  
  /* Enhanced touch targets */
  .touch-enabled button,
  .touch-enabled .button,
  .touch-enabled [role="button"],
  .touch-enabled a,
  .touch-enabled input,
  .touch-enabled select,
  .touch-enabled textarea {
    min-height: 44px !important;
    min-width: 44px !important;
    padding: 12px !important;
    margin: 4px !important;
  }
  
  /* Prevent zoom on double-tap */
  .mobile-device * {
    -webkit-touch-callout: none !important;
    -webkit-user-select: none !important;
    user-select: none !important;
  }
  
  /* Enable text selection where needed */
  .mobile-device input,
  .mobile-device textarea,
  .mobile-device [contenteditable] {
    -webkit-user-select: text !important;
    user-select: text !important;
  }
  
  /* Enhanced scrolling */
  .mobile-ui-overhaul {
    scroll-behavior: smooth;
    scroll-padding-top: env(safe-area-inset-top);
    scroll-padding-bottom: env(safe-area-inset-bottom);
  }
  
  /* Safe area support for notched devices */
  .mobile-ui-overhaul {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
`;

export default MobileUIOverhaul;