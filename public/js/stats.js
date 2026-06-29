let chartInstance = null;

async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");

  const [dashRes, recordsRes, exercisesRes] = await Promise.all([
    fetch("/api/logs/dashboard-stats"),
    fetch("/api/logs/records"),
    fetch("/api/logs/exercises"),
  ]);
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

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

document.getElementById("logout-link").addEventListener("click", async e => {
  e.preventDefault();
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
});

init();
