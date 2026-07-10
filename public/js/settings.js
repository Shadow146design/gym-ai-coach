function setTheme(theme) {
  localStorage.setItem("theme", theme);
  document.documentElement.setAttribute("data-theme", window.resolveTheme ? window.resolveTheme(theme) : theme);
  updateThemeButtons(theme);
}

function updateThemeButtons(theme) {
  document.getElementById("theme-dark-btn").classList.toggle("btn-primary", theme === "dark");
  document.getElementById("theme-dark-btn").classList.toggle("btn-ghost", theme !== "dark");
  document.getElementById("theme-light-btn").classList.toggle("btn-primary", theme === "light");
  document.getElementById("theme-light-btn").classList.toggle("btn-ghost", theme !== "light");
  document.getElementById("theme-system-btn").classList.toggle("btn-primary", theme === "system");
  document.getElementById("theme-system-btn").classList.toggle("btn-ghost", theme !== "system");
}

function setLanguage(lang) {
  window.i18n?.setLang(lang);
  updateLangButtons(lang);
}

function updateLangButtons(lang) {
  document.getElementById("lang-fr-btn").classList.toggle("btn-primary", lang === "fr");
  document.getElementById("lang-fr-btn").classList.toggle("btn-ghost", lang !== "fr");
  document.getElementById("lang-en-btn").classList.toggle("btn-primary", lang === "en");
  document.getElementById("lang-en-btn").classList.toggle("btn-ghost", lang !== "en");
}

// Si la langue change depuis un autre endroit de la page (ex: toggle sidebar),
// garde les boutons de cette section synchronises.
document.addEventListener("langchange", e => updateLangButtons(e.detail.lang));

async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");

  updateThemeButtons(localStorage.getItem("theme") || "dark");
  updateLangButtons(window.i18n ? window.i18n.getLang() : "fr");

  const notifToggle = document.getElementById("notif-coach-msg");
  notifToggle.checked = localStorage.getItem("notifCoachMsg") !== "false";
  notifToggle.addEventListener("change", () => localStorage.setItem("notifCoachMsg", notifToggle.checked));

  const streakToggle = document.getElementById("notif-streak-reminder");
  streakToggle.checked = localStorage.getItem("notifStreakReminder") !== "false";
  streakToggle.addEventListener("change", () => localStorage.setItem("notifStreakReminder", streakToggle.checked));

  const newsletterToggle = document.getElementById("notif-newsletter");
  newsletterToggle.checked = localStorage.getItem("notifNewsletter") === "true";
  newsletterToggle.addEventListener("change", () => localStorage.setItem("notifNewsletter", newsletterToggle.checked));

  await loadProfileData();
}

async function loadProfileData() {
  try {
    const res = await fetch("/api/profile/full");
    if (!res.ok) return;
    const { user, subscription } = await res.json();

    const form = document.getElementById("goals-form");
    form.elements.main_goal.value = user.main_goal || "";
    form.elements.goal_date.value = user.goal_date || "";
    form.elements.target_weight_kg.value = user.target_weight_kg || "";

    document.getElementById("privacy-profile").checked = user.profile_visible_to_coaches !== false;
    document.getElementById("privacy-stats").checked = user.stats_visible_to_coaches !== false;
    document.getElementById("privacy-public-profile").checked = !!user.public_profile;
    document.getElementById("notif-email-msg").checked = user.notify_email_messages !== false;
    renderPublicProfileLink(user);

    renderGoogleStatus(user);

    document.getElementById("sub-plan").textContent =
      subscription?.plan === "premium" ? "Premium ⭐" : subscription?.plan === "coach" ? "Coach 🎛️" : "Gratuit";
  } catch {}
}

function renderPublicProfileLink(user) {
  const el = document.getElementById("public-profile-link");
  if (!user.public_profile || !user.username) { el.innerHTML = ""; return; }
  const url = `${window.location.origin}/u/${user.username}`;
  el.innerHTML = `Ton profil public : <a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--rust-soft)">${url}</a>`;
}

async function savePublicProfile() {
  const checked = document.getElementById("privacy-public-profile").checked;
  try {
    const res = await fetch("/api/profile/public-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_profile: checked }),
    });
    const json = await res.json();
    if (res.ok) renderPublicProfileLink({ public_profile: json.public_profile, username: json.username });
  } catch {}
}
document.getElementById("privacy-public-profile").addEventListener("change", savePublicProfile);

function renderGoogleStatus(user) {
  const el = document.getElementById("google-status");
  if (user.google_id) {
    el.innerHTML = `<span class="account-status connected"><span class="dot"></span>Connecté</span>
      <button class="btn btn-ghost btn-sm" type="button" onclick="unlinkGoogle()" style="margin-left:10px">Délier</button>`;
  } else {
    el.innerHTML = `<a class="btn btn-ghost btn-sm" href="/auth/google" rel="noopener noreferrer">Se connecter avec Google</a>`;
  }
}

async function unlinkGoogle() {
  if (!confirm("Délier ton compte Google ? Tu devras utiliser ton mot de passe pour te reconnecter.")) return;
  try {
    const res = await fetch("/api/profile/unlink-google", { method: "POST" });
    const json = await res.json();
    if (!res.ok) return alert(json.error);
    loadProfileData();
  } catch {
    alert("Impossible de joindre le serveur.");
  }
}

document.getElementById("goals-form").addEventListener("submit", async e => {
  e.preventDefault();
  const status = document.getElementById("goals-save-status");
  status.textContent = "Enregistrement…";

  const data = Object.fromEntries(new FormData(e.target).entries());

  try {
    const res = await fetch("/api/profile/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      status.innerHTML = `<span style="color:var(--red)">${json.error}</span>`;
      return;
    }
    status.innerHTML = `<span style="color:var(--green)">✓ Enregistré</span>`;
    setTimeout(() => { status.textContent = ""; }, 2500);
  } catch {
    status.innerHTML = `<span style="color:var(--red)">Impossible de joindre le serveur.</span>`;
  }
});

async function savePrivacy() {
  const profile_visible_to_coaches = document.getElementById("privacy-profile").checked;
  const stats_visible_to_coaches = document.getElementById("privacy-stats").checked;
  try {
    await fetch("/api/profile/privacy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_visible_to_coaches, stats_visible_to_coaches }),
    });
  } catch {}
}
document.getElementById("privacy-profile").addEventListener("change", savePrivacy);
document.getElementById("privacy-stats").addEventListener("change", savePrivacy);

document.getElementById("notif-email-msg").addEventListener("change", async e => {
  try {
    await fetch("/api/profile/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notify_email_messages: e.target.checked }),
    });
  } catch {}
});

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

async function exportDataCsv() {
  const msg = document.getElementById("data-msg");
  try {
    const res = await fetch("/api/logs/export.csv");
    if (!res.ok) { msg.innerHTML = `<span style="color:var(--red)">Erreur lors de l'export.</span>`; return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "historique-seances.csv";
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
