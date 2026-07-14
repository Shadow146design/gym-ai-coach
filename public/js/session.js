// ── Theme ─────────────────────────────────────────────────
const html = document.documentElement;
html.setAttribute("data-theme", localStorage.getItem("theme") || "dark");

// ── State ─────────────────────────────────────────────────
let program = null;
let selectedDay = null;
let recentLogs = {};
let sessionLogs = [];
let timerInterval = null;
let secondsElapsed = 0;
let postChatHistory = [];
let restTimerInterval = null;
let restTimerTimeout = null;
let lastRecapData = null;

// ── Init ──────────────────────────────────────────────────
async function init() {
  let prog, recent;
  try {
    const meRes = await fetch("/api/auth/me");
    if (!meRes.ok) return (window.location.href = "/");

    const [progRes, recentRes] = await Promise.all([
      fetch("/api/program/active"),
      fetch("/api/logs/recent"),
    ]);
    ({ program: prog } = await progRes.json());
    ({ recent } = await recentRes.json());
    window.offlineSync?.cacheData("program", prog);
    window.offlineSync?.cacheData("recentLogs", recent || []);
  } catch {
    // Hors ligne (fonctionnalite 9) : impossible de verifier l'auth ou de
    // recharger le programme depuis le serveur — on retente avec la derniere
    // copie mise en cache localement, si elle existe, pour permettre de
    // demarrer quand meme une seance.
    prog = await window.offlineSync?.getCachedData("program");
    recent = await window.offlineSync?.getCachedData("recentLogs");
  }

  document.getElementById("loading").classList.add("hidden");

  if (!prog) {
    document.getElementById("loading").classList.remove("hidden");
    document.getElementById("loading").innerHTML = navigator.onLine ? `
      <h3>Pas de programme actif</h3>
      <p class="muted" style="margin-top:8px">Génère un programme d'abord.</p>
      <a class="btn btn-primary" href="/questionnaire.html" style="margin-top:18px">Créer mon programme</a>` : `
      <h3>📡 Hors ligne</h3>
      <p class="muted" style="margin-top:8px">Aucun programme en cache sur cet appareil. Connecte-toi une première fois avant de pouvoir t'entraîner hors ligne.</p>`;
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
  grid.innerHTML = "";
  (program.content.days || []).forEach((day, i) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-ghost";
    btn.style.cssText = "text-align:left;padding:18px 20px;border-radius:var(--radius-lg);height:auto;flex-direction:column;align-items:flex-start;gap:6px;width:100%";
    btn.innerHTML = `
      <span style="font-family:var(--font-display);font-size:1rem;text-transform:uppercase;letter-spacing:.04em">${esc(day.day)}</span>
      <span style="font-size:.8rem;color:var(--chalk-dim)">${esc(day.focus||"")}</span>
      <span style="font-size:.75rem;color:var(--steel-soft);font-family:var(--font-mono)">${(day.exercises||[]).length} exercices</span>`;
    btn.addEventListener("click", () => {
      selectedDay = program.content.days[i];
      document.getElementById("step-pick").classList.add("hidden");
      startWarmup();
    });
    grid.appendChild(btn);
  });
}

// ── Étape 1.5 : échauffement (fonctionnalité 2) ───────────
const WARMUP_DURATION = 45;
const WARMUP_EXERCISES = {
  push: [
    { name: "Rotations d'épaules", desc: "Bras tendus, grands cercles vers l'avant puis l'arrière." },
    { name: "Pompes légères", desc: "Pompes sur les genoux ou inclinées, tempo lent et contrôlé." },
    { name: "Bandes élastiques — tirages", desc: "Tirages horizontaux pour activer les épaules et les scapulas." },
  ],
  pull: [
    { name: "Rotations d'épaules", desc: "Bras tendus, grands cercles vers l'avant puis l'arrière." },
    { name: "Élévations légères", desc: "Élévations latérales à vide ou avec une charge très légère." },
    { name: "Étirements dorsaux", desc: "Dos rond, bras tendus devant toi, pousse les omoplates vers l'avant." },
  ],
  legs: [
    { name: "Fentes dynamiques", desc: "Fentes avant alternées, amplitude progressive." },
    { name: "Squats à vide", desc: "Squats sans charge, descente contrôlée." },
    { name: "Mobilité hanches", desc: "Cercles de hanches et ouvertures latérales." },
    { name: "Rotations chevilles", desc: "Cercles des chevilles dans les deux sens." },
  ],
};
WARMUP_EXERCISES.full = Array.from(
  new Map([...WARMUP_EXERCISES.push, ...WARMUP_EXERCISES.pull, ...WARMUP_EXERCISES.legs].map(e => [e.name, e])).values()
);

let warmupList = [];
let warmupIndex = 0;
let warmupTimerInterval = null;

