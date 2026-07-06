let fullData = null;
let weightChartInstance = null;

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
  renderGoals();
  renderSubscription();
  renderAccounts();
  renderStats();
  loadWeightChart();
  loadBadges();
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

function renderGoals() {
  const { user } = fullData;
  const form = document.getElementById("goals-form");
  form.elements.main_goal.value = user.main_goal || "";
  form.elements.personal_note.value = user.personal_note || "";
  form.elements.goal_date.value = user.goal_date || "";
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
    : `<a class="btn btn-ghost btn-sm" href="/auth/google" rel="noopener noreferrer">Se connecter avec Google</a>`;
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

// Redimensionne l'image cote client (max 300px, JPEG) avant de l'envoyer en
// base64 : evite de stocker/transferer des photos brutes de plusieurs Mo.
function resizeImageToDataUrl(file, maxSize = 300, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      img.onerror = () => reject(new Error("Image invalide."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function saveIdentity() {
  const msg = document.getElementById("identity-msg");
  const name = document.getElementById("edit-name").value;
  const file = document.getElementById("edit-avatar-file").files[0];
  let avatar_url = document.getElementById("edit-avatar").value;

  if (file) {
    msg.textContent = "Traitement de l'image…";
    try {
      avatar_url = await resizeImageToDataUrl(file);
    } catch {
      msg.innerHTML = `<span style="color:var(--red)">Impossible de traiter cette image.</span>`;
      return;
    }
  }

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

async function loadWeightChart() {
  const canvas = document.getElementById("weight-chart");
  const empty = document.getElementById("weight-empty");
  const goalStatus = document.getElementById("weight-goal-status");
  const targetWeight = fullData?.user?.target_weight_kg ? Number(fullData.user.target_weight_kg) : null;

  try {
    const r = await fetch("/api/weight").then(r => r.json());
    const logs = r.logs || [];

    if (!logs.length) {
      canvas.classList.add("hidden");
      empty.classList.remove("hidden");
    } else {
      canvas.classList.remove("hidden");
      empty.classList.add("hidden");
      renderWeightChart(logs, targetWeight);
    }

    if (targetWeight && logs.length) {
      const current = Number(logs[logs.length - 1].weight_kg);
      const diff = current - targetWeight;
      if (Math.abs(diff) < 0.1) {
        goalStatus.textContent = "🎉 Objectif de poids atteint !";
      } else if (diff > 0) {
        goalStatus.textContent = `Il te reste ${diff.toFixed(1)} kg à perdre pour atteindre ton objectif (${targetWeight} kg).`;
      } else {
        goalStatus.textContent = `Il te reste ${Math.abs(diff).toFixed(1)} kg à prendre pour atteindre ton objectif (${targetWeight} kg).`;
      }
      goalStatus.classList.remove("hidden");
    } else {
      goalStatus.classList.add("hidden");
    }
  } catch {
    canvas.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.textContent = "Impossible de charger le suivi du poids.";
  }
}

function renderWeightChart(logs, targetWeight) {
  const canvas = document.getElementById("weight-chart");
  if (typeof Chart === "undefined") return;
  if (weightChartInstance) weightChartInstance.destroy();

  const labels = logs.map(l => new Date(l.measured_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }));
  const weights = logs.map(l => Number(l.weight_kg));

  const datasets = [{
    label: "Poids (kg)",
    data: weights,
    borderColor: "#7aa8b8",
    backgroundColor: "rgba(122,168,184,.15)",
    pointBackgroundColor: "#e8b33d",
    pointBorderColor: "#e8b33d",
    pointRadius: 4,
    tension: .3,
    fill: true,
  }];

  if (targetWeight) {
    datasets.push({
      label: "Objectif (kg)",
      data: labels.map(() => targetWeight),
      borderColor: "#e56a44",
      borderDash: [6, 6],
      pointRadius: 0,
      fill: false,
    });
  }

  weightChartInstance = new Chart(canvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#8f8b84", font: { family: "Inter", size: 11 } } } },
      scales: {
        x: { ticks: { color: "#8f8b84", font: { size: 11 } }, grid: { color: "rgba(255,255,255,.07)" } },
        y: { ticks: { color: "#8f8b84", font: { size: 11 } }, grid: { color: "rgba(255,255,255,.07)" } },
      },
    },
  });
}

document.getElementById("weight-form").addEventListener("submit", async e => {
  e.preventDefault();
  const status = document.getElementById("weight-save-status");
  const input = document.getElementById("weight-input");
  const weight_kg = parseFloat(input.value);
  if (!weight_kg) return;

  status.textContent = "Enregistrement…";
  try {
    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight_kg }),
    });
    const json = await res.json();
    if (!res.ok) { status.innerHTML = `<span style="color:var(--red)">${json.error}</span>`; return; }
    input.value = "";
    status.innerHTML = `<span style="color:var(--green)">✓ Ajouté</span>`;
    setTimeout(() => { status.textContent = ""; }, 2000);
    loadWeightChart();
  } catch {
    status.innerHTML = `<span style="color:var(--red)">Impossible de joindre le serveur.</span>`;
  }
});

async function loadBadges() {
  const grid = document.getElementById("badges-grid");
  try {
    const r = await fetch("/api/badges").then(r => r.json());
    document.getElementById("badges-count").textContent = `${r.unlockedCount}/${r.total} débloqués`;
    grid.innerHTML = r.badges.map(b => `
      <div class="badge-tile${b.unlocked ? " unlocked" : ""}" title="${esc(b.desc)}">
        <div class="badge-tile-icon">${b.icon}</div>
        <div class="badge-tile-title">${esc(b.title)}</div>
        <div class="badge-tile-track"><div class="badge-tile-fill" style="width:${Math.round((b.current / b.target) * 100)}%"></div></div>
      </div>`).join("");
  } catch {
    grid.innerHTML = `<p class="muted" style="font-size:.85rem">Impossible de charger les badges.</p>`;
  }
}

init();
