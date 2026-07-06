async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");
  const { user } = await meRes.json();

  const h = new Date().getHours();
  const g = h < 12 ? "Bonjour" : h < 18 ? "Bonsoir" : "Bonsoir";
  document.getElementById("greeting").textContent = `${g} ${user.name} 👋`;

  await Promise.all([
    loadKPIs(), loadNextSession(), loadCalendar(), loadRecords(),
    loadLastAndTodayRecord(), loadDailyTip(), loadPlateauAlert(), loadFormScore(),
  ]);

  maybeStartTour();
}

// ── Tour guidé (premiere visite apres l'onboarding) ───────────
const TOUR_STEPS = [
  { selector: ".streak-block", text: "Voici ton streak 🔥 — il augmente chaque jour où tu fais une séance." },
  { selector: ".btn-huge", text: "Clique ici pour commencer ta séance du jour." },
  { selector: "#records-list", text: "Tes records personnels s'affichent automatiquement ici, dès ta première séance loggée." },
];

function maybeStartTour() {
  if (localStorage.getItem("justOnboarded") !== "1") return;
  localStorage.removeItem("justOnboarded");
  startTour();
}

function startTour(step = 0) {
  document.querySelectorAll(".tour-overlay, .tour-spotlight, .tour-tooltip").forEach(el => el.remove());
  if (step >= TOUR_STEPS.length) return;

  const target = document.querySelector(TOUR_STEPS[step].selector);
  if (!target) return startTour(step + 1);

  const rect = target.getBoundingClientRect();
  const pad = 8;

  const overlay = document.createElement("div");
  overlay.className = "tour-overlay";

  const spot = document.createElement("div");
  spot.className = "tour-spotlight";
  spot.style.left = `${rect.left - pad}px`;
  spot.style.top = `${rect.top - pad}px`;
  spot.style.width = `${rect.width + pad * 2}px`;
  spot.style.height = `${rect.height + pad * 2}px`;

  const tooltip = document.createElement("div");
  tooltip.className = "tour-tooltip";
  const top = Math.min(rect.bottom + 14, window.innerHeight - 160);
  const left = Math.min(Math.max(rect.left, 16), window.innerWidth - 296);
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  tooltip.innerHTML = `
    <div class="tour-tooltip-text">${esc(TOUR_STEPS[step].text)}</div>
    <div class="tour-tooltip-actions">
      <button type="button" class="tour-tooltip-skip" id="tour-skip">Passer</button>
      <span class="tour-tooltip-step">${step + 1}/${TOUR_STEPS.length}</span>
      <button type="button" class="btn btn-primary btn-sm" id="tour-next">${step === TOUR_STEPS.length - 1 ? "Terminer" : "Suivant"}</button>
    </div>`;

  document.body.append(overlay, spot, tooltip);
  document.getElementById("tour-skip").addEventListener("click", () => startTour(TOUR_STEPS.length));
  document.getElementById("tour-next").addEventListener("click", () => startTour(step + 1));
  overlay.addEventListener("click", () => startTour(step + 1));
}

// ── Score de forme du jour ───────────────────────────────────
async function loadFormScore() {
  const badge = document.getElementById("form-score-badge");
  try {
    const r = await fetch("/api/logs/form-score").then(r => r.json());
    badge.classList.remove("skeleton");
    badge.textContent = r.score;
    document.getElementById("form-score-label").textContent = r.label;
    document.getElementById("fs-regularite").style.width = `${r.factors.regularite}%`;
    document.getElementById("fs-progression").style.width = `${r.factors.progression}%`;
    document.getElementById("fs-recuperation").style.width = `${r.factors.recuperation}%`;
  } catch {
    badge.classList.remove("skeleton");
    document.getElementById("form-score-label").textContent = "Impossible de charger.";
  }
}

// ── Alerte plateau ───────────────────────────────────────────
async function loadPlateauAlert() {
  try {
    const r = await fetch("/api/logs/plateau").then(r => r.json());
    const plateaus = r.plateaus || [];
    if (!plateaus.length) return;

    document.getElementById("plateau-alert-title").textContent =
      `⚠️ Plateau détecté sur ${plateaus.length} exercice${plateaus.length > 1 ? "s" : ""}`;
    document.getElementById("plateau-alert-list").textContent =
      plateaus.map(p => `${p.exercise_name} (${p.max_weight}kg depuis ${p.sessions_stuck} séances)`).join(", ");

    sessionStorage.setItem("plateauData", JSON.stringify(plateaus));
    document.getElementById("plateau-alert-btn").href = `/dashboard.html?plateau=1`;

    document.getElementById("plateau-alert").classList.remove("hidden");
  } catch {}
}

