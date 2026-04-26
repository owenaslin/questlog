// tavrn service worker
// Bump the version suffix on all cache names when deploying breaking changes
// to force old caches to be cleared on activate.
const STATIC_CACHE = "TAVRN_STATIC_V1";
const PAGES_CACHE = "TAVRN_PAGES_V1";
const API_CACHE = "TAVRN_API_V1";
const ALL_CACHES = [STATIC_CACHE, PAGES_CACHE, API_CACHE];

// ── Install ─────────────────────────────────────────────────────────────────
// Pre-cache the app shell and the offline fallback page so they are always
// available, even before the user has visited any other page.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => {
        // Wrap in try/catch: a cold Vercel server-side render during install
        // should not abort the entire SW installation.
        return cache.addAll(["/", "/offline"]).catch(() => {});
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate ────────────────────────────────────────────────────────────────
// Delete any caches whose name is not in ALL_CACHES (stale versions).
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !ALL_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch routing ────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept GET requests.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept chrome-extension or non-http(s) requests.
  if (!url.protocol.startsWith("http")) return;

  // 1. Supabase REST API calls — network-first with 3 s timeout + stale fallback.
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE, 3000, 60));
    return;
  }

  // 2. Next.js content-hashed static assets — cache-first (safe forever).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 3. Public static files — cache-first.
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/tavern/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/favicon.png"
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 4. Google Fonts — cache-first (external, but static).
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 5. Next.js API routes (/api/*) — never cache (AI generation, auth, etc.).
  if (url.pathname.startsWith("/api/")) return;

  // 6. Navigation requests (HTML pages) — network-first, offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigate(request));
    return;
  }

  // 7. Everything else — pass through uncached.
});

// ── Strategy helpers ─────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Only store valid, non-opaque responses to avoid caching CORS failures.
    if (response && response.status === 200 && response.type !== "opaque") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Network error", { status: 503 });
  }
}

async function networkFirstWithTimeout(request, cacheName, timeoutMs, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response && response.status === 200 && response.type !== "opaque") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timer);
    // Fall back to cache, but only if the cached entry is recent enough.
    const cached = await cache.match(request);
    if (cached) {
      const dateHeader = cached.headers.get("date");
      if (dateHeader) {
        const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
        if (age < maxAgeSeconds) return cached;
      } else {
        return cached;
      }
    }
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function networkFirstNavigate(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Serve the offline page pre-cached during install.
    const offline = await cache.match("/offline");
    return offline || new Response("You are offline.", { status: 503 });
  }
}
