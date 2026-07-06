// Modal Premium partage (Fonctionnalite 13) : affiche un message + liste
// d'avantages + CTA vers /premium.html. Utilise partout ou une route renvoie
// {error, upgrade_url} en 403/429, ou pour un gate direct au clic.
function showPremiumModal(message, upgradeUrl) {
  document.getElementById("upgrade-modal-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "upgrade-modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card">
      <button class="modal-close" type="button" id="upgrade-modal-close">✕</button>
      <div class="modal-icon">🔒</div>
      <h2>Fonctionnalité Premium</h2>
      <p class="muted">${message}</p>
      <ul class="pricing-features" style="text-align:left;margin:20px 0">
        <li>Programmes IA illimités et avancés</li>
        <li>Debrief IA détaillé post-séance</li>
        <li>Statistiques complètes</li>
        <li>Accès aux coaches payants</li>
      </ul>
      <a class="btn btn-primary btn-block" href="${upgradeUrl || "/premium.html"}">Passer Premium — 9.99€/mois</a>
      <button class="btn btn-ghost btn-block" type="button" id="upgrade-modal-cancel" style="margin-top:10px">Plus tard</button>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById("upgrade-modal-close").addEventListener("click", close);
  document.getElementById("upgrade-modal-cancel").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
}

// Remplace le contenu d'une section par un etat "verrouille" avec cadenas,
// pour les blocs Premium (score de forme, plateau, debrief...) sur les pages
// home/stats/session/dashboard.
function lockSection(container, { title = "Fonctionnalité Premium", desc = "" } = {}) {
  if (!container) return;
  container.innerHTML = `
    <div class="premium-lock">
      <div class="premium-lock-icon">🔒</div>
      <div class="premium-lock-title">${title}</div>
      ${desc ? `<p class="muted" style="font-size:.85rem;margin:6px 0 14px">${desc}</p>` : ""}
      <a class="btn btn-primary btn-sm" href="/premium.html">Débloquer avec Premium</a>
    </div>`;
}