// ── Dernière séance + record du jour (via /api/logs/summary) ──
async function loadLastAndTodayRecord() {
  const lastEl = document.getElementById("last-session-card");
  const recordEl = document.getElementById("today-record-card");
  try {
    const r = await fetch("/api/logs/summary").then(r => r.json());

    if (r.lastSession) {
      const date = new Date(r.lastSession.day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      lastEl.innerHTML = `
        <div style="font-family:var(--font-display);font-weight:600;font-size:1rem">${esc(date)}</div>
        <div style="font-size:.82rem;color:var(--chalk-dim);margin-top:4px">${r.lastSession.exercises} exercice${r.lastSession.exercises > 1 ? "s" : ""} réalisé${r.lastSession.exercises > 1 ? "s" : ""}</div>`;
    } else {
      lastEl.innerHTML = `<p class="muted" style="font-size:.88rem">Pas encore de séance loggée.</p>`;
    }

    if (r.topRecord) {
      const date = new Date(r.topRecord.achieved_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
      recordEl.innerHTML = `
        <div style="font-family:var(--font-display);font-weight:600;font-size:1rem">${esc(r.topRecord.exercise_name)}</div>
        <div style="font-size:1.1rem;color:var(--gold);font-family:var(--font-mono);margin-top:4px">${r.topRecord.max_weight} kg</div>
        <div style="font-size:.78rem;color:var(--chalk-dim);margin-top:2px">le ${esc(date)}</div>`;
    } else {
      recordEl.innerHTML = `<p class="muted" style="font-size:.88rem">Logge une séance pour débloquer tes records.</p>`;
    }
  } catch {
    lastEl.innerHTML = `<p class="muted" style="font-size:.88rem">Impossible de charger.</p>`;
    recordEl.innerHTML = `<p class="muted" style="font-size:.88rem">Impossible de charger.</p>`;
  }
}

// ── Conseil du jour (IA) ───────────────────────────────────
async function loadDailyTip() {
  const el = document.getElementById("daily-tip-text");
  try {
    const r = await fetch("/api/logs/daily-tip").then(r => r.json());
    el.textContent = r.tip || "Chaque séance compte : reste régulier, les résultats suivent.";
  } catch {
    el.textContent = "Chaque séance compte : reste régulier, les résultats suivent.";
  }
}

async function loadKPIs() {
  try {
    const [streakData, dashData] = await Promise.all([
      fetch("/api/logs/streak").then(r => r.json()),
      fetch("/api/logs/dashboard-stats").then(r => r.json()),
    ]);

    // Streak — valeur numérique garantie
    const streak = Number(streakData.current ?? streakData.streak) || 0;
    const best   = Number(streakData.best)   || 0;

    document.getElementById("streak-num").textContent = streak;
    updateStreakRing(streak);
    ["stat-sessions", "stat-best", "stat-assiduite"].forEach(id =>
      document.getElementById(id).classList.remove("skeleton", "skeleton-line"));
    document.getElementById("stat-sessions").textContent = dashData.totalSessions || 0;
    document.getElementById("stat-best").textContent = `${best}j`;
    document.getElementById("stat-assiduite").textContent =
      dashData.completionRate !== null ? `${dashData.completionRate}%` : "—";

    const lastDate = dashData.lastSessionDate
      ? new Date(dashData.lastSessionDate).toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })
      : null;
    document.getElementById("last-session-txt").textContent =
      lastDate ? `Dernière séance : ${lastDate}` : "Pas encore de séance — commence maintenant !";
  } catch(e) {
    document.getElementById("streak-num").textContent = "0";
    ["stat-sessions", "stat-best", "stat-assiduite"].forEach(id => {
      const el = document.getElementById(id);
      el.classList.remove("skeleton", "skeleton-line");
      el.textContent = "—";
    });
  }
}

