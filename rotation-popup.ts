/**
 * Phone Rotation Suggestion Popup
 * 
 * Small non-intrusive popup suggesting landscape mode for better view
 * Auto-appears on mobile devices in portrait mode
 * Auto-disappears after 3 seconds
 */

/**
 * Show rotation suggestion popup
 */
export function showRotationSuggestion() {
    // Only show on mobile devices
    if (!isMobileDevice()) {
        return;
    }

    // Only show in portrait mode
    if (!isPortraitMode()) {
        return;
    }

    // Check if user has dismissed it before
    const dismissed = localStorage.getItem('vcanship_rotation_dismissed');
    if (dismissed === 'true') {
        return;
    }

    // Create popup element
    const popup = document.createElement('div');
    popup.id = 'rotation-suggestion-popup';
    popup.innerHTML = `
        <div class="rotation-popup-content">
            <div class="rotation-icon">
                <i class="fa-solid fa-mobile-screen-button"></i>
                <i class="fa-solid fa-rotate-right"></i>
            </div>
            <div class="rotation-text">
                <span class="rotation-title">Better View</span>
                <span class="rotation-subtitle">Rotate for landscape mode</span>
            </div>
            <button class="rotation-close" aria-label="Dismiss">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
    `;

    // Add styles
    addRotationPopupStyles();

    // Add to DOM
    document.body.appendChild(popup);

    // Add animation class after a small delay for smooth entry
    setTimeout(() => {
        popup.classList.add('show');
    }, 100);

    // Auto-hide after 3 seconds
    setTimeout(() => {
        hideRotationPopup(popup);
    }, 3000);

    // Close button handler
    const closeBtn = popup.querySelector('.rotation-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideRotationPopup(popup);
            localStorage.setItem('vcanship_rotation_dismissed', 'true');
        });
    }

    // Hide on orientation change
    window.addEventListener('orientationchange', () => {
        if (!isPortraitMode()) {
            hideRotationPopup(popup);
        }
    });
}

/**
 * Hide rotation popup
 */
function hideRotationPopup(popup: HTMLElement) {
    popup.classList.remove('show');
    popup.classList.add('hide');
    
    // Remove from DOM after animation
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 300);
}

/**
 * Check if device is mobile
 */
function isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if in portrait mode
 */
function isPortraitMode(): boolean {
    return window.innerHeight > window.innerWidth;
}

/**
 * Add popup styles
 */
function addRotationPopupStyles() {
    if (document.getElementById('rotation-popup-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'rotation-popup-styles';
    style.textContent = `
        #rotation-suggestion-popup {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
        }

        #rotation-suggestion-popup.show {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }

        #rotation-suggestion-popup.hide {
            opacity: 0;
            transform: translateY(20px);
            pointer-events: none;
        }

        .rotation-popup-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 
                        0 4px 8px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 280px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .rotation-icon {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 1.25rem;
            animation: rotateHint 2s ease-in-out infinite;
        }

        @keyframes rotateHint {
            0%, 100% {
                transform: rotate(0deg);
            }
            25% {
                transform: rotate(-10deg);
            }
            75% {
                transform: rotate(10deg);
            }
        }

        .rotation-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
        }

        .rotation-title {
            font-weight: 600;
            font-size: 0.875rem;
            line-height: 1.2;
        }

        .rotation-subtitle {
            font-size: 0.75rem;
            opacity: 0.9;
            line-height: 1.2;
        }

        .rotation-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0;
        }

        .rotation-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }

        .rotation-close:active {
            transform: scale(0.95);
        }

        .rotation-close i {
            font-size: 0.75rem;
        }

        /* Responsive adjustments */
        @media (max-width: 480px) {
            #rotation-suggestion-popup {
                bottom: 16px;
                right: 16px;
            }

            .rotation-popup-content {
                max-width: 240px;
                padding: 10px 14px;
            }

            .rotation-icon {
                font-size: 1.125rem;
            }

            .rotation-title {
                font-size: 0.8125rem;
            }

            .rotation-subtitle {
                font-size: 0.6875rem;
            }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .rotation-popup-content {
                background: linear-gradient(135deg, #4c51bf 0%, #553c9a 100%);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 
                            0 4px 8px rgba(0, 0, 0, 0.2);
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Initialize rotation suggestion on page load
 */
export function initializeRotationSuggestion() {
    // Show popup after a short delay to let page load
    setTimeout(() => {
        showRotationSuggestion();
    }, 1000);

    // Re-check on orientation change
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            showRotationSuggestion();
        }, 500);
    });

    // Re-check on window resize
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = window.setTimeout(() => {
            if (isMobileDevice() && isPortraitMode()) {
                const existing = document.getElementById('rotation-suggestion-popup');
                if (!existing) {
                    showRotationSuggestion();
                }
            }
        }, 500);
    });
}
