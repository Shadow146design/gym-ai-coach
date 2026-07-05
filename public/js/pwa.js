// Enregistrement du service worker (cache offline des assets statiques)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Compteur de visites : une visite = une session navigateur (pas chaque page vue)
if (!sessionStorage.getItem("pwaVisitCounted")) {
  sessionStorage.setItem("pwaVisitCounted", "1");
  const visits = parseInt(localStorage.getItem("pwaVisits") || "0", 10) + 1;
  localStorage.setItem("pwaVisits", String(visits));
}

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  maybeShowInstallBanner();
});

window.addEventListener("appinstalled", () => {
  localStorage.setItem("pwaInstallDismissed", "true");
  document.getElementById("pwa-install-banner")?.remove();
});

function maybeShowInstallBanner() {
  const visits = parseInt(localStorage.getItem("pwaVisits") || "0", 10);
  const dismissed = localStorage.getItem("pwaInstallDismissed") === "true";
  const isMobile = window.innerWidth < 768;
  if (!deferredInstallPrompt || visits < 3 || dismissed || !isMobile) return;
  if (document.getElementById("pwa-install-banner")) return;

  const banner = document.createElement("div");
  banner.id = "pwa-install-banner";
  banner.className = "pwa-install-banner";
  banner.innerHTML = `
    <span>📲 Installe Gym AI Coach sur ton téléphone pour un accès rapide.</span>
    <div style="display:flex;gap:8px;flex-shrink:0">
      <button type="button" class="btn btn-primary btn-sm" id="pwa-install-btn">Installer</button>
      <button type="button" class="btn btn-ghost btn-sm btn-icon" id="pwa-dismiss-btn">✕</button>
    </div>`;
  document.body.appendChild(banner);

  document.getElementById("pwa-install-btn").addEventListener("click", async () => {
    banner.remove();
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  });
  document.getElementById("pwa-dismiss-btn").addEventListener("click", () => {
    localStorage.setItem("pwaInstallDismissed", "true");
    banner.remove();
  });
}
