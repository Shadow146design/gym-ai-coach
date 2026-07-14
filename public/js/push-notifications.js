// Notifications push (fonctionnalite 3.2) : propose l'activation apres la
// 3e seance de l'utilisateur, plutot que d'appeler Notification.requestPermission()
// au chargement (le navigateur bloque/ignore les demandes non sollicitees).

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function maybeShowPushBanner() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  if (localStorage.getItem("pushPromptDismissed") === "true") return;

  try {
    const [streakRes, keyRes] = await Promise.all([
      fetch("/api/logs/streak").then(r => r.json()),
      fetch("/api/push/vapid-public-key").then(r => r.json()),
    ]);
    if (!keyRes.configured || !keyRes.publicKey) return;
    if ((streakRes.totalSessions || 0) < 3) return;

    showPushBanner(keyRes.publicKey);
  } catch {}
}

function showPushBanner(publicKey) {
  if (document.getElementById("push-permission-banner")) return;

  const banner = document.createElement("div");
  banner.id = "push-permission-banner";
  banner.className = "pwa-install-banner";
  banner.innerHTML = `
    <span>🔔 Active les notifications pour ne rater ni ton streak, ni les messages de ton coach.</span>
    <div style="display:flex;gap:8px;flex-shrink:0">
      <button type="button" class="btn btn-primary btn-sm" id="push-enable-btn">Activer</button>
      <button type="button" class="btn btn-ghost btn-sm btn-icon" id="push-dismiss-btn">✕</button>
    </div>`;
  document.body.appendChild(banner);

  document.getElementById("push-enable-btn").addEventListener("click", async () => {
    banner.remove();
    await enablePush(publicKey);
  });
  document.getElementById("push-dismiss-btn").addEventListener("click", () => {
    localStorage.setItem("pushPromptDismissed", "true");
    banner.remove();
  });
}

async function enablePush(publicKey) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription }),
    });
  } catch (e) {
    console.error("Erreur activation notifications push :", e);
  }
}

maybeShowPushBanner();
