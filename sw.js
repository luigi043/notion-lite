/* Notion-lite service worker
 * Strategy: cache-first for app shell + CDN deps, network-first fallback. */

const VERSION    = 'notion-lite-v2';
const APP_SHELL  = ['./', './index.html', './manifest.json'];

const CDN_HOSTS = [
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isShell = url.origin === self.location.origin;
  const isCdn   = CDN_HOSTS.includes(url.hostname);
  if (!isShell && !isCdn) return;

  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(VERSION).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
