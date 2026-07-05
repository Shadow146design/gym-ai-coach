let chartInstance = null;
let radarInstance = null;

async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");

  const [dashRes, recordsRes, exercisesRes] = await Promise.all([
    fetch("/api/logs/dashboard-stats"),
    fetch("/api/logs/records"),
    fetch("/api/logs/exercises"),
  ]);
  loadWeekCompare();
  loadOneRm();
  const { totalSessions, avgSessionMinutes, weeklyFrequency, targetPerWeek, completionRate, muscleGroupVolume, lastSessionDate }
    = await dashRes.json();
  const { records } = await recordsRes.json();
  const { exercises } = await exercisesRes.json();

  if (!exercises.length) {
    document.getElementById("empty-state").classList.remove("hidden");
    document.getElementById("kpi-grid").classList.add("hidden");
    return;
  }

  // ── KPI globaux ──────────────────────────────────────────
  const lastDate = lastSessionDate ? new Date(lastSessionDate).toLocaleDateString("fr-FR") : "—";
  const completionTxt = completionRate !== null ? `${completionRate}%` : "—";
  const targetTxt = targetPerWeek ? `Objectif : ${targetPerWeek}j/sem` : "";

  document.getElementById("kpi-grid").innerHTML = `
    <div class="kpi-tile"><div class="kpi-label">Séances totales</div><div class="kpi-value">${totalSessions}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Durée moy.</div><div class="kpi-value">${avgSessionMinutes || "—"}<span style="font-size:.9rem"> min</span></div></div>
    <div class="kpi-tile"><div class="kpi-label">Assiduité (4 sem.)</div><div class="kpi-value" style="color:${completionRate>=80?"var(--green)":completionRate>=50?"var(--gold)":"var(--rust-soft)"}">${completionTxt}</div><div class="kpi-sub">${targetTxt}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Dernière séance</div><div class="kpi-value" style="font-size:1.2rem">${lastDate}</div></div>`;

  // ── Fréquence 4 semaines ─────────────────────────────────
  const maxFreq = Math.max(1, ...weeklyFrequency);
  const weekLabels = ["S-4","S-3","S-2","S-1"];
  document.getElementById("freq-chart").innerHTML = weeklyFrequency.map((v, i) => `
    <div class="freq-bar-wrap">
      <div class="freq-bar" style="height:${Math.round((v/maxFreq)*100)}%"></div>
      <span class="freq-label">${weekLabels[i]}<br><b style="color:var(--chalk)">${v}</b></span>
    </div>`).join("");

  // ── Volume musculaire ────────────────────────────────────
  const maxVol = Math.max(1, ...(muscleGroupVolume || []).map(m => m.volume));
  document.getElementById("muscle-bars").innerHTML = (muscleGroupVolume || []).slice(0, 6).map(m => `
    <div class="muscle-bar-row">
      <span class="muscle-bar-label">${esc(m.muscle_group)}</span>
      <div class="muscle-bar-track"><div class="muscle-bar-fill" style="width:${Math.round((m.volume/maxVol)*100)}%"></div></div>
      <span class="muscle-bar-val">${Math.round(m.volume/1000)}k kg</span>
    </div>`).join("") || `<p class="muted" style="font-size:.85rem">Pas encore de données par groupe musculaire.</p>`;

  renderMuscleRadar(muscleGroupVolume || []);

  // ── Records persos ───────────────────────────────────────
  document.getElementById("records-grid").innerHTML = records.map(r => `
    <div class="record-tile">
      <div class="rec-ex">${esc(r.exercise_name)}</div>
      <div class="rec-val">${Number(r.max_weight)} kg</div>
    </div>`).join("");

  // ── Sélecteur exercice + courbe ──────────────────────────
  const select = document.getElementById("exercise-select");
  select.innerHTML = exercises.map(e => `<option value="${esc(e)}">${esc(e)}</option>`).join("");
  select.addEventListener("change", () => loadProgressChart(select.value));
  loadProgressChart(exercises[0]);
}