function classifyWarmupCategory(day) {
  const text = `${day.day || ""} ${day.focus || ""} ${(day.exercises || []).map(e => e.muscle_group || "").join(" ")}`.toLowerCase();
  const hasPush = /pec|épaule|epaule|triceps|poitrine|shoulder|chest/.test(text);
  const hasPull = /dos|biceps|back|dorsal/.test(text);
  const hasLegs = /jambe|leg|quadri|ischio|fessier|mollet|cuisse|glute/.test(text);
  if (/full.?body|corps entier/.test(text)) return "full";
  const matches = [hasPush, hasPull, hasLegs].filter(Boolean).length;
  if (matches >= 2) return "full";
  if (hasLegs) return "legs";
  if (hasPull) return "pull";
  if (hasPush) return "push";
  return "full";
}

function startWarmup() {
  const category = classifyWarmupCategory(selectedDay);
  warmupList = WARMUP_EXERCISES[category] || WARMUP_EXERCISES.full;
  warmupIndex = 0;

  const totalMins = Math.round((warmupList.length * WARMUP_DURATION) / 60) || 1;
  document.getElementById("warmup-subtitle").textContent =
    `Avant "${selectedDay.day}" — ${warmupList.length} exercices, ~${totalMins} min`;
  document.getElementById("warmup-done").classList.add("hidden");
  document.getElementById("warmup-card").classList.remove("hidden");
  document.getElementById("step-warmup").classList.remove("hidden");
  renderWarmupExercise();
}

function renderWarmupExercise() {
  const ex = warmupList[warmupIndex];
  document.getElementById("warmup-progress").innerHTML = warmupList.map((_, i) =>
    `<span class="warmup-dot${i < warmupIndex ? " done" : ""}${i === warmupIndex ? " active" : ""}"></span>`).join("");
  document.getElementById("warmup-ex-name").textContent = ex.name;
  document.getElementById("warmup-ex-desc").textContent = ex.desc;

  let remaining = WARMUP_DURATION;
  document.getElementById("warmup-timer").textContent = remaining;
  clearInterval(warmupTimerInterval);
  warmupTimerInterval = setInterval(() => {
    remaining--;
    document.getElementById("warmup-timer").textContent = remaining;
    if (remaining <= 0) {
      clearInterval(warmupTimerInterval);
      if (navigator.vibrate) navigator.vibrate(150);
      warmupIndex++;
      if (warmupIndex >= warmupList.length) finishWarmup();
      else renderWarmupExercise();
    }
  }, 1000);
}

function finishWarmup() {
  clearInterval(warmupTimerInterval);
  document.getElementById("warmup-card").classList.add("hidden");
  document.getElementById("warmup-done").classList.remove("hidden");
}

document.getElementById("warmup-skip-btn").addEventListener("click", () => {
  if (!confirm("⚠️ Sauter l'échauffement augmente le risque de blessure. Continuer sans t'échauffer ?")) return;
  clearInterval(warmupTimerInterval);
  document.getElementById("step-warmup").classList.add("hidden");
  startSession();
});

document.getElementById("warmup-start-btn").addEventListener("click", () => {
  document.getElementById("step-warmup").classList.add("hidden");
  startSession();
});

// ── Étape 2 : séance ──────────────────────────────────────
function buildExerciseCard(ex, ei) {
  const recent = recentLogs[ex.name];
  const defaultWeight = recent ? recent.weight : "";
  const sets = typeof ex.sets === "number" ? ex.sets : parseInt(ex.sets) || 3;
  const repsHint = ex.reps || "?";
  const prevTxt = recent ? `Dernière fois : ${recent.weight} kg × ${recent.reps} reps` : "Première fois 🌟";

  const card = document.createElement("div");
  card.className = "session-exercise-card";
  card.dataset.exercise = ex.name;
  card.dataset.muscleGroup = ex.muscle_group || "";
  card.dataset.restSeconds = ex.rest_seconds || 90;

  let setsHtml = `<div style="padding:6px 18px 4px;font-size:.7rem;color:var(--chalk-dim);display:grid;grid-template-columns:28px 1fr 1fr 40px;gap:8px;text-transform:uppercase;letter-spacing:.04em">
    <span>#</span><span>Poids kg</span><span>Reps</span><span></span></div>`;

  for (let s = 1; s <= sets; s++) {
    setsHtml += `
      <div class="set-row" data-set="${s}" data-ex="${ei}">
        <div class="set-num">${s}</div>
        <input type="number" class="weight-input" step="0.5" min="0" value="${defaultWeight}" placeholder="kg"/>
        <input type="number" class="reps-input" min="1" value="${recent ? recent.reps : ""}" placeholder="${repsHint}"/>
        <button class="done-btn" data-ex="${ei}" data-set="${s}" data-rest="${ex.rest_seconds||90}">✓</button>
      </div>`;
  }

  card.innerHTML = `
    <div class="session-exercise-header">
      <div>
        <h3 class="ex-name-clickable" data-ex-name="${esc(ex.name)}" data-muscle-group="${esc(ex.muscle_group || "")}" data-ex-notes="${esc(ex.notes || "")}">${esc(ex.name)}</h3>
        <div style="font-size:.78rem;color:var(--chalk-dim);margin-top:3px">${sets} × ${repsHint} — repos ${ex.rest_seconds||"?"}s</div>
        <div style="font-size:.72rem;color:var(--steel-soft);margin-top:2px">${esc(prevTxt)}</div>
      </div>
      ${ex.muscle_group ? `<span class="muscle-tag">${esc(ex.muscle_group)}</span>` : ""}
    </div>
    ${setsHtml}`;

  return card;
}

