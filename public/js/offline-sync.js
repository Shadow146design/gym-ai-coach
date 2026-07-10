// Mode hors-ligne complet (fonctionnalite 9). Stocke en IndexedDB :
// - les series loguees pendant une seance sans connexion (queue a synchroniser)
// - un instantane des donnees utilisateur (programme actif, derniers logs,
//   profil) pour permettre a une seance de demarrer meme hors ligne
// Detecte online/offline via navigator.onLine + les evenements du meme nom,
// affiche un bandeau "Mode hors-ligne" visible, et synchronise automatiquement
// (avec notification "X séries synchronisées") au retour de la connexion.

const OFFLINE_DB_NAME = "gym-ai-coach-offline";
const OFFLINE_DB_VERSION = 1;
const STORE_PENDING_LOGS = "pendingLogs";
const STORE_CACHE = "cache";

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("IndexedDB non supporté."));
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PENDING_LOGS)) {
        db.createObjectStore(STORE_PENDING_LOGS, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveOfflineLog(log) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_LOGS, "readwrite");
    tx.objectStore(STORE_PENDING_LOGS).add(log);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingLogs() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_LOGS, "readonly");
    const req = tx.objectStore(STORE_PENDING_LOGS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function removePendingLog(id) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING_LOGS, "readwrite");
    tx.objectStore(STORE_PENDING_LOGS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function cacheData(key, value) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, "readwrite");
      tx.objectStore(STORE_CACHE).put({ key, value, cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* IndexedDB indisponible : pas bloquant, juste pas de cache offline */ }
}

async function getCachedData(key) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, "readonly");
      const req = tx.objectStore(STORE_CACHE).get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

// ── Indicateur "Mode hors-ligne" ────────────────────────────
function showOfflineBanner() {
  if (document.getElementById("offline-banner")) return;
  const banner = document.createElement("div");
  banner.id = "offline-banner";
  banner.className = "offline-banner";
  banner.textContent = "📡 Mode hors-ligne — tes séries seront synchronisées au retour de la connexion.";
  document.body.appendChild(banner);
}
function hideOfflineBanner() {
  document.getElementById("offline-banner")?.remove();
}

function showSyncToast(text) {
  const toast = document.createElement("div");
  toast.className = "app-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => { toast.classList.remove("visible"); setTimeout(() => toast.remove(), 300); }, 3500);
}

// ── Sync automatique ─────────────────────────────────────────
let syncing = false;
async function syncPendingLogs() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const pending = await getPendingLogs();
    if (!pending.length) return;

    let synced = 0;
    for (const log of pending) {
      try {
        const { id, ...body } = log;
        const res = await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) continue;
        await removePendingLog(id);
        synced++;
      } catch {
        break; // toujours hors-ligne malgre l'evenement 'online' : on retentera plus tard
      }
    }
    if (synced > 0) {
      showSyncToast(`✓ ${synced} série${synced > 1 ? "s" : ""} synchronisée${synced > 1 ? "s" : ""}`);
    }
  } finally {
    syncing = false;
  }
}

function updateOnlineState() {
  if (navigator.onLine) { hideOfflineBanner(); syncPendingLogs(); }
  else showOfflineBanner();
}

window.addEventListener("online", updateOnlineState);
window.addEventListener("offline", updateOnlineState);
document.addEventListener("DOMContentLoaded", () => {
  updateOnlineState();
  syncPendingLogs(); // rattrape les series restees en attente d'une session precedente
});

window.offlineSync = { saveOfflineLog, getPendingLogs, removePendingLog, cacheData, getCachedData, syncPendingLogs };
