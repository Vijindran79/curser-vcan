// Vcanship Service Worker - SEO & Performance Optimization
// Version: 3.4.0 - Improved i18n JSON file handling with better caching and error recovery

const CACHE_NAME = 'vcanship-v3.4-seo';
const STATIC_CACHE_NAME = 'vcanship-static-v3.4';
const DYNAMIC_CACHE_NAME = 'vcanship-dynamic-v3.4';

// Critical files for SEO and performance
const STATIC_FILES = [
  '/',
  '/index.html',
  '/index.css',
  '/index.js',
  '/manifest.json',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/logo.svg',
  
  // Service landing pages for SEO
  '/parcel-delivery',
  '/fcl-shipping',
  '/lcl-shipping',
  '/air-freight',
  '/vehicle-shipping',
  '/baggage-delivery',
  '/warehouse-services',
  '/bulk-cargo',
  '/railway-transport',
  '/inland-transport',
  '/ecommerce-shipping',
  
  // Essential app files
  '/ui.ts',
  '/state.ts',
  '/api.ts',
  '/router.ts',
  '/i18n.ts',
  
  // Locale files
  '/locales/en.json',
  '/locales/es.json',
  '/locales/fr.json',
  '/locales/de.json',
  '/locales/it.json',
  '/locales/pt.json',
  '/locales/ru.json',
  '/locales/ja.json',
  '/locales/ko.json',
  '/locales/zh.json',
  '/locales/ar.json',
  '/locales/hi.json',
  '/locales/tr.json',
  
  // Critical i18n config files
  '/locales.json',
  '/languages.json'
];

// URLs that should always be fetched fresh for SEO
const DYNAMIC_URLS = [
  '/sitemap.xml',
  '/robots.txt',
  '/',
  '/api/',
  '/search'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Vcanship Service Worker v3.4.0');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static files including i18n resources');
        // Cache files one by one to handle failures gracefully
        return Promise.allSettled(
          STATIC_FILES.map(file => 
            cache.add(file).catch(err => {
              console.warn(`[SW] Failed to cache ${file}:`, err.message);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Installation complete - assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
        // Still skip waiting to activate new SW even if some files failed
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Vcanship Service Worker v3.0.0');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete all old caches that don't match current version
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME &&
                cacheName.startsWith('vcanship-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Cache cleanup complete - forcing update');
        // Force all clients to use new service worker
        return self.clients.claim();
      })
  );
});

// Fetch event - intelligent caching for SEO
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Skip POST requests - they cannot be cached
  if (request.method === 'POST') {
    return;
  }
  
  // Handle different types of requests for optimal SEO
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.includes('/service/')) {
    // HTML pages - stale-while-revalidate for SEO freshness
    event.respondWith(handleHTMLRequest(request));
  } else if (url.pathname.includes('/api/')) {
    // API requests - network first with offline fallback
    event.respondWith(handleAPIRequest(request));
  } else if (url.pathname.endsWith('.json')) {
    // JSON files - network first to ensure fresh data
    event.respondWith(handleJSONRequest(request));
  } else if (url.pathname.match(/\.(css|js|tsx|ts)$/)) {
    // Static assets - cache first
    event.respondWith(handleStaticRequest(request));
  } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
    // Images - cache first with long TTL
    event.respondWith(handleImageRequest(request));
  } else {
    // Everything else - network first
    event.respondWith(handleGenericRequest(request));
  }
});

// HTML requests - network first to get fresh content, with cache fallback
async function handleHTMLRequest(request) {
  try {
    // Always try network first to get latest updates
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // Fallback to cache if network fails
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] HTML request failed:', error);
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return await handleOfflineRequest(request);
  }
}

