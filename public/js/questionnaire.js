fetch("/api/auth/me").then(r => { if (!r.ok) window.location.href = "/"; });

// Pre-remplir le retour coach si redirige depuis le dashboard chat
const params = new URLSearchParams(window.location.search);
const feedback = params.get("feedback");
if (feedback) {
  document.getElementById("feedback-input").value = feedback;
  document.getElementById("feedback-banner").classList.remove("hidden");
}

// Style visuel des radio-cards
document.querySelectorAll(".radio-grid").forEach(group => {
  group.addEventListener("change", () => {
    group.querySelectorAll(".radio-card").forEach(card => {
      card.classList.toggle("selected", card.querySelector("input").checked);
    });
  });
});

const form = document.getElementById("quiz-form");
const submitBtn = document.getElementById("submit-btn");
const errorBox = document.getElementById("quiz-error");

form.addEventListener("submit", async e => {
  e.preventDefault();
  errorBox.innerHTML = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "L'IA construit ton programme… ✨";

  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const res = await fetch("/api/program/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      if (json.upgrade_url) {
        showUpgradeModal(json.error, json.upgrade_url);
      } else {
        errorBox.innerHTML = `<div class="error-msg">${json.error}</div>`;
      }
      submitBtn.disabled = false;
      submitBtn.textContent = "Générer mon programme ✨";
      return;
    }
    window.location.href = "/dashboard.html";
  } catch {
    errorBox.innerHTML = `<div class="error-msg">Impossible de joindre le serveur.</div>`;
    submitBtn.disabled = false;
    submitBtn.textContent = "Générer mon programme ✨";
  }
});

function showUpgradeModal(message, upgradeUrl) {
  document.getElementById("upgrade-modal-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "upgrade-modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card">
      <button class="modal-close" type="button" id="upgrade-modal-close">✕</button>
      <div class="modal-icon">⭐</div>
      <h2>Limite gratuite atteinte</h2>
      <p class="muted">${message}</p>
      <ul class="pricing-features" style="text-align:left;margin:20px 0">
        <li>Programmes IA illimités et avancés</li>
        <li>Debrief IA détaillé post-séance</li>
        <li>Statistiques complètes</li>
        <li>Accès aux coaches payants</li>
      </ul>
      <a class="btn btn-primary btn-block" href="${upgradeUrl}">Passer Premium — 9.99€/mois</a>
      <button class="btn btn-ghost btn-block" type="button" id="upgrade-modal-cancel" style="margin-top:10px">Plus tard</button>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById("upgrade-modal-close").addEventListener("click", close);
  document.getElementById("upgrade-modal-cancel").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
}
