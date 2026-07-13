const CACHE_NAME = "gym-ai-coach-v20";
const STATIC_ASSETS = [
  "/css/style.css",
  "/js/sidebar.js",
  "/js/bug-report.js",
  "/js/i18n.js",
  "/js/offline-sync.js",
  "/logo.svg",
  "/favicon.svg",
  "/manifest.json",
  "/offline.html",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Jamais de cache pour l'API ou l'auth : toujours des donnees fraiches du serveur.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (["style", "script", "font", "image"].includes(request.destination)) {
    // Cache-first pour les assets statiques (marchent hors ligne une fois visites).
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return res;
      }).catch(() => cached))
    );
  } else if (request.mode === "navigate") {
    // Network-first pour les pages, repli sur le cache si deja visitee hors
    // ligne, puis sur /offline.html si la page n'a jamais ete mise en cache.
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(cached => cached || caches.match("/offline.html"))
      )
    );
  }
});
