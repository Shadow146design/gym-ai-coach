// ── Theme ─────────────────────────────────────────────────
const html = document.documentElement;
const themeBtn = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("theme") || "dark";
html.setAttribute("data-theme", savedTheme);
if (themeBtn) {
  themeBtn.textContent = savedTheme === "dark" ? "☀️" : "🌙";
  themeBtn.addEventListener("click", () => {
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    themeBtn.textContent = next === "dark" ? "☀️" : "🌙";
  });
}

// ── Redirige si déjà connecté ─────────────────────────────
fetch("/api/auth/me")
  .then(r => r.ok ? (window.location.href = "/home.html") : null)
  .catch(() => {});

// ── Erreur OAuth (Google) ─────────────────────────────────
const urlError = new URLSearchParams(window.location.search).get("error");
if (urlError) {
  const el = document.getElementById("oauth-error");
  if (el) {
    el.textContent = urlError === "google_denied" ? "Connexion Google annulée."
      : "Erreur de connexion avec Google. Réessaie.";
    el.classList.remove("hidden");
  }
}

// ── Tabs ──────────────────────────────────────────────────
const loginTab    = document.querySelector('[data-tab="login"]');
const registerTab = document.querySelector('[data-tab="register"]');
const loginForm   = document.getElementById("login-form");
const registerForm= document.getElementById("register-form");

loginTab?.addEventListener("click", () => {
  loginTab.classList.add("active"); registerTab.classList.remove("active");
  loginForm.classList.remove("hidden"); registerForm.classList.add("hidden");
});
registerTab?.addEventListener("click", () => {
  registerTab.classList.add("active"); loginTab.classList.remove("active");
  registerForm.classList.remove("hidden"); loginForm.classList.add("hidden");
});

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="error-msg">${msg}</div>`;
}

loginForm?.addEventListener("submit", async e => {
  e.preventDefault();
  document.getElementById("login-error").innerHTML = "";
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: document.getElementById("login-email").value, password: document.getElementById("login-password").value }),
    });
    const data = await res.json();
    if (!res.ok) return showError("login-error", data.error);
    window.location.href = "/home.html";
  } catch { showError("login-error", "Impossible de joindre le serveur."); }
});

registerForm?.addEventListener("submit", async e => {
  e.preventDefault();
  document.getElementById("register-error").innerHTML = "";
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("reg-name").value,
        email: document.getElementById("reg-email").value,
        password: document.getElementById("reg-password").value,
      }),
    });
    const data = await res.json();
    if (!res.ok) return showError("register-error", data.error);
    window.location.href = "/questionnaire.html";
  } catch { showError("register-error", "Impossible de joindre le serveur."); }
});