// API requests - network first for real-time data
async function handleAPIRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] API offline, trying cache:', request.url);
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(
      JSON.stringify({ error: 'Offline - no cached data available' }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Static assets - network first with cache fallback for updates
async function handleStaticRequest(request) {
  try {
    // Check if request includes a hash (new build) - always fetch fresh
    const url = new URL(request.url);
    const hasHash = /-[a-zA-Z0-9]{8,}\.(js|css)$/.test(url.pathname);
    
    if (hasHash) {
      // Hashed files (new builds) - always fetch from network
      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          const cache = await caches.open(STATIC_CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        // Fallback to cache if network fails
        const cache = await caches.open(STATIC_CACHE_NAME);
        return await cache.match(request) || await handleOfflineRequest(request);
      }
    }
    
    // Non-hashed files - try network first, then cache
    try {
      const response = await fetch(request, { cache: 'no-cache' });
      if (response && response.status === 200) {
        const cache = await caches.open(STATIC_CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const cachedResponse = await cache.match(request);
      return cachedResponse || await handleOfflineRequest(request);
    }
  } catch (error) {
    console.error('[SW] Static request failed:', error);
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    return cachedResponse || await handleOfflineRequest(request);
  }
}

// Image requests - cache first with long TTL
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Image request failed:', error);
    // Return a placeholder image for SEO
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Vcanship</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// JSON requests - network first with improved i18n locale file handling
async function handleJSONRequest(request) {
  const url = new URL(request.url);
  const isLocaleFile = url.pathname.includes('/locales/') && url.pathname.endsWith('.json');
  const isI18nConfigFile = url.pathname.endsWith('locales.json') || url.pathname.endsWith('languages.json');
  
  try {
    // For critical i18n files, try network first but with timeout
    if (isLocaleFile || isI18nConfigFile) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
      
      try {
        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response && response.status === 200) {
          const cache = await caches.open(STATIC_CACHE_NAME); // Use static cache for locale files
          cache.put(request, response.clone());
          console.log('[SW] Cached i18n file:', url.pathname);
          return response;
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.log('[SW] i18n file fetch failed/timeout, checking cache:', url.pathname);
        // Continue to cache check below
      }
    } else {
      // Non-i18n JSON files - standard network first
      const response = await fetch(request);
      
      if (response && response.status === 200) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const cache = await caches.open(DYNAMIC_CACHE_NAME);
          cache.put(request, response.clone());
          return response;
        } else {
          console.warn('[SW] JSON file served with wrong content-type:', contentType);
          return response;
        }
      }
      
      return response;
    }
  } catch (error) {
    console.log('[SW] JSON request error:', error.message, url.pathname);
  }
  
  // Fallback to cache for all JSON requests
  try {
    const staticCache = await caches.open(STATIC_CACHE_NAME);
    let cachedResponse = await staticCache.match(request);
    
    if (!cachedResponse) {
      const dynamicCache = await caches.open(DYNAMIC_CACHE_NAME);
      cachedResponse = await dynamicCache.match(request);
    }
    
    if (cachedResponse) {
      console.log('[SW] Serving cached JSON:', url.pathname);
      return cachedResponse;
    }
  } catch (cacheError) {
    console.error('[SW] Cache access error:', cacheError);
  }
  
  // Final fallback: return empty JSON for locale files, error for others
  if (isLocaleFile) {
    console.warn('[SW] Returning empty translation object for:', url.pathname);
    return new Response('{}', {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store' // Don't cache empty responses
      }
    });
  } else if (isI18nConfigFile) {
    console.warn('[SW] Returning empty array for:', url.pathname);
    return new Response('[]', {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
  
  // For other JSON files, return error
  return new Response(JSON.stringify({ error: 'JSON file not available' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Generic requests - network first
async function handleGenericRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    return cachedResponse || await handleOfflineRequest(request);
  }
}

// Offline request handler
async function handleOfflineRequest(request) {
  const url = new URL(request.url);
  
  // Return appropriate offline page based on request type
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - Vcanship</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .offline-container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #2563eb; margin-bottom: 20px; }
          p { color: #666; line-height: 1.6; }
          .retry-btn { background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-top: 20px; }
          .retry-btn:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <h1>You're Offline</h1>
          <p>It looks like you've lost your internet connection. Please check your connection and try again.</p>
          <p><strong>Vcanship</strong> - Your global shipping platform will be available when you're back online.</p>
          <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
      </html>`,
      { 
        headers: { 
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
  
  return new Response('Offline', { status: 503 });
}

// Background sync for SEO analytics
self.addEventListener('sync', (event) => {
  if (event.tag === 'seo-analytics') {
    event.waitUntil(syncSEOAnalytics());
  }
});

// Sync SEO analytics data
async function syncSEOAnalytics() {
  try {
    // Send cached analytics data when back online
    console.log('[SW] Syncing SEO analytics data');
    // Implementation would sync with analytics service
  } catch (error) {
    console.error('[SW] SEO analytics sync failed:', error);
  }
}

// Push notifications for SEO engagement
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1'
      },
      actions: [
        {
          action: 'explore',
          title: 'Get Quote',
          icon: '/images/checkmark.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/images/xmark.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('Vcanship Update', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_SEO_PAGE') {
    const { url } = event.data;
    caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
      cache.add(url);
    });
  }
});

console.log('[SW] Vcanship Service Worker v3.2.0 loaded - SEO optimized');