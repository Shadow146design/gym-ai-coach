let fullData = null;

function esc(s) { const d = document.createElement("div"); d.textContent = String(s || ""); return d.innerHTML; }
function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");

  const res = await fetch("/api/profile/full");
  if (!res.ok) return;
  fullData = await res.json();
  renderIdentity();
  renderPhysical();
  renderSubscription();
  renderAccounts();
  renderStats();
}

function renderIdentity() {
  const { user } = fullData;
  const avatarEl = document.getElementById("profile-avatar");
  avatarEl.innerHTML = user.avatar_url
    ? `<img src="${esc(user.avatar_url)}" style="width:100%;height:100%;object-fit:cover"/>`
    : initials(user.name);

  document.getElementById("profile-name-display").textContent = user.name;
  document.getElementById("profile-email-display").textContent = user.email;

  const badge = { premium: ["badge-premium", "Premium"], coach: ["badge-coach", "Coach"], admin: ["badge-admin", "Admin"] }[user.role];
  document.getElementById("profile-role-badge").innerHTML = badge
    ? `<span class="sidebar-badge ${badge[0]}">${badge[1]}</span>` : "";

  const since = new Date(user.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  document.getElementById("profile-since").textContent = `Membre depuis le ${since}`;

  document.getElementById("edit-name").value = user.name || "";
  document.getElementById("edit-avatar").value = user.avatar_url || "";
}

function renderPhysical() {
  const { user } = fullData;
  const form = document.getElementById("profile-form");
  ["weight_kg", "height_cm", "age", "gender", "activity_level"].forEach(field => {
    if (user[field] !== null && user[field] !== undefined) {
      form.elements[field].value = user[field];
    }
  });
  updateImc();
  form.elements.weight_kg.addEventListener("input", updateImc);
  form.elements.height_cm.addEventListener("input", updateImc);
}

function updateImc() {
  const form = document.getElementById("profile-form");
  const weight = parseFloat(form.elements.weight_kg.value);
  const height = parseFloat(form.elements.height_cm.value);
  const box = document.getElementById("imc-box");
  if (!weight || !height) { box.classList.add("hidden"); return; }
  const imc = weight / ((height / 100) ** 2);
  let label = "Poids normal";
  if (imc < 18.5) label = "Insuffisance pondérale";
  else if (imc >= 25 && imc < 30) label = "Surpoids";
  else if (imc >= 30) label = "Obésité";
  box.textContent = `IMC : ${imc.toFixed(1)} — ${label}`;
  box.classList.remove("hidden");
}

function renderSubscription() {
  const { subscription } = fullData;
  document.getElementById("sub-plan").textContent =
    subscription?.plan === "premium" ? "Premium ⭐" : subscription?.plan === "coach" ? "Coach 🎛️" : "Gratuit";
  if (subscription) {
    document.getElementById("sub-since-row").classList.remove("hidden");
    document.getElementById("sub-since").textContent =
      new Date(subscription.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
    document.getElementById("cancel-sub-btn").classList.remove("hidden");
  }
}

function renderAccounts() {
  const { user } = fullData;
  const el = document.getElementById("google-status");
  el.innerHTML = user.google_id
    ? `<span class="account-status connected"><span class="dot"></span>Connecté</span>`
    : `<a class="btn btn-ghost btn-sm" href="/auth/google">Se connecter avec Google</a>`;
}

function renderStats() {
  const { user, stats, activeProgram } = fullData;
  document.getElementById("stat-member-since").textContent =
    new Date(user.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  document.getElementById("stat-total-sessions").textContent = stats.totalSessions;
  document.getElementById("stat-streak").textContent = `${stats.streak} jour${stats.streak > 1 ? "s" : ""}`;
  document.getElementById("stat-best-streak").textContent = `${stats.bestStreak} jour${stats.bestStreak > 1 ? "s" : ""}`;
  document.getElementById("stat-program").innerHTML = activeProgram
    ? `<a href="/dashboard.html">${esc(activeProgram.title)}</a>` : "Aucun";
}

function toggleIdentityEdit() {
  document.getElementById("identity-edit").classList.toggle("hidden");
}

async function saveIdentity() {
  const msg = document.getElementById("identity-msg");
  const name = document.getElementById("edit-name").value;
  const avatar_url = document.getElementById("edit-avatar").value;
  msg.textContent = "Enregistrement…";
  try {
    const res = await fetch("/api/profile/identity", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, avatar_url }),
    });
    const json = await res.json();
    if (!res.ok) { msg.innerHTML = `<span style="color:var(--red)">${json.error}</span>`; return; }
    msg.innerHTML = `<span style="color:var(--green)">✓ Enregistré</span>`;
    setTimeout(() => window.location.reload(), 800);
  } catch {
    msg.innerHTML = `<span style="color:var(--red)">Impossible de joindre le serveur.</span>`;
  }
}

async function cancelSub() {
  if (!confirm("Annuler ton abonnement ? Tu repasseras en formule gratuite.")) return;
  const r = await fetch("/api/stripe/cancel-subscription", { method: "POST" }).then(r => r.json());
  if (!r.ok) return alert(r.error);
  alert("Abonnement annulé.");
  window.location.reload();
}

document.getElementById("profile-form").addEventListener("submit", async e => {
  e.preventDefault();
  const status = document.getElementById("save-status");
  const errorBox = document.getElementById("profile-error");
  errorBox.innerHTML = "";
  status.textContent = "Enregistrement…";

  const data = Object.fromEntries(new FormData(e.target).entries());

  try {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      errorBox.innerHTML = `<div class="error-msg">${json.error}</div>`;
      status.textContent = "";
      return;
    }
    status.textContent = "✓ Enregistré";
    setTimeout(() => { status.textContent = ""; }, 2500);
  } catch {
    errorBox.innerHTML = `<div class="error-msg">Impossible de joindre le serveur.</div>`;
    status.textContent = "";
  }
});

init();
