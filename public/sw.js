/* CastIt service worker — offline support for the installed app.
 *  • App shell & Next.js static bundles: cache-first (they're content-hashed)
 *  • Pages: network-first, falling back to the last cached copy, then /offline
 *  • Images (Unsplash / Dicebear / own icons): stale-while-revalidate
 *  • Never touches /api/*, auth, Supabase or video streams.
 */
const VERSION = "castit-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const IMAGES = `${VERSION}-images`;
const PRECACHE = ["/offline", "/welcome", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC).then((c) => c.addAll(PRECACHE).catch(() => undefined)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(STATIC)).put(req, res.clone());
  return res;
}

async function networkFirst(req, { offlineFallback } = {}) {
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic") {
      (await caches.open(PAGES)).put(req, res.clone());
      trim(PAGES, 80);
    }
    return res;
  } catch (e) {
    const hit = await caches.match(req, { ignoreVary: true });
    if (hit) return hit;
    if (offlineFallback) {
      const off = await caches.match("/offline");
      if (off) return off;
    }
    throw e;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => {
      if (res.ok || res.type === "opaque") { cache.put(req, res.clone()); trim(IMAGES, 200); }
      return res;
    })
    .catch(() => hit);
  return hit || refresh;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Leave live / private traffic alone
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/webpack-hmr")) return;
  } else if (/supabase\.(co|in)$/.test(url.hostname) && !url.pathname.includes("/storage/v1/object/public/media/avatars/")) {
    return;
  }
  if (req.headers.get("range")) return; // video seeking

  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(woff2?|css)$/.test(url.pathname))) {
    event.respondWith(cacheFirst(req));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, { offlineFallback: true }));
    return;
  }

  // Next.js client navigations fetch RSC payloads
  if (isSameOrigin && (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc"))) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (req.destination === "image") {
    event.respondWith(staleWhileRevalidate(req));
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