function startSession() {
  document.getElementById("session-day-title").textContent = selectedDay.day;
  document.getElementById("session-day-focus").textContent = selectedDay.focus || "";

  const container = document.getElementById("session-exercises");
  container.innerHTML = "";

  (selectedDay.exercises || []).forEach((ex, ei) => {
    container.appendChild(buildExerciseCard(ex, ei));
  });

  container.querySelectorAll(".done-btn").forEach(btn => {
    btn.addEventListener("click", () => completeSet(btn));
  });

  updateSessionProgress();

  // Timer séance
  secondsElapsed = 0;
  timerInterval = setInterval(() => {
    secondsElapsed++;
    const m = String(Math.floor(secondsElapsed / 60)).padStart(2,"0");
    const s = String(secondsElapsed % 60).padStart(2,"0");
    document.getElementById("session-timer").textContent = `${m}:${s}`;
  }, 1000);

  document.getElementById("step-session").classList.remove("hidden");
}

// Ajoute un exercice ad-hoc a la seance en cours, depuis le bouton "Ajouter
// à ma séance" de la modal de démonstration (fonctionnalité 1). Reglages par
// defaut raisonnables (3 series, repos 90s) puisqu'aucune donnee IA n'existe
// pour un exercice ajoute manuellement en cours de seance.
window.addExerciseToSession = function (name, muscleGroup) {
  if (!selectedDay || document.getElementById("step-session").classList.contains("hidden")) {
    alert("Démarre d'abord ta séance pour pouvoir y ajouter un exercice.");
    return;
  }
  const ex = { name, muscle_group: muscleGroup || "", sets: 3, reps: "?", rest_seconds: 90 };
  selectedDay.exercises = selectedDay.exercises || [];
  selectedDay.exercises.push(ex);
  const ei = selectedDay.exercises.length - 1;

  const container = document.getElementById("session-exercises");
  const card = buildExerciseCard(ex, ei);
  container.appendChild(card);
  card.querySelectorAll(".done-btn").forEach(btn => btn.addEventListener("click", () => completeSet(btn)));
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  updateSessionProgress();
};

// Met en avant le premier exercice non termine et affiche X/Y complets
function updateSessionProgress() {
  const cards = [...document.querySelectorAll(".session-exercise-card")];
  if (!cards.length) return;

  let doneCount = 0;
  let activeAssigned = false;
  cards.forEach(card => {
    const rows = card.querySelectorAll(".set-row");
    const isDone = rows.length > 0 && [...rows].every(r => r.classList.contains("completed"));
    card.classList.toggle("exercise-done", isDone);
    if (isDone) doneCount++;
    if (!isDone && !activeAssigned) {
      card.classList.add("active-exercise");
      activeAssigned = true;
    } else {
      card.classList.remove("active-exercise");
    }
  });

  const label = document.getElementById("session-progress-label");
  const fill = document.getElementById("session-progress-fill");
  if (label) label.textContent = `${doneCount}/${cards.length} exercices complétés`;
  if (fill) fill.style.width = `${cards.length ? (doneCount / cards.length) * 100 : 0}%`;
}

// ── Mode Focus (fonctionnalité 3.8) ───────────────────────
function enterFocusMode() {
  document.body.classList.add("focus-mode");
  document.getElementById("focus-exit-btn").classList.remove("hidden");
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
}

function exitFocusMode() {
  document.body.classList.remove("focus-mode");
  document.getElementById("focus-exit-btn").classList.add("hidden");
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}

document.getElementById("focus-mode-btn")?.addEventListener("click", enterFocusMode);
document.getElementById("focus-exit-btn")?.addEventListener("click", exitFocusMode);
document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) return;
  document.body.classList.remove("focus-mode");
  document.getElementById("focus-exit-btn")?.classList.add("hidden");
});

