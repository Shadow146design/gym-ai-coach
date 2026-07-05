function setTheme(theme) {
  localStorage.setItem("theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeButtons(theme);
}

function updateThemeButtons(theme) {
  document.getElementById("theme-dark-btn").classList.toggle("btn-primary", theme === "dark");
  document.getElementById("theme-dark-btn").classList.toggle("btn-ghost", theme !== "dark");
  document.getElementById("theme-light-btn").classList.toggle("btn-primary", theme === "light");
  document.getElementById("theme-light-btn").classList.toggle("btn-ghost", theme !== "light");
}

async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");
  updateThemeButtons(localStorage.getItem("theme") || "dark");

  const notifToggle = document.getElementById("email-notif-toggle");
  notifToggle.checked = localStorage.getItem("emailNotif") === "true";
  notifToggle.addEventListener("change", () => {
    localStorage.setItem("emailNotif", notifToggle.checked);
  });
}

document.getElementById("password-form").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = document.getElementById("password-msg");
  const oldPassword = document.getElementById("old-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (newPassword !== confirmPassword) {
    msg.innerHTML = `<span style="color:var(--red)">Les nouveaux mots de passe ne correspondent pas.</span>`;
    return;
  }

  msg.textContent = "Enregistrement…";
  try {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const json = await res.json();
    if (!res.ok) { msg.innerHTML = `<span style="color:var(--red)">${json.error}</span>`; return; }
    msg.innerHTML = `<span style="color:var(--green)">✓ Mot de passe modifié</span>`;
    e.target.reset();
  } catch {
    msg.innerHTML = `<span style="color:var(--red)">Impossible de joindre le serveur.</span>`;
  }
});

async function exportData() {
  const msg = document.getElementById("data-msg");
  try {
    const res = await fetch("/api/logs/export");
    if (!res.ok) { msg.innerHTML = `<span style="color:var(--red)">Erreur lors de l'export.</span>`; return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "historique-seances.json";
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    msg.innerHTML = `<span style="color:var(--red)">Impossible de joindre le serveur.</span>`;
  }
}

async function clearHistory() {
  if (!confirm("Effacer tout ton historique de séances ? Cette action est irréversible.")) return;
  const msg = document.getElementById("data-msg");
  try {
    const res = await fetch("/api/logs/all", { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { msg.innerHTML = `<span style="color:var(--red)">${json.error}</span>`; return; }
    msg.innerHTML = `<span style="color:var(--green)">✓ Historique effacé</span>`;
  } catch {
    msg.innerHTML = `<span style="color:var(--red)">Impossible de joindre le serveur.</span>`;
  }
}

async function deleteAccount() {
  const msg = document.getElementById("delete-msg");
  const confirmInput = document.getElementById("delete-confirm").value;
  if (confirmInput !== "SUPPRIMER") {
    msg.innerHTML = `<span style="color:var(--red)">Tape SUPPRIMER pour confirmer.</span>`;
    return;
  }
  if (!confirm("Dernière confirmation : supprimer définitivement ton compte ?")) return;

  try {
    const res = await fetch("/api/auth/account", { method: "DELETE" });
    if (!res.ok) { msg.innerHTML = `<span style="color:var(--red)">Erreur lors de la suppression.</span>`; return; }
    window.location.href = "/";
  } catch {
    msg.innerHTML = `<span style="color:var(--red)">Impossible de joindre le serveur.</span>`;
  }
}

init();
