/* FlowTodo service worker: lets the web app open without a connection.
 *
 * - Pages (navigations): network first, falling back to the last cached copy; the most
 *   recent page is also kept as a generic shell so any route opens offline (the router runs
 *   on the client).
 * - /_expo/** and /assets/** have content-hashed names, so they are cached forever once seen.
 * - Everything else (Supabase API, other origins, non-GET) is never touched.
 * Cached responses keep their headers, including the COOP/COEP ones the local database needs.
 */
const VERSION = 'v1';
const PAGES = `flowtodo-pages-${VERSION}`;
const ASSETS = `flowtodo-assets-${VERSION}`;
const SHELL_KEY = '/__shell';
/** With a cached copy at hand, a hanging network (dead Wi-Fi) must not delay the page. */
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('flowtodo-') && key !== PAGES && key !== ASSETS) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(pageResponse(request));
  } else if (url.pathname.startsWith('/_expo/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(assetResponse(request));
  }
});

const shellRequest = () => new Request(self.location.origin + SHELL_KEY);

async function pageResponse(request) {
  const cache = await caches.open(PAGES);
  const cached = (await cache.match(request)) || (await cache.match(shellRequest()));

  const network = fetch(request).then(async (response) => {
    // A redirected response cannot be replayed for a navigation, so it is not stored.
    if (response.ok && !response.redirected) {
      await cache.put(request, response.clone());
      await cache.put(shellRequest(), response.clone());
    }
    return response;
  });

  if (!cached) return network;

  try {
    return await Promise.race([
      network,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS)),
    ]);
  } catch {
    network.catch(() => {}); // a late failure must not surface as an unhandled rejection
    return cached;
  }
}

async function assetResponse(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}