function completeSet(btn) {
  const row = btn.closest(".set-row");
  const card = btn.closest(".session-exercise-card");
  const weight = parseFloat(row.querySelector(".weight-input").value);
  const reps   = parseInt(row.querySelector(".reps-input").value);

  if (isNaN(weight) || weight < 0) { row.querySelector(".weight-input").focus(); return; }
  if (!reps || reps < 1)           { row.querySelector(".reps-input").focus(); return; }

  btn.classList.add("checked", "just-checked");
  btn.disabled = true;
  row.classList.add("completed");
  setTimeout(() => btn.classList.remove("just-checked"), 500);

  sessionLogs.push({
    exercise_name: card.dataset.exercise,
    muscle_group:  card.dataset.muscleGroup || null,
    weight, reps, sets: 1,
  });

  updateSessionProgress();

  // Lance le minuteur de repos
  const restSeconds = parseInt(btn.dataset.rest) || 90;
  startRestTimer(restSeconds);
}

// ── Minuteur de repos ─────────────────────────────────────
function startRestTimer(seconds) {
  // Annule le minuteur précédent ET le setTimeout de nettoyage qu'il avait
  // programmé (sinon ce setTimeout retardé peut supprimer le nouvel overlay
  // qu'on est sur le point de créer).
  clearInterval(restTimerInterval);
  clearTimeout(restTimerTimeout);
  restTimerInterval = null;
  restTimerTimeout = null;
  removeRestOverlay();

  const overlay = document.createElement("div");
  overlay.className = "rest-timer-overlay";
  overlay.id = "rest-overlay";
  overlay.innerHTML = `
    <div>
      <div class="rest-label">Repos</div>
      <div class="rest-count" id="rest-count">${seconds}</div>
    </div>
    <div>
      <div style="font-size:.75rem;color:var(--chalk-dim);margin-bottom:6px">Prochaine série</div>
      <div class="rest-skip" onclick="skipRest()">Passer →</div>
    </div>`;
  document.body.appendChild(overlay);

  let remaining = seconds;
  restTimerInterval = setInterval(() => {
    remaining--;
    const el = document.getElementById("rest-count");
    if (el) el.textContent = remaining;

    if (remaining <= 0) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      // Vibration sur mobile
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      overlay.classList.add("done");
      if (el) el.textContent = "GO !";
      restTimerTimeout = setTimeout(removeRestOverlay, 2000);
    }
  }, 1000);
}

function skipRest() {
  clearInterval(restTimerInterval);
  clearTimeout(restTimerTimeout);
  restTimerInterval = null;
  restTimerTimeout = null;
  removeRestOverlay();
}

function removeRestOverlay() {
  const el = document.getElementById("rest-overlay");
  if (el) el.remove();
}

