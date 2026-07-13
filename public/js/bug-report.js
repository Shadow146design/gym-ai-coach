// Signalement de bug / support (fonctionnalite "Signaler un probleme").
// Injecte un bouton flottant discret + un modal sur toutes les pages qui
// chargent ce script (memes pages que sidebar.js), et expose
// window.openBugReportModal() pour les points d'entree sidebar/drawer mobile.
console.log("bug-report.js chargé");

const TICKET_TYPE_OPTIONS = [
  { value: "bug", label: "Bug technique" },
  { value: "program", label: "Problème avec mon programme" },
  { value: "payment", label: "Problème de paiement" },
  { value: "coach", label: "Problème avec mon coach" },
  { value: "suggestion", label: "Suggestion d'amélioration" },
  { value: "other", label: "Autre" },
];

// Injecte (cache) des le chargement du script plutot que cree a la volee au
// clic, comme voice-assistant.js : evite toute race condition et permet de
// scoper les querySelector a brOverlay (les IDs internes ne sont pas encore
// attaches a `document` tant que brOverlay n'a pas rejoint document.body).
const brOverlay = document.createElement("div");
brOverlay.className = "bug-report-overlay";
brOverlay.innerHTML = `
  <div class="bug-report-modal" role="dialog" aria-modal="true" aria-label="Signaler un problème">
    <button class="bug-report-close" type="button" aria-label="Fermer">✕</button>
    <div class="bug-report-body">
      <h2 class="bug-report-title">Signaler un problème</h2>
      <form class="bug-report-form">
        <label class="bug-report-label" for="bug-report-type">Type de problème</label>
        <select id="bug-report-type" class="bug-report-select">
          ${TICKET_TYPE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join("")}
        </select>

        <label class="bug-report-label" for="bug-report-desc">Description</label>
        <textarea id="bug-report-desc" class="bug-report-textarea" rows="5" placeholder="Décris le problème en détail (20 caractères minimum)…" required></textarea>

        <label class="bug-report-label">Page concernée</label>
        <input type="text" class="bug-report-input bug-report-page" readonly/>

        <label class="bug-report-checkbox">
          <input type="checkbox" class="bug-report-include-account" checked/>
          <span>Inclure mes informations de compte</span>
        </label>

        <div class="bug-report-error"></div>

        <div class="bug-report-actions">
          <button type="button" class="btn btn-ghost bug-report-cancel">Annuler</button>
          <button type="submit" class="btn btn-primary bug-report-submit">Envoyer</button>
        </div>
      </form>
      <div class="bug-report-success" hidden></div>
    </div>
  </div>
`;
document.addEventListener("DOMContentLoaded", () => document.body.appendChild(brOverlay));
if (document.readyState !== "loading") document.body.appendChild(brOverlay);

const brFloatingBtn = document.createElement("button");
brFloatingBtn.type = "button";
brFloatingBtn.className = "bug-report-fab";
brFloatingBtn.title = "Signaler un problème";
brFloatingBtn.setAttribute("aria-label", "Signaler un problème");
brFloatingBtn.textContent = "🐛";
document.addEventListener("DOMContentLoaded", () => document.body.appendChild(brFloatingBtn));
if (document.readyState !== "loading") document.body.appendChild(brFloatingBtn);
brFloatingBtn.addEventListener("click", () => openBugReportModal());

const brForm = brOverlay.querySelector(".bug-report-form");
const brTypeSelect = brOverlay.querySelector("#bug-report-type");
const brDescInput = brOverlay.querySelector("#bug-report-desc");
const brPageInput = brOverlay.querySelector(".bug-report-page");
const brIncludeAccountCheckbox = brOverlay.querySelector(".bug-report-include-account");
const brErrorEl = brOverlay.querySelector(".bug-report-error");
const brSuccessEl = brOverlay.querySelector(".bug-report-success");
const brSubmitBtn = brOverlay.querySelector(".bug-report-submit");

function brResetForm() {
  brForm.hidden = false;
  brForm.reset();
  brIncludeAccountCheckbox.checked = true;
  brPageInput.value = window.location.href;
  brErrorEl.textContent = "";
  brSuccessEl.hidden = true;
  brSubmitBtn.disabled = false;
  brSubmitBtn.textContent = "Envoyer";
}

function openBugReportModal() {
  brResetForm();
  brOverlay.classList.add("open");
}

function closeBugReportModal() {
  brOverlay.classList.remove("open");
}

brOverlay.querySelector(".bug-report-close").addEventListener("click", closeBugReportModal);
brOverlay.addEventListener("click", e => { if (e.target === brOverlay) closeBugReportModal(); });
brOverlay.querySelector(".bug-report-cancel").addEventListener("click", closeBugReportModal);
document.addEventListener("keydown", e => { if (e.key === "Escape" && brOverlay.classList.contains("open")) closeBugReportModal(); });

brForm.addEventListener("submit", async e => {
  e.preventDefault();
  const type = brTypeSelect.value;
  const description = brDescInput.value.trim();
  const pageUrl = brPageInput.value;
  const includeAccountInfo = brIncludeAccountCheckbox.checked;
  brErrorEl.textContent = "";

  if (description.length < 20) {
    brErrorEl.textContent = "La description doit contenir au moins 20 caractères.";
    return;
  }

  brSubmitBtn.disabled = true;
  brSubmitBtn.textContent = "Envoi…";

  try {
    const res = await fetch("/api/support/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, description, pageUrl, includeAccountInfo }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi.");

    brForm.hidden = true;
    brSuccessEl.hidden = false;
    brSuccessEl.textContent = `✅ Ton signalement a bien été reçu ! Nous reviendrons vers toi dans les 24h. Numéro de ticket : #${data.ticket.id}`;
  } catch (err) {
    brErrorEl.textContent = err.message || "Impossible d'envoyer le signalement, réessaie plus tard.";
    brSubmitBtn.disabled = false;
    brSubmitBtn.textContent = "Envoyer";
  }
});

window.openBugReportModal = openBugReportModal;
window.closeBugReportModal = closeBugReportModal;