// Anneau de progression vers le prochain palier (7j, 30j, 100j)
function updateStreakRing(streak) {
  const ring = document.getElementById("streak-ring-fg");
  if (!ring) return;
  const tiers = [7, 30, 100];
  let prevTier = 0, progress = 1, nextTier = null;
  for (const tier of tiers) {
    if (streak < tier) { progress = (streak - prevTier) / (tier - prevTier); nextTier = tier; break; }
    prevTier = tier;
  }
  const r = 42;
  const circumference = 2 * Math.PI * r;
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${circumference * (1 - progress)}`;

  const nextTierEl = document.getElementById("streak-next-tier");
  if (nextTierEl) {
    nextTierEl.textContent = nextTier ? `Objectif : ${nextTier} jours` : "Palier maximum atteint 🏆";
  }
}

// Jours de semaine en francais, index 0 = lundi (aligne sur un vrai calendrier,
// contrairement a Date.getDay() ou 0 = dimanche).
const WEEKDAYS_FR = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

// Trouve le jour du programme le plus proche dans le futur (aujourd'hui inclus)
// en se basant sur le vrai jour de la semaine. Retourne null si le programme
// n'utilise pas de vrais noms de jours (anciens programmes generes avant la
// mise a jour du prompt IA), pour permettre un repli sur l'ancienne logique.
function findNextProgramDay(days) {
  const withWeekday = days.map(d => {
    const label = (d.day || "").toLowerCase();
    return { ...d, weekdayIdx: WEEKDAYS_FR.findIndex(w => label.includes(w)) };
  });
  const known = withWeekday.filter(d => d.weekdayIdx !== -1);
  if (!known.length) return null;

  const todayIdx = (new Date().getDay() + 6) % 7; // JS: 0=dimanche -> on veut 0=lundi
  let best = null, bestDelta = Infinity;
  known.forEach(d => {
    const delta = (d.weekdayIdx - todayIdx + 7) % 7;
    if (delta < bestDelta) { bestDelta = delta; best = d; }
  });
  return best;
}

async function loadNextSession() {
  const el = document.getElementById("next-session-card");
  try {
    const [progRes, streakRes] = await Promise.all([
      fetch("/api/program/active").then(r => r.json()),
      fetch("/api/logs/streak").then(r => r.json()),
    ]);
    if (!progRes.program) {
      el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <p class="muted" style="font-size:.88rem">Aucun programme actif.</p>
        <a class="btn btn-primary btn-sm" href="/questionnaire.html">Créer mon programme</a></div>`;
      return;
    }
    const days = progRes.program.content.days || [];
    // Programmes recents : vrais jours de semaine -> jour le plus proche dans le futur.
    // Anciens programmes ("Jour 1", "Jour 2"...) : repli sur la rotation par streak.
    const streak = Number(streakRes.current ?? streakRes.streak) || 0;
    const next = findNextProgramDay(days) || days[streak % days.length];
    const exList = (next.exercises || []).slice(0, 4).map(e =>
      `<div class="next-ex-row"><span>${esc(e.name)}</span><span class="mono" style="font-size:.78rem;color:var(--chalk-dim)">${e.sets}×${e.reps}</span></div>`
    ).join("");

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:.04em;font-size:1rem">${esc(next.day)}</div>
          <div style="font-size:.82rem;color:var(--chalk-dim);margin:3px 0 12px">${esc(next.focus||"")}</div>
          ${exList}
          ${(next.exercises||[]).length > 4 ? `<div style="font-size:.75rem;color:var(--chalk-dim);margin-top:4px">+${(next.exercises.length-4)} autres exercices</div>` : ""}
        </div>
        <a class="btn btn-primary" href="/session.html">▶ C'est parti !</a>
      </div>`;
  } catch { el.innerHTML = `<p class="muted" style="font-size:.88rem">Impossible de charger.</p>`; }
}

// Convertit une Date locale en "YYYY-MM-DD" sans passer par toISOString() (qui
// decale d'un jour hors UTC) : meme bug que cote serveur, mais cote navigateur
// cette fois (le fuseau du visiteur, pas celui du serveur).
function localDayStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function loadCalendar() {
  try {
    const r = await fetch("/api/logs/calendar").then(r => r.json());
    console.log("Calendrier — données reçues :", r);
    const dayMap = {};
    (r.days || []).forEach(d => {
      dayMap[String(d.day).slice(0, 10)] = { exercises: parseInt(d.exercises), volume: Math.round(d.volume) };
    });

    const grid = document.getElementById("calendar-grid");
    const monthsRow = document.getElementById("calendar-months");
    if (!grid) return;
    grid.innerHTML = "";
    if (monthsRow) monthsRow.innerHTML = "";
    const today = new Date();
    let lastMonth = null;

    for (let w = 11; w >= 0; w--) {
      const week = document.createElement("div");
      week.className = "cal-week";

      // Le premier jour de cette colonne determine le mois affiche au-dessus.
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (w * 7 + 6));
      const monthLabel = weekStart.toLocaleDateString("fr-FR", { month: "short" });
      if (monthsRow) {
        const label = document.createElement("div");
        label.className = "cal-month-label";
        if (monthLabel !== lastMonth) { label.textContent = monthLabel; lastMonth = monthLabel; }
        monthsRow.appendChild(label);
      }

      for (let d = 6; d >= 0; d--) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + d));
        const key = localDayStr(date);
        const data = dayMap[key];
        const cell = document.createElement("div");
        const dateLabel = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

        if (date > today) {
          cell.className = "cal-day future";
          cell.title = dateLabel;
        } else if (data && data.exercises > 0) {
          const tier = data.exercises >= 4 ? "good" : "light";
          cell.className = `cal-day ${tier}`;
          cell.title = `${dateLabel} — ${data.exercises} exercice${data.exercises > 1 ? "s" : ""}, ${data.volume} kg`;
        } else {
          cell.className = "cal-day rest";
          cell.title = `${dateLabel} — Repos`;
        }
        week.appendChild(cell);
      }
      grid.appendChild(week);
    }
  } catch(e) { console.error("Calendar:", e); }
}

async function loadRecords() {
  const el = document.getElementById("records-list");
  try {
    const r = await fetch("/api/logs/records").then(r => r.json());
    if (!r.records?.length) {
      el.innerHTML = `<p class="muted" style="font-size:.85rem">Logge ta première séance pour voir tes records ici.</p>`;
      return;
    }
    el.innerHTML = r.records.slice(0, 6).map(rec => `
      <div class="home-record-row">
        <span>${esc(rec.exercise_name)}</span>
        <span class="home-record-val">${rec.max_weight} kg</span>
      </div>`).join("");
  } catch { el.innerHTML = `<p class="muted" style="font-size:.85rem">Impossible de charger.</p>`; }
}

function esc(s) { const d = document.createElement("div"); d.textContent = String(s||""); return d.innerHTML; }

init();