// ── Terminer la séance ────────────────────────────────────
document.getElementById("finish-btn").addEventListener("click", async () => {
  if (sessionLogs.length === 0) { alert("Valide au moins une série avant de terminer !"); return; }

  clearInterval(timerInterval);
  clearInterval(restTimerInterval);
  clearTimeout(restTimerTimeout);
  removeRestOverlay();
  document.getElementById("finish-btn").disabled = true;
  document.getElementById("finish-btn").textContent = "Enregistrement…";

  // Mode hors-ligne (fonctionnalite 9) : toute serie dont l'envoi echoue
  // (coupure reseau) est mise en file dans IndexedDB au lieu d'etre perdue —
  // offline-sync.js la synchronisera automatiquement au retour de la connexion.
  let queuedOffline = 0;
  await Promise.all(sessionLogs.map(async log => {
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
      if (!res.ok) throw new Error("Echec de l'enregistrement.");
    } catch {
      if (window.offlineSync) { await window.offlineSync.saveOfflineLog(log); queuedOffline++; }
    }
  }));

  document.getElementById("step-session").classList.add("hidden");

  if (queuedOffline > 0) {
    // Hors ligne : le recap normal depend de trois routes serveur qui
    // echoueraient aussi, on affiche donc une confirmation locale a la place.
    document.getElementById("step-recap").classList.remove("hidden");
    document.getElementById("recap-stats").innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <h3>📡 Séance enregistrée hors ligne</h3>
        <p class="muted" style="margin-top:8px">${queuedOffline} série${queuedOffline > 1 ? "s" : ""} sauvegardée${queuedOffline > 1 ? "s" : ""} sur cet appareil. Elles seront envoyées automatiquement dès que tu seras reconnecté.</p>
      </div>`;
    document.getElementById("recap-exercises").innerHTML = "";
    return;
  }

  await showRecap();
  document.getElementById("step-recap").classList.remove("hidden");
});

// ── Récap ─────────────────────────────────────────────────
async function showRecap() {
  const [recapRes, volumeRes, ormRes] = await Promise.all([
    fetch("/api/logs/recap"),
    fetch("/api/logs/volume"),
    fetch("/api/logs/one-rm"),
  ]);
  const { recap } = await recapRes.json();
  const { volume } = await volumeRes.json();
  const { one_rm } = await ormRes.json();

  const totalVolume = sessionLogs.reduce((a,r) => a + r.weight * r.reps, 0);
  const prs = recap.filter(r => r.previous_weight === null || r.weight > r.previous_weight).length;
  const mins = Math.round(secondsElapsed / 60);
  lastRecapData = { totalVolume, prs, mins };

  // Comparaison au volume de la seance precedente (avant-dernier jour de la courbe)
  const prevDayVolume = volume.length >= 2 ? Number(volume[volume.length - 2].volume) : null;
  const volDeltaPct = prevDayVolume ? Math.round(((totalVolume - prevDayVolume) / prevDayVolume) * 100) : null;
  const volDeltaHtml = volDeltaPct === null ? ""
    : `<div class="kpi-sub" style="color:${volDeltaPct >= 0 ? "var(--green)" : "var(--rust-soft)"}">${volDeltaPct >= 0 ? "▲ +" : "▼ "}${volDeltaPct}% vs dernière séance</div>`;
  const intensity = mins > 0 ? Math.round(totalVolume / mins) : 0;

  document.getElementById("recap-stats").innerHTML = `
    <div class="kpi-tile"><div class="kpi-label">Séries</div><div class="kpi-value">${sessionLogs.length}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Volume</div><div class="kpi-value">${Math.round(totalVolume)}<span style="font-size:.9rem"> kg</span></div>${volDeltaHtml}</div>
    <div class="kpi-tile"><div class="kpi-label">Records 🏆</div><div class="kpi-value" style="color:var(--gold)">${prs}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Durée</div><div class="kpi-value">${mins}<span style="font-size:.9rem"> min</span></div><div class="kpi-sub">${intensity} kg/min</div></div>`;

  if (prs > 0) launchConfetti();
  renderSessionMuscleRadar();
  setupCoachShareButton();

  // Détail exercices
  const byEx = {};
  recap.forEach(r => {
    if (!byEx[r.exercise_name]) byEx[r.exercise_name] = { rows: [], prev: r.previous_weight };
    byEx[r.exercise_name].rows.push(r);
  });

  const exContainer = document.getElementById("recap-exercises");
  exContainer.innerHTML = "";
  Object.entries(byEx).forEach(([exName, { rows, prev }]) => {
    const best = Math.max(...rows.map(r => r.weight));
    const delta = prev !== null ? best - Number(prev) : null;
    const badge = delta === null ? `<span class="delta-badge new">Nouveau 🌟</span>`
      : delta > 0 ? `<span class="delta-badge up">▲ +${delta} kg</span>`
      : delta < 0 ? `<span class="delta-badge down">▼ ${delta} kg</span>`
      : `<span class="delta-badge same">= Stable</span>`;

    const ormForEx = one_rm?.find(o => o.exercise_name === exName);

    const card = document.createElement("div");
    card.className = "recap-card";
    card.innerHTML = `
      <div class="recap-card-header"><span>${esc(exName)}</span>${badge}</div>
      ${rows.map(r => `<div class="recap-row"><span>${r.weight} kg × ${r.reps} reps</span>
        <span class="recap-meta">${new Date(r.performed_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span></div>`).join("")}
      ${ormForEx ? `<div class="recap-row" style="background:var(--bg-hover)">
        <span style="font-size:.8rem;color:var(--chalk-dim)">1RM estimé</span>
        <span class="orm-val">${ormForEx.one_rm} kg</span></div>` : ""}`;
    exContainer.appendChild(card);
  });

  // Debrief IA
  await triggerDebrief(totalVolume, prs, mins);

  renderVolumeChart(volume);
}

// ── Confetti quand des records sont battus (fonctionnalité 3.9) ──
function launchConfetti() {
  const colors = ["#c94d28", "#e8b33d", "#3da874", "#7aa8b8"];
  const container = document.createElement("div");
  container.className = "confetti-container";
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
    container.appendChild(piece);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3200);
}

// ── Radar des muscles travaillés pendant la séance ────────
let sessionRadarInstance = null;
function renderSessionMuscleRadar() {
  const box = document.getElementById("recap-muscle-radar");
  const canvas = document.getElementById("session-muscle-radar");
  if (typeof Chart === "undefined" || !box || !canvas) return;

  const volByGroup = {};
  sessionLogs.forEach(l => {
    const g = l.muscle_group || "Autre";
    volByGroup[g] = (volByGroup[g] || 0) + l.weight * l.reps;
  });
  const groups = Object.keys(volByGroup);
  if (groups.length < 3) { box.classList.add("hidden"); return; }

  box.classList.remove("hidden");
  if (sessionRadarInstance) sessionRadarInstance.destroy();
  sessionRadarInstance = new Chart(canvas, {
    type: "radar",
    data: {
      labels: groups,
      datasets: [{
        label: "Volume séance (kg)",
        data: groups.map(g => volByGroup[g]),
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

// ── Partage de la séance avec le coach assigné ────────────
async function setupCoachShareButton() {
  const btn = document.getElementById("share-coach-btn");
  if (!btn) return;
  try {
    const mine = await fetch("/api/coaches/mine").then(r => r.json());
    const assignment = mine.assignment;
    if (!assignment || assignment.status !== "active") return;
    btn.classList.remove("hidden");
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const d = lastRecapData;
      const content = `📋 Récap de ma séance : ${sessionLogs.length} séries, ${Math.round(d.totalVolume)} kg de volume, ${d.prs} record${d.prs > 1 ? "s" : ""} battu${d.prs > 1 ? "s" : ""}, ${d.mins} min.`;
      try {
        await fetch(`/api/messages/${assignment.coach_id}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }),
        });
        btn.textContent = "✓ Partagé au coach";
      } catch {
        btn.disabled = false;
      }
    }, { once: true });
  } catch {}
}

