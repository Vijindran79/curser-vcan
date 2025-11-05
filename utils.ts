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
    
    // Using reliable CDN sources for company logos (logos-world.net is down)
    const logoMap: { [key: string]: string } = {
        'dhl': 'https://cdn.brandfetch.io/idXHzdEwBt/w/400/h/400/theme/dark/logo.png?t=1729590579258',
        'fedex': 'https://cdn.brandfetch.io/idjYkIwM7Z/w/400/h/400/theme/dark/logo.png?t=1729590467758',
        'ups': 'https://cdn.brandfetch.io/idCd1mUn0_/w/400/h/400/theme/dark/logo.png?t=1729590685863',
        'tnt': 'https://cdn.brandfetch.io/idSUrLOWxR/w/400/h/400/theme/dark/logo.png?t=1729590643583',
        'aramex': 'https://cdn.brandfetch.io/idaiGam3xZ/w/400/h/400/theme/dark/logo.png?t=1729590097558',
        'maersk': 'https://cdn.brandfetch.io/id1LQGJ5c6/w/400/h/400/theme/dark/logo.png?t=1729589866449',
        'dpd': 'https://cdn.brandfetch.io/idTdiFzVnI/w/400/h/400/theme/dark/logo.png?t=1729590384929',
        'usps': 'https://cdn.brandfetch.io/idkFLkc-Gx/w/400/h/400/theme/dark/logo.png?t=1729590694669',
        'evri': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Evri_logo.svg/320px-Evri_logo.svg.png',
        'cma cgm': 'https://cdn.brandfetch.io/idXvzB9Gl4/w/400/h/400/theme/dark/logo.png?t=1729589541074',
        'hapag': 'https://cdn.brandfetch.io/idCHd2SqLE/w/400/h/400/theme/dark/logo.png?t=1729589704917',
        'hapag-lloyd': 'https://cdn.brandfetch.io/idCHd2SqLE/w/400/h/400/theme/dark/logo.png?t=1729589704917',
        'emirates': 'https://cdn.brandfetch.io/idY-nIS0xH/w/400/h/400/theme/dark/logo.png?t=1729590437011',
        'lufthansa': 'https://cdn.brandfetch.io/idhVOwbILQ/w/400/h/400/theme/dark/logo.png?t=1729589843473',
        'cathay': 'https://cdn.brandfetch.io/idEUfXJlq4/w/400/h/400/theme/dark/logo.png?t=1729589504091',
        'cathay pacific': 'https://cdn.brandfetch.io/idEUfXJlq4/w/400/h/400/theme/dark/logo.png?t=1729589504091',
        'atlas': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Atlas_Air_Logo.svg/320px-Atlas_Air_Logo.svg.png',
        'msc': 'https://cdn.brandfetch.io/idkwrAP9_G/w/400/h/400/theme/dark/logo.png?t=1729589898226',
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
        'amazon': 'https://cdn.brandfetch.io/idSUrLOWxR/w/400/h/400/theme/dark/logo.png?t=1729590099273',
        'ebay': 'https://cdn.brandfetch.io/idI4pLjGQl/w/400/h/400/theme/dark/logo.png?t=1729590403859',
        'shopify': 'https://cdn.brandfetch.io/idAnDTFapY/w/400/h/400/theme/dark/logo.png?t=1729590604935',
        'walmart': 'https://cdn.brandfetch.io/idc91SAlpX/w/400/h/400/theme/dark/logo.png?t=1729590718892',
        'etsy': 'https://cdn.brandfetch.io/idE9H6TQER/w/400/h/400/theme/dark/logo.png?t=1729590447677',
        'instagram': 'https://cdn.brandfetch.io/idxW4r6KEd/w/400/h/400/theme/dark/logo.png?t=1729589755916',
        'facebook marketplace': 'https://cdn.brandfetch.io/ido9pDgh7X/w/400/h/400/theme/dark/logo.png?t=1729589461090',
        'facebook': 'https://cdn.brandfetch.io/ido9pDgh7X/w/400/h/400/theme/dark/logo.png?t=1729589461090',
        'google shopping': 'https://cdn.brandfetch.io/idIq_kF0rb/w/400/h/400/theme/dark/logo.png?t=1729589679830',
        'google': 'https://cdn.brandfetch.io/idIq_kF0rb/w/400/h/400/theme/dark/logo.png?t=1729589679830',
        'tiktok shop': 'https://cdn.brandfetch.io/idt7nXGpJY/w/400/h/400/theme/dark/logo.png?t=1729590645754',
        'tiktok': 'https://cdn.brandfetch.io/idt7nXGpJY/w/400/h/400/theme/dark/logo.png?t=1729590645754',
        'alibaba': 'https://cdn.brandfetch.io/idctOXLKWs/w/400/h/400/theme/dark/logo.png?t=1729590060843'
    };
    
    // Try exact match first
    for (const [key, url] of Object.entries(logoMap)) {
        if (platformLower === key || platformLower.includes(key)) {
            return url;
        }
    }
    
    return null;
}