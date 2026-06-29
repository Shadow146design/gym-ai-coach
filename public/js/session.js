// ── State ─────────────────────────────────────────────────
let program = null;
let selectedDay = null;
let recentLogs = {}; // { exercise_name: { weight, reps } }
let sessionLogs = []; // series loggées cette séance
let timerInterval = null;
let secondsElapsed = 0;
let sessionStarted = false;

// ── Initialisation ────────────────────────────────────────
async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");

  const [progRes, recentRes] = await Promise.all([
    fetch("/api/program/active"),
    fetch("/api/logs/recent"),
  ]);
  const { program: prog } = await progRes.json();
  const { recent } = await recentRes.json();

  document.getElementById("loading").classList.add("hidden");

  if (!prog) {
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("loading").innerHTML = `
      <h3>Pas de programme actif</h3>
      <p class="muted" style="margin-top:8px">Génère un programme d'abord.</p>
      <a class="btn btn-primary" href="/questionnaire.html" style="margin-top:18px">Créer mon programme</a>`;
    return;
  }

  program = prog;
  (recent || []).forEach(r => { recentLogs[r.exercise_name] = r; });

  buildDayPicker();
  document.getElementById("step-pick").classList.remove("hidden");
}

// ── Étape 1 : choisir le jour ─────────────────────────────
function buildDayPicker() {
  const grid = document.getElementById("day-pick-grid");
  (program.content.days || []).forEach((day, i) => {
    const card = document.createElement("label");
    card.className = "radio-card";
    card.innerHTML = `<input type="radio" name="day" value="${i}" ${i===0?"checked":""}>
      <div>
        <div style="font-weight:600;font-size:.92rem">${esc(day.day)}</div>
        <div style="font-size:.78rem;color:var(--chalk-dim)">${esc(day.focus||"")}</div>
      </div>`;
    card.addEventListener("change", () => {
      document.querySelectorAll(".radio-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
    });
    if (i === 0) card.classList.add("selected");
    grid.appendChild(card);
  });
}

document.getElementById("pick-day-btn").addEventListener("click", () => {
  const checked = document.querySelector('input[name="day"]:checked');
  if (!checked) return;
  selectedDay = program.content.days[parseInt(checked.value)];
  document.getElementById("step-pick").classList.add("hidden");
  startSession();
});

// ── Étape 2 : log rapide ──────────────────────────────────
function startSession() {
  document.getElementById("session-day-title").textContent = selectedDay.day;
  document.getElementById("session-day-focus").textContent = selectedDay.focus || "";

  const container = document.getElementById("session-exercises");
  container.innerHTML = "";

  (selectedDay.exercises || []).forEach((ex, ei) => {
    const recent = recentLogs[ex.name];
    const defaultWeight = recent ? recent.weight : "";
    const sets = ex.sets || 3;
    const repsHint = ex.reps || "?";

    const card = document.createElement("div");
    card.className = "session-exercise-card";
    card.dataset.exercise = ex.name;
    card.dataset.muscleGroup = ex.muscle_group || "";

    let setsHtml = "";
    for (let s = 1; s <= sets; s++) {
      const prevTxt = recent ? `${recent.weight}kg × ${recent.reps}` : "première fois";
      setsHtml += `
        <div class="set-row" data-set="${s}" data-ex="${ei}">
          <div class="set-num">${s}</div>
          <div>
            <input type="number" class="weight-input" step="0.5" min="0"
              value="${defaultWeight}" placeholder="kg"
              aria-label="Poids série ${s}" />
          </div>
          <div>
            <input type="number" class="reps-input" min="1"
              value="${recent ? recent.reps : ""}" placeholder="${repsHint} reps"
              aria-label="Reps série ${s}" />
          </div>
          <button class="done-btn" data-ex="${ei}" data-set="${s}" title="Valider la série">✓</button>
        </div>`;
    }

    card.innerHTML = `
      <div class="session-exercise-header">
        <div>
          <h3>${esc(ex.name)}</h3>
          <div style="font-size:.78rem;color:var(--chalk-dim);margin-top:2px">${sets} × ${repsHint} — repos ${ex.rest_seconds||"?"}s</div>
        </div>
        ${ex.muscle_group ? `<span class="muscle-tag">${esc(ex.muscle_group)}</span>` : ""}
      </div>
      <div style="padding:6px 18px 4px;font-size:.72rem;color:var(--chalk-dim);display:grid;grid-template-columns:32px 1fr 1fr auto;gap:8px">
        <span>#</span><span>Poids (kg)</span><span>Répétitions</span><span>✓</span>
      </div>
      <div style="font-size:.7rem;color:var(--chalk-dim);padding:0 18px 6px">Précédent : ${esc(prevTxt)}</div>
      ${setsHtml}`;

    container.appendChild(card);
  });

  // Boutons Valider série
  container.querySelectorAll(".done-btn").forEach(btn => {
    btn.addEventListener("click", () => completeSet(btn));
  });

  // Timer
  secondsElapsed = 0;
  sessionStarted = true;
  timerInterval = setInterval(() => {
    secondsElapsed++;
    const m = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
    const s = String(secondsElapsed % 60).padStart(2, "0");
    document.getElementById("session-timer").textContent = `${m}:${s}`;
  }, 1000);

  document.getElementById("step-session").classList.remove("hidden");
}

function completeSet(btn) {
  const row = btn.closest(".set-row");
  const card = btn.closest(".session-exercise-card");
  const weight = parseFloat(row.querySelector(".weight-input").value);
  const reps = parseInt(row.querySelector(".reps-input").value);

  if (isNaN(weight) || isNaN(reps) || reps < 1) {
    row.querySelector(".weight-input").focus();
    return;
  }

  btn.classList.add("checked");
  row.classList.add("completed");

  sessionLogs.push({
    exercise_name: card.dataset.exercise,
    muscle_group: card.dataset.muscleGroup,
    weight,
    reps,
    sets: 1,
  });
}

// ── Bouton Terminer ───────────────────────────────────────
document.getElementById("finish-btn").addEventListener("click", async () => {
  if (sessionLogs.length === 0) {
    alert("Valide au moins une série avant de terminer !");
    return;
  }
  clearInterval(timerInterval);

  // Enregistre toutes les séries en parallèle
  await Promise.all(
    sessionLogs.map(log =>
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      })
    )
  );

  document.getElementById("step-session").classList.add("hidden");
  await showRecap();
  document.getElementById("step-recap").classList.remove("hidden");
});

