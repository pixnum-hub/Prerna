const CACHE_NAME = "prerna-cache-v1";
const OFFLINE_URL = "offline.html";

const PRECACHE_URLS = [
  "./",
  "index.html",
  "manifest.json",
  "offline.html",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-72.png",
  "icons/icon-96.png",
  "icons/icon-128.png",
  "icons/icon-144.png",
  "icons/icon-152.png",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-256.png",
  "icons/icon-384.png",
  "icons/icon-512.png",
  "icons/maskable-192.png",
  "icons/maskable-512.png"
];
// jsPDF is now embedded directly inside index.html (no separate file needed).

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first for navigations (HTML), cache-first for static assets.
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin (e.g. quote API) pass through

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
