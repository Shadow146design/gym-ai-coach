async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");
  const { user } = await meRes.json();

  const h = new Date().getHours();
  const g = h < 12 ? "Bonjour" : h < 18 ? "Bonsoir" : "Bonsoir";
  document.getElementById("greeting").textContent = `${g} ${user.name} 👋`;

  await Promise.all([
    loadKPIs(), loadNextSession(), loadCalendar(), loadRecords(),
    loadLastAndTodayRecord(), loadDailyTip(),
  ]);
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
  }
}

// Anneau de progression vers le prochain palier (7j, 30j, 100j)
function updateStreakRing(streak) {
  const ring = document.getElementById("streak-ring-fg");
  if (!ring) return;
  const tiers = [7, 30, 100];
  let prevTier = 0, progress = 1;
  for (const tier of tiers) {
    if (streak < tier) { progress = (streak - prevTier) / (tier - prevTier); break; }
    prevTier = tier;
  }
  const r = 42;
  const circumference = 2 * Math.PI * r;
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${circumference * (1 - progress)}`;
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

async function loadCalendar() {
  try {
    const r = await fetch("/api/logs/calendar").then(r => r.json());
    const dayMap = {};
    (r.days || []).forEach(d => {
      dayMap[String(d.day).slice(0,10)] = { exercises: parseInt(d.exercises), volume: Math.round(d.volume) };
    });

    const grid = document.getElementById("calendar-grid");
    if (!grid) return;
    grid.innerHTML = "";
    const today = new Date();

    for (let w = 11; w >= 0; w--) {
      const week = document.createElement("div");
      week.className = "cal-week";
      for (let d = 6; d >= 0; d--) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + d));
        const key = date.toISOString().slice(0, 10);
        const data = dayMap[key];
        const cell = document.createElement("div");
        cell.className = "cal-day";
        if (date > today) {
          cell.style.cssText = "background:transparent;border:1px dashed rgba(237,232,223,.1)";
        } else if (data) {
          const i = Math.min(1, data.exercises / 6);
          cell.style.background = `rgba(201,77,40,${0.3 + i * 0.7})`;
          cell.title = `${date.toLocaleDateString("fr-FR")} — ${data.exercises} exercices, ${data.volume} kg`;
        } else {
          cell.style.background = "var(--bg-hover)";
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