// ── Étape 3 : récap ───────────────────────────────────────
async function showRecap() {
  const [recapRes, volumeRes] = await Promise.all([
    fetch("/api/logs/recap"),
    fetch("/api/logs/volume"),
  ]);
  const { recap } = await recapRes.json();
  const { volume } = await volumeRes.json();

  // KPI
  const totalSets = recap.length;
  const totalVolume = recap.reduce((a, r) => a + r.weight * r.reps, 0);
  const prs = recap.filter(r => r.previous_weight === null || r.weight > r.previous_weight).length;
  const mins = Math.round(secondsElapsed / 60);

  document.getElementById("recap-stats").innerHTML = `
    <div class="kpi-tile"><div class="kpi-label">Séries</div><div class="kpi-value">${totalSets}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Volume total</div><div class="kpi-value">${Math.round(totalVolume)}<span style="font-size:.9rem"> kg</span></div></div>
    <div class="kpi-tile"><div class="kpi-label">Records 🏆</div><div class="kpi-value kpi-gold" style="color:var(--gold)">${prs}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Durée</div><div class="kpi-value">${mins}<span style="font-size:.9rem"> min</span></div></div>`;

  // Détail par exercice
  const byExercise = {};
  recap.forEach(r => {
    if (!byExercise[r.exercise_name]) byExercise[r.exercise_name] = { rows: [], prev: r.previous_weight };
    byExercise[r.exercise_name].rows.push(r);
  });

  const exContainer = document.getElementById("recap-exercises");
  exContainer.innerHTML = "";
  Object.entries(byExercise).forEach(([exName, { rows, prev }]) => {
    const bestWeight = Math.max(...rows.map(r => r.weight));
    const delta = prev !== null ? bestWeight - prev : null;

    let badge = "";
    if (delta === null) badge = `<span class="delta-badge new">Nouveau</span>`;
    else if (delta > 0) badge = `<span class="delta-badge up">▲ +${delta} kg</span>`;
    else if (delta < 0) badge = `<span class="delta-badge down">▼ ${delta} kg</span>`;
    else badge = `<span class="delta-badge same">= Même poids</span>`;

    const rowsHtml = rows.map(r => `
      <div class="recap-row">
        <span>${r.weight} kg × ${r.reps} reps</span>
        <span class="recap-meta mono">${new Date(r.performed_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
      </div>`).join("");

    const card = document.createElement("div");
    card.className = "recap-card";
    card.innerHTML = `
      <div class="recap-card-header">
        <span>${esc(exName)}</span>
        ${badge}
      </div>
      ${rowsHtml}`;
    exContainer.appendChild(card);
  });

  // Courbe de volume
  renderVolumeChart(volume);
}

function renderVolumeChart(volume) {
  const canvas = document.getElementById("volume-chart");
  if (typeof Chart === "undefined") {
    canvas.replaceWith(Object.assign(document.createElement("p"), {
      className: "muted", style: "margin-top:8px",
      textContent: "Le graphique ne peut pas se charger (bloqueur de contenu ?). Tes données sont bien enregistrées.",
    }));
    return;
  }
  if (!volume || volume.length < 2) {
    canvas.replaceWith(Object.assign(document.createElement("p"), {
      className: "muted", style: "margin-top:8px",
      textContent: "Reviens après ta 2ème séance pour voir la courbe de progression !",
    }));
    return;
  }

  const labels = volume.map(v => new Date(v.day).toLocaleDateString("fr-FR", {day:"2-digit",month:"2-digit"}));
  const data   = volume.map(v => Math.round(Number(v.volume)));

  new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Volume (kg)",
        data,
        borderColor: "#c94d28",
        backgroundColor: "rgba(201,77,40,.15)",
        pointBackgroundColor: "#e8b33d",
        pointBorderColor: "#e8b33d",
        pointRadius: 5,
        tension: .3,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#8f8b84", font: { family: "Inter", size: 11 } } },
      },
      scales: {
        x: { ticks: { color: "#8f8b84", font: { size: 11 } }, grid: { color: "rgba(237,232,223,.07)" } },
        y: { ticks: { color: "#8f8b84", font: { size: 11 } }, grid: { color: "rgba(237,232,223,.07)" } },
      },
    },
  });
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = String(str);
  return d.innerHTML;
}

init();