// ── Debrief IA ────────────────────────────────────────────
async function triggerDebrief(totalVolume, prs, durationMins) {
  const debriefEl = document.getElementById("debrief-card");
  if (!debriefEl) return;

  debriefEl.innerHTML = `<div class="card-title">🤖 Analyse du coach</div>
    <p class="muted" style="font-size:.88rem">L'IA analyse ta séance…</p>`;
  debriefEl.style.display = "block";

  // Construit la liste des exercices avec progression
  const exercises = sessionLogs.map(log => ({
    name: log.exercise_name,
    weight: log.weight,
    reps: log.reps,
    previousWeight: null, // le serveur a déjà les données
  }));

  try {
    const res = await fetch("/api/chat/debrief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercises,
        totalVolume,
        prs,
        durationMins,
        programFocus: selectedDay?.focus || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.upgrade_url) {
        lockSection(debriefEl, { title: "Débrief IA — Premium", desc: data.error });
        return;
      }
      throw new Error(data.error);
    }

    const formatted = (data.debrief || "").replace(/\n/g, "<br>");
    debriefEl.innerHTML = `
      <div class="card-title">🤖 Analyse du coach</div>
      <div style="font-size:.9rem;line-height:1.7;margin-bottom:16px">${formatted}</div>
      <div style="font-size:.8rem;color:var(--chalk-dim);margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Parle au coach</div>
      <div id="post-chat-messages" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;max-height:200px;overflow-y:auto"></div>
      <div style="display:flex;gap:8px">
        <input id="post-chat-input" type="text" placeholder="Pose une question sur cette séance…" style="flex:1"/>
        <button type="button" class="mic-btn" id="post-chat-mic-btn" title="Dicter" aria-label="Dicter">🎤</button>
        <button class="btn btn-primary btn-sm" onclick="sendPostChat()">Envoyer</button>
      </div>`;
    initVoiceInput("post-chat-input", "post-chat-mic-btn");

    // Pré-charge le contexte du debrief dans l'historique de chat
    postChatHistory = [
      { role: "assistant", content: data.debrief }
    ];

    analyzeSessionForAdaptSuggestion();
  } catch (e) {
    debriefEl.innerHTML = `<div class="card-title">🤖 Analyse du coach</div>
      <p class="muted">Impossible de générer l'analyse : ${e.message}</p>`;
  }
}

// ── Module F : suggestion proactive d'adaptation du programme ─
async function analyzeSessionForAdaptSuggestion() {
  const bestByEx = {};
  sessionLogs.forEach(l => {
    if (!bestByEx[l.exercise_name] || l.weight > bestByEx[l.exercise_name].weight) {
      bestByEx[l.exercise_name] = { name: l.exercise_name, weight: l.weight, reps: l.reps };
    }
  });
  const exercises = Object.values(bestByEx);
  if (!exercises.length) return;

  try {
    const res = await fetch("/api/program/analyze-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercises }),
    });
    const data = await res.json();
    if (!res.ok || data.suggestion === "adapté" || !data.message) return;

    const direction = data.suggestion === "trop_facile" ? "harder" : "easier";
    const confirmLabel = data.suggestion === "trop_facile" ? "Oui, mettre à jour" : "Oui, adapter";

    const box = document.createElement("div");
    box.className = "card adapt-suggestion";
    box.style.marginTop = "14px";
    box.innerHTML = `
      <p style="font-size:.9rem;margin-bottom:12px">${esc(data.message)}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="adapt-yes-btn">${confirmLabel}</button>
        <button class="btn btn-ghost btn-sm" id="adapt-no-btn">Non, garder comme ça</button>
      </div>`;
    document.getElementById("debrief-card").appendChild(box);

    document.getElementById("adapt-no-btn").addEventListener("click", () => box.remove());
    document.getElementById("adapt-yes-btn").addEventListener("click", async () => {
      box.innerHTML = `<p class="muted" style="font-size:.88rem">Adaptation en cours…</p>`;
      try {
        const r = await fetch("/api/program/adapt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction }),
        });
        if (!r.ok) throw new Error();
        box.innerHTML = `<p style="font-size:.88rem;color:var(--green)">Programme adapté automatiquement ✓</p>`;
      } catch {
        box.innerHTML = `<p class="muted" style="font-size:.88rem">Impossible d'adapter le programme pour le moment.</p>`;
      }
    });
  } catch {}
}

