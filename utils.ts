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
    
    // Using logos.dev CDN - a reliable source for company logos
    const logoMap: { [key: string]: string } = {
        'dhl': 'https://logos-world.net/wp-content/uploads/2020/04/DHL-Logo.png',
        'fedex': 'https://logos-world.net/wp-content/uploads/2020/05/FedEx-Logo.png',
        'ups': 'https://logos-world.net/wp-content/uploads/2021/03/UPS-Logo.png',
        'tnt': 'https://logos-world.net/wp-content/uploads/2020/11/TNT-Logo.png',
        'aramex': 'https://logos-world.net/wp-content/uploads/2020/08/Aramex-Logo.png',
        'maersk': 'https://logos-world.net/wp-content/uploads/2020/08/Maersk-Logo.png',
        'dpd': 'https://logos-world.net/wp-content/uploads/2021/02/DPD-Logo.png',
        'usps': 'https://logos-world.net/wp-content/uploads/2020/06/USPS-Logo.png',
        'evri': 'https://logos-world.net/wp-content/uploads/2023/02/Evri-Logo.png',
        'cma cgm': 'https://logos-world.net/wp-content/uploads/2021/08/CMA-CGM-Logo.png',
        'hapag': 'https://logos-world.net/wp-content/uploads/2021/09/Hapag-Lloyd-Logo.png',
        'hapag-lloyd': 'https://logos-world.net/wp-content/uploads/2021/09/Hapag-Lloyd-Logo.png',
        'emirates': 'https://logos-world.net/wp-content/uploads/2020/08/Emirates-Logo.png',
        'lufthansa': 'https://logos-world.net/wp-content/uploads/2020/05/Lufthansa-Logo.png',
        'cathay': 'https://logos-world.net/wp-content/uploads/2021/03/Cathay-Pacific-Logo.png',
        'cathay pacific': 'https://logos-world.net/wp-content/uploads/2021/03/Cathay-Pacific-Logo.png',
        'atlas': 'https://logos-world.net/wp-content/uploads/2021/08/Atlas-Air-Logo.png',
        'msc': 'https://logos-world.net/wp-content/uploads/2021/08/MSC-Logo.png',
        'evergreen': 'https://logos-world.net/wp-content/uploads/2021/09/Evergreen-Line-Logo.png',
        'one': 'https://logos-world.net/wp-content/uploads/2021/09/ONE-Logo.png'
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
        'amazon': 'https://logos-world.net/wp-content/uploads/2020/04/Amazon-Logo.png',
        'ebay': 'https://logos-world.net/wp-content/uploads/2020/06/eBay-Logo.png',
        'shopify': 'https://logos-world.net/wp-content/uploads/2021/08/Shopify-Logo.png',
        'walmart': 'https://logos-world.net/wp-content/uploads/2020/06/Walmart-Logo.png',
        'etsy': 'https://logos-world.net/wp-content/uploads/2021/02/Etsy-Logo.png',
        'instagram': 'https://logos-world.net/wp-content/uploads/2017/04/Instagram-Logo.png',
        'facebook marketplace': 'https://logos-world.net/wp-content/uploads/2021/04/Facebook-Logo.png',
        'facebook': 'https://logos-world.net/wp-content/uploads/2021/04/Facebook-Logo.png',
        'google shopping': 'https://logos-world.net/wp-content/uploads/2015/12/Google-Logo.png',
        'google': 'https://logos-world.net/wp-content/uploads/2015/12/Google-Logo.png',
        'tiktok shop': 'https://logos-world.net/wp-content/uploads/2021/07/TikTok-Logo.png',
        'tiktok': 'https://logos-world.net/wp-content/uploads/2021/07/TikTok-Logo.png',
        'alibaba': 'https://logos-world.net/wp-content/uploads/2020/04/Alibaba-Logo.png'
    };
    
    // Try exact match first
    for (const [key, url] of Object.entries(logoMap)) {
        if (platformLower === key || platformLower.includes(key)) {
            return url;
        }
    }
    
    return null;
}