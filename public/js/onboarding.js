fetch("/api/auth/me").then(r => { if (!r.ok) window.location.href = "/"; });

function goToStep(n) {
  [1, 2, 3].forEach(i => {
    document.getElementById(`panel-${i}`).classList.toggle("hidden", i !== n);
    const indicator = document.getElementById(`step-indicator-${i}`);
    indicator.classList.toggle("active", i === n);
    indicator.classList.toggle("done", i < n);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Étape 1 : profil physique ──────────────────────────────
document.getElementById("profile-form").addEventListener("submit", async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {}
  goToStep(2);
});

// ── Étape 2 : questionnaire ─────────────────────────────────
document.querySelectorAll(".radio-grid").forEach(group => {
  group.addEventListener("change", () => {
    group.querySelectorAll(".radio-card").forEach(card => {
      card.classList.toggle("selected", card.querySelector("input").checked);
    });
  });
});

const quizForm = document.getElementById("quiz-form");
const quizSubmitBtn = document.getElementById("quiz-submit-btn");
const quizError = document.getElementById("quiz-error");

quizForm.addEventListener("submit", async e => {
  e.preventDefault();
  quizError.innerHTML = "";
  quizSubmitBtn.disabled = true;
  quizSubmitBtn.textContent = "L'IA construit ton programme… ✨";

  const data = Object.fromEntries(new FormData(quizForm).entries());

  try {
    const res = await fetch("/api/program/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      quizError.innerHTML = `<div class="error-msg">${json.error}</div>`;
      quizSubmitBtn.disabled = false;
      quizSubmitBtn.textContent = "Générer mon programme ✨";
      return;
    }
    document.getElementById("program-summary-preview").textContent =
      `« ${json.program.title} » — ${(json.program.content.days || []).length} jours par semaine, prêt à démarrer.`;
    goToStep(3);
  } catch {
    quizError.innerHTML = `<div class="error-msg">Impossible de joindre le serveur.</div>`;
    quizSubmitBtn.disabled = false;
    quizSubmitBtn.textContent = "Générer mon programme ✨";
  }
});