async function sendPostChat() {
  const input = document.getElementById("post-chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  const msgs = document.getElementById("post-chat-messages");
  const userBubble = document.createElement("div");
  userBubble.className = "chat-msg user";
  userBubble.style.cssText = "background:var(--rust-bg);border-radius:10px;padding:8px 12px;font-size:.87rem;align-self:flex-end;max-width:85%";
  userBubble.textContent = text;
  msgs.appendChild(userBubble);

  const thinking = document.createElement("div");
  thinking.className = "chat-msg coach thinking";
  thinking.style.cssText = "background:var(--bg-hover);border-radius:10px;padding:8px 12px;font-size:.87rem;align-self:flex-start;max-width:85%;color:var(--chalk-dim)";
  thinking.textContent = "…";
  msgs.appendChild(thinking);
  msgs.scrollTop = msgs.scrollHeight;

  postChatHistory.push({ role: "user", content: text });

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: postChatHistory }),
    });
    const data = await res.json();
    thinking.remove();
    if (!res.ok) {
      postChatHistory.pop();
      if (data.upgrade_url) { showPremiumModal(data.error, data.upgrade_url); return; }
      throw new Error(data.error);
    }

    const reply = data.reply || "Pas de réponse.";
    postChatHistory.push({ role: "assistant", content: reply });

    const coachBubble = document.createElement("div");
    coachBubble.style.cssText = "background:var(--bg-hover);border-radius:10px;padding:8px 12px;font-size:.87rem;align-self:flex-start;max-width:85%";
    coachBubble.textContent = reply;
    msgs.appendChild(coachBubble);
    msgs.scrollTop = msgs.scrollHeight;
  } catch { thinking.textContent = "Erreur, réessaie."; }
}

