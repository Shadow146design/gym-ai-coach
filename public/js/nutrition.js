let goals = null;
let logs = [];

function esc(s) { const d = document.createElement("div"); d.textContent = String(s || ""); return d.innerHTML; }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");

  const [goalsRes, logsRes] = await Promise.all([
    fetch("/api/nutrition/goals"),
    fetch("/api/nutrition"),
  ]);

  document.getElementById("nutrition-loading").classList.add("hidden");

  if (!goalsRes.ok) {
    document.getElementById("nutrition-incomplete").classList.remove("hidden");
    return;
  }

  ({ goals } = await goalsRes.json());
  ({ logs } = await logsRes.json());

  document.getElementById("nutrition-app").classList.remove("hidden");
  renderGoals();
  renderToday();
  renderChart();

  document.getElementById("nutrition-form").addEventListener("submit", saveToday);
}

function renderGoals() {
  document.getElementById("goal-label").textContent = goals.goalLabel;
  document.getElementById("nutrition-kpis").innerHTML = `
    <div class="kpi-tile"><div class="kpi-label">Calories</div><div class="kpi-value">${goals.calories}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Protéines</div><div class="kpi-value">${goals.proteins}<span style="font-size:.9rem"> g</span></div></div>
    <div class="kpi-tile"><div class="kpi-label">Glucides</div><div class="kpi-value">${goals.carbs}<span style="font-size:.9rem"> g</span></div></div>
    <div class="kpi-tile"><div class="kpi-label">Lipides</div><div class="kpi-value">${goals.fats}<span style="font-size:.9rem"> g</span></div></div>
    <div class="kpi-tile"><div class="kpi-label">TDEE estimé</div><div class="kpi-value">${goals.tdee}</div></div>`;
}

function todayLog() {
  return logs.find(l => l.date === todayStr()) || null;
}

function macroBar(label, value, target, unit) {
  const v = value == null ? 0 : Number(value);
  const pct = target > 0 ? Math.min(100, Math.round((v / target) * 100)) : 0;
  const over = target > 0 && v > target;
  return `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:5px">
        <span>${label}</span>
        <span class="${over ? "" : ""}" style="color:${over ? "var(--red)" : "var(--chalk-dim)"}">${v}${unit} / ${target}${unit}</span>
      </div>
      <div class="periodization-track">
        <div class="periodization-fill" style="width:${pct}%;background:${over ? "var(--red)" : "var(--green)"}"></div>
      </div>
    </div>`;
}

function renderToday() {
  const log = todayLog();

  document.getElementById("macro-bars").innerHTML =
    macroBar("Calories", log?.calories, goals.calories, " kcal") +
    macroBar("Protéines", log?.proteins, goals.proteins, "g") +
    macroBar("Glucides", log?.carbs, goals.carbs, "g") +
    macroBar("Lipides", log?.fats, goals.fats, "g");

  document.getElementById("in-calories").value = log?.calories ?? "";
  document.getElementById("in-proteins").value = log?.proteins ?? "";
  document.getElementById("in-carbs").value = log?.carbs ?? "";
  document.getElementById("in-fats").value = log?.fats ?? "";
  document.getElementById("in-notes").value = log?.notes ?? "";

  document.getElementById("nutrition-ai-message").textContent = dailyMessage(log);
}

// Message heuristique (pas d'appel IA pour un journal consulte a chaque
// chargement de page — la generation de plan repas via l'IA est reservee a
// la fonctionnalite 4, premium). Compare simplement l'entree du jour a l'objectif.
function dailyMessage(log) {
  if (!log || log.calories == null) {
    return "Tu n'as pas encore renseigné ton alimentation aujourd'hui. Prends 30 secondes pour logger tes calories et rester aligné avec ton objectif.";
  }
  const diff = log.calories - goals.calories;
  const diffPct = Math.abs(diff) / goals.calories;
  const lowProtein = log.proteins != null && log.proteins < goals.proteins * 0.8;

  let msg;
  if (diffPct <= 0.05) {
    msg = "Parfait, tu es exactement dans ta cible calorique aujourd'hui. Continue comme ça !";
  } else if (diff > 0) {
    msg = `Tu as dépassé ton objectif calorique de ${Math.round(diff)} kcal aujourd'hui. Pas de panique, ajuste légèrement demain si besoin.`;
  } else {
    msg = `Tu es en dessous de ton objectif calorique de ${Math.round(-diff)} kcal aujourd'hui. Assure-toi de manger suffisamment pour ne pas freiner ta récupération.`;
  }
  if (lowProtein) {
    msg += ` Ton apport en protéines (${log.proteins}g) est en dessous de ta cible (${goals.proteins}g) — pense à en ajouter pour la récupération musculaire.`;
  }
  return msg;
}

async function saveToday(e) {
  e.preventDefault();
  const status = document.getElementById("nutrition-save-status");
  status.textContent = "Enregistrement…";
  status.style.color = "";

  const body = {
    calories: document.getElementById("in-calories").value,
    proteins: document.getElementById("in-proteins").value,
    carbs: document.getElementById("in-carbs").value,
    fats: document.getElementById("in-fats").value,
    notes: document.getElementById("in-notes").value,
  };

  try {
    const res = await fetch("/api/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      status.textContent = data.error || "Erreur lors de l'enregistrement.";
      status.style.color = "var(--red)";
      return;
    }
    logs = logs.filter(l => l.date !== data.log.date);
    logs.push(data.log);
    logs.sort((a, b) => a.date.localeCompare(b.date));

    renderToday();
    renderChart();
    status.textContent = "✓ Enregistré";
    status.style.color = "var(--green)";
    setTimeout(() => { status.textContent = ""; }, 2500);
  } catch {
    status.textContent = "Impossible de joindre le serveur.";
    status.style.color = "var(--red)";
  }
}

function renderChart() {
  const canvas = document.getElementById("nutrition-chart");
  if (!canvas || typeof Chart === "undefined") return;

  if (canvas._chart) canvas._chart.destroy();

  const labels = logs.map(l => new Date(l.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }));
  canvas._chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Calories réelles",
          data: logs.map(l => l.calories),
          borderColor: "#c94d28",
          backgroundColor: "rgba(201,77,40,.15)",
          pointBackgroundColor: "#e8b33d",
          pointBorderColor: "#e8b33d",
          pointRadius: 4,
          tension: .3,
          fill: true,
          spanGaps: true,
        },
        {
          label: "Objectif",
          data: logs.map(() => goals.calories),
          borderColor: "#3da874",
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#8f8b84", font: { family: "Inter", size: 11 } } } },
      scales: {
        x: { ticks: { color: "#8f8b84" }, grid: { color: "rgba(237,232,223,.07)" } },
        y: { ticks: { color: "#8f8b84" }, grid: { color: "rgba(237,232,223,.07)" } },
      },
    },
  });
}

init();
