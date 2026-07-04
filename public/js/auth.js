const html = document.documentElement;
const themeBtn = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("theme") || "dark";
html.setAttribute("data-theme", savedTheme);
if (themeBtn) {
  themeBtn.textContent = savedTheme === "dark" ? "☀️" : "🌙";
  themeBtn.addEventListener("click", () => {
    const t = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
    themeBtn.textContent = t === "dark" ? "☀️" : "🌙";
  });
}

// Redirige si déjà connecté
fetch("/api/auth/me")
  .then(r => r.ok ? window.location.href = "/home.html" : null)
  .catch(() => {});

// Erreur OAuth
const urlParams = new URLSearchParams(window.location.search);
const oauthErr = urlParams.get("error");
if (oauthErr) {
  const el = document.getElementById("oauth-error");
  if (el) {
    const msgs = {
      google_denied: "Connexion Google annulée.",
      google_token: "Erreur d'authentification Google. Réessaie.",
      google_user: "Impossible de récupérer ton compte Google.",
      google_server: "Erreur serveur Google OAuth. Vérifie que les variables GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont bien ajoutées sur Render.",
      google_not_configured: "Google OAuth non configuré sur le serveur.",
    };
    el.textContent = msgs[oauthErr] || "Erreur de connexion.";
    el.classList.remove("hidden");
  }
}

// Tabs
const loginTab = document.querySelector('[data-tab="login"]');
const regTab   = document.querySelector('[data-tab="register"]');
const loginForm= document.getElementById("login-form");
const regForm  = document.getElementById("register-form");

loginTab?.addEventListener("click", () => {
  loginTab.classList.add("active"); regTab.classList.remove("active");
  loginForm.classList.remove("hidden"); regForm.classList.add("hidden");
});
regTab?.addEventListener("click", () => {
  regTab.classList.add("active"); loginTab.classList.remove("active");
  regForm.classList.remove("hidden"); loginForm.classList.add("hidden");
});

function showErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="error-msg">${msg}</div>`;
}

loginForm?.addEventListener("submit", async e => {
  e.preventDefault();
  document.getElementById("login-error").innerHTML = "";
  try {
    const r = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginForm.querySelector("#login-email").value, password: loginForm.querySelector("#login-password").value }),
    });
    const d = await r.json();
    if (!r.ok) return showErr("login-error", d.error);
    window.location.href = "/home.html";
  } catch { showErr("login-error", "Impossible de joindre le serveur."); }
});

regForm?.addEventListener("submit", async e => {
  e.preventDefault();
  document.getElementById("register-error").innerHTML = "";
  try {
    const r = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: regForm.querySelector("#reg-name").value,
        email: regForm.querySelector("#reg-email").value,
        password: regForm.querySelector("#reg-password").value,
      }),
    });
    const d = await r.json();
    if (!r.ok) return showErr("register-error", d.error);
    window.location.href = "/questionnaire.html";
  } catch { showErr("register-error", "Impossible de joindre le serveur."); }
});