function renderVolumeChart(volume) {
  const canvas = document.getElementById("volume-chart");
  if (!canvas) return;
  if (typeof Chart === "undefined" || !volume || volume.length < 2) {
    canvas.replaceWith(Object.assign(document.createElement("p"), {
      className: "muted", style: "margin-top:8px",
      textContent: volume?.length < 2 ? "Reviens après ta 2ème séance pour voir la courbe !" : "Graphique indisponible.",
    }));
    return;
  }
  new Chart(canvas, {
    type: "line",
    data: {
      labels: volume.map(v => new Date(v.day).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})),
      datasets: [{
        label: "Volume (kg)", data: volume.map(v => Math.round(Number(v.volume))),
        borderColor: "#c94d28", backgroundColor: "rgba(201,77,40,.15)",
        pointBackgroundColor: "#e8b33d", pointBorderColor: "#e8b33d",
        pointRadius: 5, tension: .3, fill: true,
      }],
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

// ── Partage de séance (fonctionnalité 1, Canvas API) ──────
document.getElementById("share-session-btn")?.addEventListener("click", openShareModal);

function topShareExercises() {
  const bestByEx = {};
  sessionLogs.forEach(l => {
    if (!bestByEx[l.exercise_name] || l.weight > bestByEx[l.exercise_name].weight) {
      bestByEx[l.exercise_name] = { name: l.exercise_name, weight: l.weight };
    }
  });
  return Object.values(bestByEx).sort((a, b) => b.weight - a.weight).slice(0, 3);
}

async function openShareModal() {
  if (!lastRecapData) return;
  const btn = document.getElementById("share-session-btn");
  btn.disabled = true;

  try {
    const [meRes, streakRes] = await Promise.all([
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/logs/streak").then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    const user = meRes?.user;
    const isStyled = ["premium", "coach", "admin"].includes(user?.role);

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    drawShareImage(canvas, {
      name: user?.name || "Athlète",
      totalVolume: lastRecapData.totalVolume,
      series: sessionLogs.length,
      prs: lastRecapData.prs,
      mins: lastRecapData.mins,
      streak: streakRes?.current || 0,
      topExercises: topShareExercises(),
      styled: isStyled,
    });
    showShareModal(canvas);
  } finally {
    btn.disabled = false;
  }
}

function drawShareImage(canvas, d) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#0a0a0a");
  bgGrad.addColorStop(1, "#1a1a1a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  if (d.styled) {
    const glow = ctx.createRadialGradient(W * 0.15, H * 0.1, 0, W * 0.15, H * 0.1, W * 0.55);
    glow.addColorStop(0, "rgba(201,77,40,.28)");
    glow.addColorStop(1, "rgba(201,77,40,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = d.styled ? "#e06040" : "#c94d28";
  ctx.font = "700 38px Arial";
  ctx.fillText("GYM AI COACH", 64, 100);

  ctx.fillStyle = "#ede8df";
  ctx.font = "700 58px Arial";
  ctx.fillText(d.name, 64, 190);

  ctx.fillStyle = "#8f8b84";
  ctx.font = "400 26px Arial";
  const dateStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  ctx.fillText(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), 64, 232);

  ctx.strokeStyle = d.styled ? "#c94d28" : "#333";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(64, 270); ctx.lineTo(W - 64, 270); ctx.stroke();

  const stats = [
    { label: "VOLUME", value: `${Math.round(d.totalVolume)} kg` },
    { label: "SÉRIES", value: `${d.series}` },
    { label: "RECORDS", value: `${d.prs} 🏆` },
    { label: "DURÉE", value: `${d.mins} min` },
    { label: "STREAK", value: `${d.streak} 🔥` },
  ];
  const colW = (W - 128) / stats.length;
  stats.forEach((s, i) => {
    const x = 64 + i * colW;
    ctx.fillStyle = d.styled ? "#e8b33d" : "#ede8df";
    ctx.font = "700 42px Arial";
    ctx.fillText(s.value, x, 380);
    ctx.fillStyle = "#8f8b84";
    ctx.font = "400 19px Arial";
    ctx.fillText(s.label, x, 415);
  });

  ctx.strokeStyle = d.styled ? "#c94d28" : "#333";
  ctx.beginPath(); ctx.moveTo(64, 460); ctx.lineTo(W - 64, 460); ctx.stroke();

  ctx.fillStyle = "#8f8b84";
  ctx.font = "700 21px Arial";
  ctx.fillText("EXERCICES PHARES", 64, 512);

  let y = 572;
  d.topExercises.forEach((ex, i) => {
    ctx.textAlign = "left";
    ctx.fillStyle = d.styled && i === 0 ? "#e8b33d" : "#ede8df";
    ctx.font = "600 36px Arial";
    const name = ex.name.length > 24 ? ex.name.slice(0, 23) + "…" : ex.name;
    ctx.fillText(name, 64, y);
    ctx.textAlign = "right";
    ctx.fillStyle = d.styled ? "#c94d28" : "#8f8b84";
    ctx.fillText(`${ex.weight} kg`, W - 64, y);
    y += 64;
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#8f8b84";
  ctx.font = "400 23px Arial";
  ctx.fillText("gym-ai-coach-1wls.onrender.com", W / 2, H - 60);

  if (d.styled) {
    const barGrad = ctx.createLinearGradient(0, H - 8, W, H - 8);
    barGrad.addColorStop(0, "#c94d28");
    barGrad.addColorStop(1, "#e8b33d");
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, H - 8, W, 8);
  }
}

function showShareModal(canvas) {
  document.getElementById("share-modal-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "share-modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card" style="max-width:420px">
      <button class="modal-close" type="button" id="share-modal-close">✕</button>
      <h2 style="margin-bottom:14px">Partager ma séance</h2>
      <img src="${canvas.toDataURL("image/png")}" style="width:100%;border-radius:12px;margin-bottom:16px;display:block" alt="Aperçu de la séance à partager"/>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="share-download-btn" type="button" style="flex:1">⬇️ Télécharger</button>
        <button class="btn btn-ghost" id="share-native-btn" type="button" style="flex:1">📤 Partager</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById("share-modal-close").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });

  document.getElementById("share-download-btn").addEventListener("click", () => {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gym-ai-coach-seance-${dayStr(new Date())}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  });

  const nativeBtn = document.getElementById("share-native-btn");
  if (!navigator.share || !navigator.canShare) {
    nativeBtn.style.display = "none";
  } else {
    nativeBtn.addEventListener("click", () => {
      canvas.toBlob(async blob => {
        const file = new File([blob], "seance-gym-ai-coach.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: "Ma séance Gym AI Coach" }); } catch {}
        }
      }, "image/png");
    });
  }
}

function dayStr(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = String(str||"");
  return d.innerHTML;
}

init();
