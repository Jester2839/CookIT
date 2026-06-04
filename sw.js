const CACHE_NAME = 'cookit-cache-v6';

// Soubory, které chceme nakešovat hned při instalaci (tzv. precaching)
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './config.js',
    './manifest.json',
    './img/favicon-96x96.png',
    './img/favicon.svg',
    './img/favicon.ico',
    './img/apple-touch-icon.png',
    './img/web-app-manifest-192x192.png',
    './img/web-app-manifest-512x512.png'
];

// Instalace Service Workeru
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); // Ihned aktivuje nový SW, pokud existuje starý
});

// Aktivace (úklid starých mezipamětí při vydání nové verze)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Zpracování síťových požadavků
self.addEventListener('fetch', (event) => {
    // 1. Pro volání Spoonacular API zkusíme "Network First" a nakešujeme úspěšné odpovědi
    if (event.request.url.includes('api.spoonacular.com')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clonedResponse));
                    return response;
                })
                .catch(() => caches.match(event.request)) // Když jsme offline, vrátíme data z cache
        );
    } else {
        // 2. Pro zbytek appky (statické soubory) zkusíme "Cache First, fallback to Network"
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
        );
    }
});