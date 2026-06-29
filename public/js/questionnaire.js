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
      errorBox.innerHTML = `<div class="error-msg">${json.error}</div>`;
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
