let chartInstance = null;
let radarInstance = null;
const shareData = {};

async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");
  const { user } = await meRes.json();
  shareData.name = user.name;
  const isFree = user.role === "user";

  if (isFree) {
    const desc = "Les courbes de fréquence, volumes par groupe musculaire, répartition musculaire et estimation 1RM sont réservées aux membres Premium.";
    lockSection(document.getElementById("freq-card"), { title: "Fréquence — Premium", desc });
    lockSection(document.getElementById("muscle-bars-card"), { title: "Volume musculaire — Premium", desc });
    lockSection(document.getElementById("radar-card"), { title: "Répartition musculaire — Premium", desc });
    lockSection(document.getElementById("onerm-card"), { title: "Estimation 1RM — Premium", desc });
    lockSection(document.getElementById("progress-card"), { title: "Courbe de progression — Premium", desc });
  } else {
    loadOneRm();
  }

  const [dashRes, recordsRes, exercisesRes, streakRes, weeklyRes] = await Promise.all([
    fetch("/api/logs/dashboard-stats"),
    fetch("/api/logs/records"),
    fetch("/api/logs/exercises"),
    fetch("/api/logs/streak"),
    fetch("/api/logs/weekly"),
  ]);
  loadWeekCompare();
  const { totalSessions, totalVolume, weeklyFrequency, targetPerWeek, completionRate, muscleGroupVolume, lastSessionDate }
    = await dashRes.json();
  const { records } = await recordsRes.json();
  const { exercises } = await exercisesRes.json();
  const { current: streak, best: bestStreak } = await streakRes.json();
  const { weeks: compareWeeks } = await weeklyRes.json();

  shareData.totalSessions = totalSessions;
  shareData.streak = streak || 0;
  shareData.topRecord = records[0] || null;

  if (!exercises.length) {
    document.getElementById("empty-state").classList.remove("hidden");
    document.getElementById("kpi-grid").classList.add("hidden");
    return;
  }

  // ── KPI globaux (4 metriques cles + tendance vs semaine precedente) ──
  const [thisWeek, lastWeek] = compareWeeks || [];
  const volTrend = thisWeek && lastWeek ? Math.round(Number(thisWeek.volume) - Number(lastWeek.volume)) : null;
  const volTrendHtml = volTrend == null ? "" :
    volTrend > 0 ? `<span style="color:var(--green)">▲</span>` : volTrend < 0 ? `<span style="color:var(--red)">▼</span>` : `<span class="muted">=</span>`;

  document.getElementById("kpi-grid").innerHTML = `
    <div class="kpi-tile"><div class="kpi-icon">📊</div><div class="kpi-label">Total séances</div><div class="kpi-value">${totalSessions}</div></div>
    <div class="kpi-tile"><div class="kpi-icon">🏋️</div><div class="kpi-label">Volume total</div><div class="kpi-value">${Math.round((totalVolume||0)/1000).toLocaleString("fr-FR")}k ${volTrendHtml}</div><div class="kpi-sub">kg soulevés</div></div>
    <div class="kpi-tile"><div class="kpi-icon">🔥</div><div class="kpi-label">Meilleur streak</div><div class="kpi-value">${bestStreak||0}j</div></div>
    <div class="kpi-tile"><div class="kpi-icon">🏆</div><div class="kpi-label">Records battus</div><div class="kpi-value">${records?.length||0}</div></div>`;

  if (!isFree) {
    // ── Fréquence 4 semaines ───────────────────────────────
    const maxFreq = Math.max(1, ...weeklyFrequency);
    const weekLabels = ["S-4","S-3","S-2","S-1"];
    document.getElementById("freq-chart").innerHTML = weeklyFrequency.map((v, i) => `
      <div class="freq-bar-wrap">
        <div class="freq-bar" style="height:${Math.round((v/maxFreq)*100)}%"></div>
        <span class="freq-label">${weekLabels[i]}<br><b style="color:var(--chalk)">${v}</b></span>
      </div>`).join("");

    // ── Volume musculaire ──────────────────────────────────
    const maxVol = Math.max(1, ...(muscleGroupVolume || []).map(m => m.volume));
    document.getElementById("muscle-bars").innerHTML = (muscleGroupVolume || []).slice(0, 6).map(m => `
      <div class="muscle-bar-row">
        <span class="muscle-bar-label">${esc(m.muscle_group)}</span>
        <div class="muscle-bar-track"><div class="muscle-bar-fill" style="width:${Math.round((m.volume/maxVol)*100)}%"></div></div>
        <span class="muscle-bar-val">${Math.round(m.volume/1000)}k kg</span>
      </div>`).join("") || `<p class="muted" style="font-size:.85rem">Pas encore de données par groupe musculaire.</p>`;

    renderMuscleRadar(muscleGroupVolume || []);
  }

  // ── Records persos ───────────────────────────────────────
  const medals = ["🥇", "🥈", "🥉"];
  document.getElementById("records-grid").innerHTML = records.map((r, i) => `
    <div class="record-tile${i < 3 ? ` record-tile-medal record-tile-rank${i+1}` : ""}">
      ${medals[i] ? `<div class="rec-medal">${medals[i]}</div>` : ""}
      <div class="rec-ex">${esc(r.exercise_name)}</div>
      <div class="rec-val">${Number(r.max_weight)} kg</div>
      ${r.achieved_at ? `<div class="rec-date">${new Date(r.achieved_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</div>` : ""}
    </div>`).join("");

  if (!isFree) {
    // ── Sélecteur exercice + courbe ────────────────────────
    const select = document.getElementById("exercise-select");
    select.innerHTML = exercises.map(e => `<option value="${esc(e)}">${esc(e)}</option>`).join("");
    select.addEventListener("change", () => loadProgressChart(select.value));
    loadProgressChart(exercises[0]);
  }

  initCompare(exercises);
}

// ── Comparaison de séances (fonctionnalité 2) ─────────────
async function initCompare(exercises) {
  const exSelect = document.getElementById("compare-exercise-select");
  if (!exSelect || !exercises.length) return;
  exSelect.innerHTML = exercises.map(e => `<option value="${esc(e)}">${esc(e)}</option>`).join("");
  exSelect.addEventListener("change", () => loadCompareDates(exSelect.value));
  document.getElementById("compare-btn").addEventListener("click", runCompare);
  await loadCompareDates(exSelect.value);
}

async function loadCompareDates(exercise) {
  const res = await fetch(`/api/logs/exercise-dates?exercise=${encodeURIComponent(exercise)}`);
  const { dates } = await res.json();
  const d1 = document.getElementById("compare-date1-select");
  const d2 = document.getElementById("compare-date2-select");
  const result = document.getElementById("compare-result");
  const btn = document.getElementById("compare-btn");

  if (dates.length < 2) {
    d1.innerHTML = "";
    d2.innerHTML = "";
    result.innerHTML = `<p class="muted" style="font-size:.85rem">Il faut au moins 2 séances différentes sur cet exercice pour comparer.</p>`;
    btn.disabled = true;
    return;
  }
  btn.disabled = false;
  const opts = dates.map(d => `<option value="${d}">${new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}</option>`).join("");
  d1.innerHTML = opts;
  d2.innerHTML = opts;
  // Par défaut : la plus ancienne vs la plus récente (comparaison "avant/après" la plus parlante)
  d1.value = dates[dates.length - 1];
  d2.value = dates[0];
  result.innerHTML = "";
}

async function runCompare() {
  const exercise = document.getElementById("compare-exercise-select").value;
  const date1 = document.getElementById("compare-date1-select").value;
  const date2 = document.getElementById("compare-date2-select").value;
  const result = document.getElementById("compare-result");
  if (!date1 || !date2) return;
  if (date1 === date2) {
    result.innerHTML = `<p class="muted" style="font-size:.85rem">Choisis deux dates différentes.</p>`;
    return;
  }

  result.innerHTML = `<p class="muted" style="font-size:.85rem">Chargement…</p>`;
  try {
    const res = await fetch(`/api/logs/compare?exercise=${encodeURIComponent(exercise)}&date1=${date1}&date2=${date2}`);
    const data = await res.json();
    if (!res.ok) {
      result.innerHTML = `<p class="muted" style="font-size:.85rem">${esc(data.error)}</p>`;
      return;
    }
    renderCompareResult(data);
  } catch {
    result.innerHTML = `<p class="muted" style="font-size:.85rem">Impossible de joindre le serveur.</p>`;
  }
}

function compareSessionCard(label, session) {
  return `
    <div class="recap-card">
      <div class="recap-card-header">
        <span>${label} — ${new Date(session.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
      </div>
      ${session.sets.map(s => `<div class="recap-row"><span>${s.weight} kg × ${s.reps} reps</span><span class="recap-meta">${s.sets} série${s.sets > 1 ? "s" : ""}</span></div>`).join("")}
      <div class="recap-row" style="background:var(--bg-hover)">
        <span style="font-size:.8rem;color:var(--chalk-dim)">Volume total</span>
        <span class="recap-meta">${Math.round(session.totalVolume)} kg</span>
      </div>
    </div>`;
}

function renderCompareResult(data) {
  const { sessionA, sessionB, delta, message } = data;
  const badgeClass = delta.weightKg > 0 ? "up" : delta.weightKg < 0 ? "down" : "same";
  const badgeArrow = delta.weightKg > 0 ? "▲" : delta.weightKg < 0 ? "▼" : "=";
  const sign = delta.weightKg > 0 ? "+" : "";

  document.getElementById("compare-result").innerHTML = `
    <div class="compare-sessions">
      ${compareSessionCard("Séance A", sessionA)}
      ${compareSessionCard("Séance B", sessionB)}
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
      <span class="delta-badge ${badgeClass}">${badgeArrow} ${sign}${delta.weightKg} kg (${sign}${delta.weightPct}%)</span>
      <span class="delta-badge ${delta.volumeKg >= 0 ? "up" : "down"}">Volume ${delta.volumeKg >= 0 ? "+" : ""}${delta.volumeKg} kg</span>
    </div>
    <div class="compare-message">🤖 ${esc(message)}</div>`;
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
        borderColor: "#3da874",
        backgroundColor: "rgba(61,168,116,.18)",
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

// ── Partage stats (carte type "story" Instagram) ────────────
function openShareModal() {
  document.getElementById("share-modal-overlay").classList.remove("hidden");
  drawShareCard();
}
document.getElementById("share-modal-close")?.addEventListener("click", () => {
  document.getElementById("share-modal-overlay").classList.add("hidden");
});
document.getElementById("share-modal-overlay")?.addEventListener("click", e => {
  if (e.target.id === "share-modal-overlay") e.target.classList.add("hidden");
});

function drawShareCard() {
  const canvas = document.getElementById("share-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // Fond degrade sombre + halo rouille
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#141210");
  bgGrad.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  const halo = ctx.createRadialGradient(W / 2, 260, 40, W / 2, 260, 620);
  halo.addColorStop(0, "rgba(201,77,40,.35)");
  halo.addColorStop(1, "rgba(201,77,40,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  // Wordmark
  ctx.textAlign = "center";
  ctx.fillStyle = "#f2f1ee";
  ctx.font = "700 44px Arial";
  ctx.fillText("GYM AI COACH", W / 2, 160);

  ctx.fillStyle = "#8f8d89";
  ctx.font = "400 32px Arial";
  ctx.fillText(shareData.name || "", W / 2, 220);

  // Streak — chiffre geant
  ctx.fillStyle = "#e56a44";
  ctx.font = "800 340px Arial";
  ctx.fillText(String(shareData.streak ?? 0), W / 2, 780);

  ctx.fillStyle = "#f2f1ee";
  ctx.font = "600 52px Arial";
  ctx.fillText("JOURS CONSÉCUTIFS", W / 2, 870);

  // Cartes stats
  const cardY = 1020, cardH = 640, cardW = W - 160, cardX = 80;
  ctx.fillStyle = "rgba(255,255,255,.05)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.12)";
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.stroke();

  const rowH = cardH / 2;
  drawStatRow(ctx, cardX, cardY, cardW, rowH, "SÉANCES TOTALES", String(shareData.totalSessions ?? 0));
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.beginPath(); ctx.moveTo(cardX + 40, cardY + rowH); ctx.lineTo(cardX + cardW - 40, cardY + rowH); ctx.stroke();

  const recordLabel = shareData.topRecord
    ? `${shareData.topRecord.exercise_name} — ${Number(shareData.topRecord.max_weight)} kg`
    : "Pas encore de record";
  drawStatRow(ctx, cardX, cardY + rowH, cardW, rowH, "MEILLEUR RECORD", recordLabel, true);

  // Footer
  ctx.fillStyle = "#8f8d89";
  ctx.font = "400 30px Arial";
  ctx.fillText("Généré sur gym-ai-coach", W / 2, H - 80);
}

function drawStatRow(ctx, x, y, w, h, label, value, small) {
  ctx.textAlign = "left";
  ctx.fillStyle = "#8f8d89";
  ctx.font = "600 30px Arial";
  ctx.fillText(label, x + 50, y + h / 2 - 20);

  ctx.fillStyle = "#f2f1ee";
  ctx.font = `700 ${small ? 46 : 76}px Arial`;
  // Tronque les valeurs trop longues (nom d'exercice) pour ne pas deborder
  let text = value;
  while (ctx.measureText(text).width > w - 100 && text.length > 3) text = text.slice(0, -2);
  if (text !== value) text += "…";
  ctx.fillText(text, x + 50, y + h / 2 + (small ? 40 : 55));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function downloadShareCard() {
  const canvas = document.getElementById("share-canvas");
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "gym-ai-coach-stats.png";
  a.click();
  fetch("/api/badges/share", { method: "POST" }).catch(() => {});
}

init();