async function loadProgressChart(exerciseName) {
  const res = await fetch(`/api/logs?exercise=${encodeURIComponent(exerciseName)}`);
  const { logs } = await res.json();

  const labels  = logs.map(l => new Date(l.performed_at).toLocaleDateString("fr-FR", {day:"2-digit",month:"2-digit"}));
  const weights = logs.map(l => Number(l.weight));
  const canvas  = document.getElementById("progress-chart");

  if (typeof Chart === "undefined") {
    canvas.replaceWith(Object.assign(document.createElement("p"), {
      className: "muted",
      textContent: "Le graphique ne peut pas se charger. Tes données sont bien présentes.",
    }));
    return;
  }
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: `${exerciseName} (kg)`,
        data: weights,
        borderColor: "#7aa8b8",
        backgroundColor: "rgba(122,168,184,.15)",
        pointBackgroundColor: "#e8b33d",
        pointBorderColor: "#e8b33d",
        pointRadius: 5,
        tension: .3,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#8f8b84", font: { family: "Inter", size: 11 } } } },
      scales: {
        x: { ticks: { color: "#8f8b84", font: { size: 11 } }, grid: { color: "rgba(237,232,223,.07)" } },
        y: { ticks: { color: "#8f8b84", font: { size: 11 } }, grid: { color: "rgba(237,232,223,.07)" } },
      },
    },
  });
}

function renderMuscleRadar(muscleGroupVolume) {
  const canvas = document.getElementById("muscle-radar");
  if (typeof Chart === "undefined" || !canvas) return;
  if (radarInstance) radarInstance.destroy();

  const groups = ["Poitrine", "Dos", "Épaules", "Biceps", "Triceps", "Jambes", "Fessiers", "Abdos"];
  const volByGroup = {};
  muscleGroupVolume.forEach(m => { volByGroup[m.muscle_group] = Number(m.volume); });
  const data = groups.map(g => volByGroup[g] || 0);

  if (!data.some(v => v > 0)) {
    canvas.replaceWith(Object.assign(document.createElement("p"), {
      className: "muted",
      textContent: "Pas encore assez de données pour le radar musculaire.",
    }));
    return;
  }

  radarInstance = new Chart(canvas, {
    type: "radar",
    data: {
      labels: groups,
      datasets: [{
        label: "Volume 30j (kg)",
        data,
        borderColor: "#e56a44",
        backgroundColor: "rgba(201,77,40,.18)",
        pointBackgroundColor: "#e8b33d",
        pointBorderColor: "#e8b33d",
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#8f8b84", font: { family: "Inter", size: 11 } } } },
      scales: {
        r: {
          angleLines: { color: "rgba(255,255,255,.08)" },
          grid: { color: "rgba(255,255,255,.08)" },
          pointLabels: { color: "#c9c6c1", font: { size: 11 } },
          ticks: { display: false },
        },
      },
    },
  });
}

async function loadOneRm() {
  const el = document.getElementById("one-rm-list");
  try {
    const r = await fetch("/api/logs/one-rm").then(r => r.json());
    const list = r.one_rm || [];
    if (!list.length) { el.innerHTML = `<p class="muted" style="font-size:.85rem">Pas encore de données.</p>`; return; }
    el.innerHTML = list.slice(0, 8).map(x => `
      <div class="home-record-row">
        <span>${esc(x.exercise_name)}</span>
        <span class="home-record-val">${x.one_rm} kg</span>
      </div>`).join("");
  } catch { el.innerHTML = `<p class="muted" style="font-size:.85rem">Impossible de charger.</p>`; }
}

async function loadWeekCompare() {
  const el = document.getElementById("week-compare");
  try {
    const r = await fetch("/api/logs/weekly").then(r => r.json());
    const weeks = r.weeks || [];
    if (weeks.length < 2) return;
    const [thisWeek, lastWeek] = weeks;
    const sessDiff = thisWeek.sessions - lastWeek.sessions;
    const volDiff = Math.round(thisWeek.volume - lastWeek.volume);
    const arrow = n => n > 0 ? `<span style="color:var(--green)">▲ +${n}</span>` : n < 0 ? `<span style="color:var(--red)">▼ ${n}</span>` : `<span class="muted">= stable</span>`;

    el.innerHTML = `
      <span class="week-compare-label">Vs semaine précédente :</span>
      <span>${thisWeek.sessions} séance${thisWeek.sessions > 1 ? "s" : ""} (${arrow(sessDiff)})</span>
      <span class="week-compare-sep">•</span>
      <span>${Math.round(thisWeek.volume)} kg de volume (${arrow(volDiff)})</span>`;
    el.classList.remove("hidden");
  } catch {}
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

init();
