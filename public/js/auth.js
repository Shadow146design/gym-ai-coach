const loginTab = document.querySelector('[data-tab="login"]');
const registerTab = document.querySelector('[data-tab="register"]');
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

// Si deja connecte, direction le dashboard
fetch("/api/auth/me")
  .then((r) => (r.ok ? (window.location.href = "/dashboard.html") : null))
  .catch(() => {});

loginTab?.addEventListener("click", () => {
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
});

registerTab?.addEventListener("click", () => {
  registerTab.classList.add("active");
  loginTab.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
});

function showError(elId, message) {
  const el = document.getElementById(elId);
  el.innerHTML = `<div class="error-msg">${message}</div>`;
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("login-error").innerHTML = "";
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return showError("login-error", data.error);
    window.location.href = "/dashboard.html";
  } catch {
    showError("login-error", "Impossible de joindre le serveur.");
  }
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("register-error").innerHTML = "";
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) return showError("register-error", data.error);
    window.location.href = "/questionnaire.html";
  } catch {
    showError("register-error", "Impossible de joindre le serveur.");
  }
});
