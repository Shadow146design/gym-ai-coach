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

// ── Module E : questionnaire conversationnel ───────────────
const QUIZ_QUESTIONS = [
  "Bonjour ! Quel est ton objectif principal ? (ex : prendre du muscle, perdre du poids, gagner en force, retrouver la forme)",
  "Depuis combien de temps tu t'entraînes ? (jamais/débutant, quelques mois, ou plusieurs années)",
  "Combien de jours par semaine peux-tu t'entraîner ?",
  "Combien de temps max tu peux consacrer à une séance ?",
  "Tu as accès à quel matériel ? (salle complète, juste des haltères, ou aucun matériel)",
  "Dernière chose : as-tu des douleurs ou limitations physiques à prendre en compte ? (sinon réponds \"non\")",
];
let quizConversation = [];
let quizStep = 0;
let quizStarted = false;

const modeFormBtn = document.getElementById("mode-form-btn");
const modeChatBtn = document.getElementById("mode-chat-btn");
const quizChatWrap = document.getElementById("quiz-chat-wrap");
const quizForm = document.getElementById("quiz-form");

modeFormBtn?.addEventListener("click", () => {
  quizForm.classList.remove("hidden");
  quizChatWrap.classList.add("hidden");
  modeFormBtn.classList.replace("btn-ghost", "btn-primary");
  modeChatBtn.classList.replace("btn-primary", "btn-ghost");
});

modeChatBtn?.addEventListener("click", () => {
  quizForm.classList.add("hidden");
  quizChatWrap.classList.remove("hidden");
  modeChatBtn.classList.replace("btn-ghost", "btn-primary");
  modeFormBtn.classList.replace("btn-primary", "btn-ghost");
  if (!quizStarted) startQuizChat();
});

function startQuizChat() {
  quizStarted = true;
  quizStep = 0;
  quizConversation = [];
  document.getElementById("quiz-chat-messages").innerHTML = "";
  askNextQuizQuestion();
}

function appendQuizMsg(role, text) {
  const box = document.getElementById("quiz-chat-messages");
  const el = document.createElement("div");
  el.className = `chat-msg ${role}`;
  el.textContent = text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

function askNextQuizQuestion() {
  const question = QUIZ_QUESTIONS[quizStep];
  appendQuizMsg("coach", question);
  quizConversation.push({ role: "assistant", content: question });
}

async function sendQuizAnswer() {
  const input = document.getElementById("quiz-chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  appendQuizMsg("user", text);
  quizConversation.push({ role: "user", content: text });
  quizStep++;

  if (quizStep < QUIZ_QUESTIONS.length) {
    askNextQuizQuestion();
    return;
  }

  const sendBtn = document.getElementById("quiz-chat-send-btn");
  const errorBox = document.getElementById("quiz-chat-error");
  input.disabled = true;
  sendBtn.disabled = true;
  const thinking = appendQuizMsg("coach", "L'IA construit ton programme… ✨");

  try {
    const res = await fetch("/api/program/chat-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation: quizConversation }),
    });
    const json = await res.json();
    if (!res.ok) {
      thinking.remove();
      if (json.upgrade_url) {
        showUpgradeModal(json.error, json.upgrade_url);
      } else {
        errorBox.innerHTML = `<div class="error-msg">${json.error}</div>`;
      }
      input.disabled = false;
      sendBtn.disabled = false;
      return;
    }
    thinking.textContent = json.understood || "Ton programme est prêt !";
    setTimeout(() => { window.location.href = "/dashboard.html"; }, 1200);
  } catch {
    thinking.remove();
    errorBox.innerHTML = `<div class="error-msg">Impossible de joindre le serveur.</div>`;
    input.disabled = false;
    sendBtn.disabled = false;
  }
}

document.getElementById("quiz-chat-send-btn")?.addEventListener("click", sendQuizAnswer);
document.getElementById("quiz-chat-input")?.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuizAnswer(); }
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
