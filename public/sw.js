const CACHE_NAME = "gym-ai-coach-v25";
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
  // Pages coeur de l'app : precachees pour etre accessibles hors ligne des
  // la premiere visite (surtout utile en pleine seance sans reseau).
  "/home.html",
  "/dashboard.html",
  "/session.html",
  "/stats.html",
  "/profile.html",
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
    // Network-first pour les pages : la reponse fraiche est aussi mise en
    // cache (pas seulement les pages precachees a l'install) pour que toute
    // page visitee en ligne redevienne accessible hors ligne ensuite. Repli
    // sur le cache si deja visitee hors ligne, puis sur /offline.html sinon.
    event.respondWith(
      fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return res;
      }).catch(() =>
        caches.match(request).then(cached => cached || caches.match("/offline.html"))
      )
    );
  }
});

// ── Notifications push (fonctionnalite 3.2) ────────────────
self.addEventListener("push", event => {
  let data = { title: "Gym AI Coach", body: "", url: "/" };
  try { data = { ...data, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
