// utils.ts

/**
 * Converts a Blob (like an image file) to a Base64 encoded string.
 * @param blob The blob to convert.
 * @returns A promise that resolves with the Base64 string.
 */
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // The result includes the data URL prefix (e.g., "data:image/png;base64,"),
            // which we need to remove before sending to Gemini API.
            const base64String = reader.result as string;
            resolve(base64String.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Makes an HTML element draggable within the viewport.
 * @param element The HTML element to make draggable.
 * @param storageKey The key to use for saving the position in localStorage.
 */
export function makeDraggable(element: HTMLElement, storageKey: string) {
    if (!element) return;

    let isDragging = false;
    let hasMoved = false;
    let offsetX: number, offsetY: number;

    // Restore saved position
    const savedPos = localStorage.getItem(storageKey);
    if (savedPos) {
        try {
            const { top, left } = JSON.parse(savedPos);
            if (top && left) {
                element.style.top = top;
                element.style.left = left;
                element.style.bottom = 'auto';
                element.style.right = 'auto';
            }
        } catch (e) {
            console.error("Failed to parse saved position for draggable element", e);
        }
    }

    const onDragStart = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        hasMoved = false;
        element.classList.add('dragging');
        element.style.transition = 'none'; // Disable transition while dragging

        if (e instanceof MouseEvent) {
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
        } else {
            offsetX = e.touches[0].clientX - element.getBoundingClientRect().left;
            offsetY = e.touches[0].clientY - element.getBoundingClientRect().top;
        }

        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchend', onDragEnd);
    };

    const onDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        
        e.preventDefault();
        if (!hasMoved) {
            // Check for a minimum movement threshold to be considered a drag
            if (e instanceof MouseEvent && (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2)) {
                hasMoved = true;
            } else if (e instanceof TouchEvent) {
                 hasMoved = true; // Touch events don't have movementX/Y, assume any move is a drag
            }
        }


        let x, y;
        if (e instanceof MouseEvent) {
            x = e.clientX;
            y = e.clientY;
        } else {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        }

        let newLeft = x - offsetX;
        let newTop = y - offsetY;

        const fabRect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        newLeft = Math.max(8, Math.min(newLeft, viewportWidth - fabRect.width - 8));
        newTop = Math.max(8, Math.min(newTop, viewportHeight - fabRect.height - 8));

        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        element.style.bottom = 'auto';
        element.style.right = 'auto';
    };

    const onDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        element.classList.remove('dragging');
        element.style.transition = ''; // Restore transitions

        if (hasMoved) {
            localStorage.setItem(storageKey, JSON.stringify({ top: element.style.top, left: element.style.left }));
        }

        // Use a timeout to reset hasMoved after the current event loop.
        // This ensures the click event (which fires after mouseup) has a chance
        // to be captured and cancelled if it was a drag, while ensuring
        // subsequent, separate clicks are not blocked.
        setTimeout(() => {
            hasMoved = false;
        }, 0);

        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchend', onDragEnd);
    };
    
    // Use capture phase to intercept click before it bubbles,
    // and stop it if the element was dragged.
    element.addEventListener('click', (e) => {
        if (hasMoved) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }, true);

    element.addEventListener('mousedown', onDragStart);
    element.addEventListener('touchstart', onDragStart, { passive: false });
}

/**
 * Get logistics provider logo URL from CDN
 * @param providerName The name of the logistics provider
 * @returns The logo URL or null if not found
 */
export function getLogisticsProviderLogo(providerName: string): string | null {
    const providerLower = providerName.toLowerCase().trim();
    
    // Using reliable CDN sources - logo.clearbit.com and Wikipedia
    const logoMap: { [key: string]: string } = {
        'dhl': 'https://logo.clearbit.com/dhl.com',
        'fedex': 'https://logo.clearbit.com/fedex.com',
        'ups': 'https://logo.clearbit.com/ups.com',
        'tnt': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/TNT_Express_Logo.svg/320px-TNT_Express_Logo.svg.png',
        'aramex': 'https://logo.clearbit.com/aramex.com',
        'maersk': 'https://logo.clearbit.com/maersk.com',
        'dpd': 'https://logo.clearbit.com/dpd.com',
        'usps': 'https://logo.clearbit.com/usps.com',
        'evri': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Evri_logo.svg/320px-Evri_logo.svg.png',
        'cma cgm': 'https://logo.clearbit.com/cma-cgm.com',
        'hapag': 'https://logo.clearbit.com/hapag-lloyd.com',
        'hapag-lloyd': 'https://logo.clearbit.com/hapag-lloyd.com',
        'emirates': 'https://logo.clearbit.com/emirates.com',
        'lufthansa': 'https://logo.clearbit.com/lufthansa.com',
        'cathay': 'https://logo.clearbit.com/cathaypacific.com',
        'cathay pacific': 'https://logo.clearbit.com/cathaypacific.com',
        'atlas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Atlas_Air_Logo.svg/320px-Atlas_Air_Logo.svg.png',
        'msc': 'https://logo.clearbit.com/msc.com',
        'evergreen': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Evergreen_Marine_logo.svg/320px-Evergreen_Marine_logo.svg.png',
        'one': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Ocean_Network_Express_logo.svg/320px-Ocean_Network_Express_logo.svg.png'
    };
    
    // Try exact match first
    for (const [key, url] of Object.entries(logoMap)) {
        if (providerLower === key || providerLower.includes(key)) {
            return url;
        }
    }
    
    return null;
}

/**
 * Get e-commerce platform logo URL from CDN
 * @param platformName The name of the e-commerce platform
 * @returns The logo URL or null if not found
 */
export function getEcommercePlatformLogo(platformName: string): string | null {
    const platformLower = platformName.toLowerCase().trim();
    
    const logoMap: { [key: string]: string } = {
        'amazon': 'https://logo.clearbit.com/amazon.com',
        'ebay': 'https://logo.clearbit.com/ebay.com',
        'shopify': 'https://logo.clearbit.com/shopify.com',
        'walmart': 'https://logo.clearbit.com/walmart.com',
        'etsy': 'https://logo.clearbit.com/etsy.com',
        'instagram': 'https://logo.clearbit.com/instagram.com',
        'facebook marketplace': 'https://logo.clearbit.com/facebook.com',
        'facebook': 'https://logo.clearbit.com/facebook.com',
        'google shopping': 'https://logo.clearbit.com/google.com',
        'google': 'https://logo.clearbit.com/google.com',
        'tiktok shop': 'https://logo.clearbit.com/tiktok.com',
        'tiktok': 'https://logo.clearbit.com/tiktok.com',
        'alibaba': 'https://logo.clearbit.com/alibaba.com'
    };
    
    // Try exact match first
    for (const [key, url] of Object.entries(logoMap)) {
        if (platformLower === key || platformLower.includes(key)) {
            return url;
        }
    }
    
    return null;
}