async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");
  const { user } = await meRes.json();

  const h = new Date().getHours();
  const g = h < 12 ? "Bonjour" : h < 18 ? "Bonsoir" : "Bonsoir";
  document.getElementById("greeting").textContent = `${g} ${user.name} 👋`;

  if (user.role === "user") showPremiumBanner();
  loadWellness(user.role);

  await Promise.all([
    loadKPIs(), loadNextSession(), loadCalendar(), loadRecords(),
    loadLastAndTodayRecord(), loadDailyTip(), loadNutritionTip(), loadPlateauAlert(), loadFatigueAlert(), loadFormScore(),
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

// ── Alerte fatigue (fonctionnalité 3.3) ───────────────────────
async function loadFatigueAlert() {
  try {
    const r = await fetch("/api/logs/fatigue").then(r => r.json());
    if (!r.fatigued) return;

    document.getElementById("fatigue-alert-text").textContent =
      r.suggestion || "⚠️ Tu sembles fatigué ces derniers temps. Une semaine de décharge pourrait être bénéfique.";
    document.getElementById("fatigue-alert").classList.remove("hidden");
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

async function loadNutritionTip() {
  const el = document.getElementById("nutrition-tip-text");
  const FALLBACK = "Priorise les protéines à chaque repas et reste hydraté tout au long de la journée.";
  try {
    const r = await fetch("/api/nutrition/daily-tip").then(r => r.json());
    el.textContent = r.tip || FALLBACK;
  } catch {
    el.textContent = FALLBACK;
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

// Trouve le jour du programme le plus proche dans le futur (aujourd'hui inclus,
// sauf si trainedToday) en se basant sur le vrai jour de la semaine. Retourne
// null si le programme n'utilise pas de vrais noms de jours (anciens
// programmes generes avant la mise a jour du prompt IA), pour permettre un
// repli sur l'ancienne logique.
function findNextProgramDay(days, trainedToday) {
  const withWeekday = days.map(d => {
    const label = (d.day || "").toLowerCase();
    return { ...d, weekdayIdx: WEEKDAYS_FR.findIndex(w => label.includes(w)) };
  });
  const known = withWeekday.filter(d => d.weekdayIdx !== -1);
  if (!known.length) return null;

  const todayIdx = (new Date().getDay() + 6) % 7; // JS: 0=dimanche -> on veut 0=lundi
  let best = null, bestDelta = Infinity;
  known.forEach(d => {
    let delta = (d.weekdayIdx - todayIdx + 7) % 7;
    // La seance du jour a deja ete faite : ne jamais la re-proposer, la
    // reporter a sa prochaine occurrence (semaine suivante).
    if (delta === 0 && trainedToday) delta = 7;
    if (delta < bestDelta) { bestDelta = delta; best = d; }
  });
  return best;
}

async function loadNextSession() {
  const el = document.getElementById("next-session-card");
  try {
    const [progRes, streakRes, wellnessRes] = await Promise.all([
      fetch("/api/program/active").then(r => r.json()),
      fetch("/api/logs/streak").then(r => r.json()),
      fetch("/api/wellness/today").then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    const lowForm = (wellnessRes?.entry?.score ?? 100) < 50;
    if (!progRes.program) {
      el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <p class="muted" style="font-size:.88rem">Aucun programme actif.</p>
        <a class="btn btn-primary btn-sm" href="/questionnaire.html">Créer mon programme</a></div>`;
      return;
    }
    const days = progRes.program.content.days || [];
    // Programmes recents : vrais jours de semaine -> jour le plus proche dans le futur.
    // Anciens programmes ("Jour 1", "Jour 2"...) : repli sur la rotation par
    // nombre total de seances (et non le streak courant, qui repart a 0 des
    // qu'un jour est manque et faisait alors regresser la rotation au lieu
    // de simplement avancer au jour suivant).
    const trainedToday = !!streakRes.trainedToday;
    const totalSessions = Number(streakRes.totalSessions) || 0;
    const next = findNextProgramDay(days, trainedToday) || days[totalSessions % days.length];
    const exList = (next.exercises || []).slice(0, 4).map(e =>
      `<div class="next-ex-row"><span>${esc(e.name)}</span><span class="mono" style="font-size:.78rem;color:var(--chalk-dim)">${e.sets}×${e.reps}</span></div>`
    ).join("");

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <div style="font-family:var(--font-display);text-transform:uppercase;letter-spacing:.04em;font-size:1rem">${esc(next.day)}</div>
            ${muscleBadgeHtml(next.focus)}
          </div>
          <div style="font-size:.82rem;color:var(--chalk-dim);margin:3px 0 12px">${esc(next.focus||"")}</div>
          ${exList}
          ${(next.exercises||[]).length > 4 ? `<div style="font-size:.75rem;color:var(--chalk-dim);margin-top:4px">+${(next.exercises.length-4)} autres exercices</div>` : ""}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <a class="btn btn-primary" href="/session.html">▶ C'est parti !</a>
          ${lowForm ? `<span style="font-size:.72rem;color:var(--gold)">(intensité réduite recommandée)</span>` : ""}
        </div>
      </div>`;
  } catch { el.innerHTML = `<p class="muted" style="font-size:.88rem">Impossible de charger.</p>`; }
}

// Convertit une Date locale en "YYYY-MM-DD" sans passer par toISOString() (qui
// decale d'un jour hors UTC) : meme bug que cote serveur, mais cote navigateur
// cette fois (le fuseau du visiteur, pas celui du serveur).
function localDayStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let calYear, calMonth; // mois affiche (1-12)

async function loadCalendar(year, month) {
  const today = new Date();
  if (year === undefined) {
    calYear = today.getFullYear();
    calMonth = today.getMonth() + 1;
  } else {
    calYear = year;
    calMonth = month;
  }

  const grid = document.getElementById("calendar-grid");
  if (!grid) return;

  const monthStr = `${calYear}-${String(calMonth).padStart(2, "0")}`;
  try {
    const [calData, streakData] = await Promise.all([
      fetch(`/api/logs/calendar?month=${monthStr}`).then(r => r.json()),
      fetch("/api/logs/streak").then(r => r.json()),
    ]);

    const dayMap = {};
    (calData.days || []).forEach(d => {
      dayMap[d.day] = { exercises: Number(d.exercises), volume: Math.round(Number(d.volume) || 0) };
    });

    document.getElementById("cal-stat-sessions").textContent = calData.sessionsThisMonth ?? 0;
    document.getElementById("cal-stat-streak").textContent = streakData.current ?? 0;
    document.getElementById("cal-stat-volume").textContent = (calData.volumeThisMonth ?? 0).toLocaleString("fr-FR");

    renderCalendarHeader(today);
    renderCalendarGrid(dayMap, today);
  } catch (e) {
    console.error("Calendar:", e);
    grid.innerHTML = `<p class="muted" style="font-size:.85rem">Impossible de charger le calendrier.</p>`;
  }
}

function renderCalendarHeader(today) {
  const label = new Date(calYear, calMonth - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  document.getElementById("cal-title").textContent = label;

  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth() + 1;
  document.getElementById("cal-next").disabled = isCurrentMonth;
  document.getElementById("cal-today-btn").classList.toggle("hidden", isCurrentMonth);
}

function renderCalendarGrid(dayMap, today) {
  const grid = document.getElementById("calendar-grid");
  const tooltip = document.getElementById("cal-tooltip");
  const todayStr = localDayStr(today);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const firstOfMonth = new Date(calYear, calMonth - 1, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  grid.innerHTML = cells.map(d => {
    if (d === null) return `<div class="cal-cell empty"></div>`;
    const dateObj = new Date(calYear, calMonth - 1, d);
    const key = localDayStr(dateObj);
    const data = dayMap[key];
    const isToday = key === todayStr;
    const isFuture = dateObj > todayMidnight;
    const trained = !!(data && data.exercises > 0);

    let cls = "cal-cell";
    if (isFuture) cls += " cal-future";
    else if (trained) cls += isToday ? " cal-today-done" : " cal-done";
    else if (isToday) cls += " cal-today-pending";
    else cls += " cal-rest";

    const attrs = trained ? ` data-exercises="${data.exercises}" data-volume="${data.volume}"` : "";
    return `<button type="button" class="${cls}" data-date="${key}"${attrs}><span class="cal-num">${d}</span></button>`;
  }).join("");

  grid.querySelectorAll(".cal-done, .cal-today-done").forEach(cell => {
    cell.addEventListener("click", e => {
      e.stopPropagation();
      const ex = Number(cell.dataset.exercises);
      const vol = Number(cell.dataset.volume);
      tooltip.textContent = `${ex} exercice${ex > 1 ? "s" : ""} — Volume ${vol.toLocaleString("fr-FR")} kg`;
      const cellRect = cell.getBoundingClientRect();
      const cardRect = grid.closest(".home-card").getBoundingClientRect();
      tooltip.style.left = `${cellRect.left - cardRect.left + cellRect.width / 2}px`;
      tooltip.style.top = `${cellRect.top - cardRect.top}px`;
      tooltip.classList.remove("hidden");
    });
  });
}

document.addEventListener("click", e => {
  const tooltip = document.getElementById("cal-tooltip");
  if (tooltip && !tooltip.classList.contains("hidden") && !e.target.closest(".cal-done, .cal-today-done")) {
    tooltip.classList.add("hidden");
  }
});

document.getElementById("cal-prev")?.addEventListener("click", () => {
  let m = calMonth - 1, y = calYear;
  if (m < 1) { m = 12; y--; }
  loadCalendar(y, m);
});
document.getElementById("cal-next")?.addEventListener("click", () => {
  if (document.getElementById("cal-next").disabled) return;
  let m = calMonth + 1, y = calYear;
  if (m > 12) { m = 1; y++; }
  loadCalendar(y, m);
});
document.getElementById("cal-today-btn")?.addEventListener("click", () => {
  const today = new Date();
  loadCalendar(today.getFullYear(), today.getMonth() + 1);
});

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

// Banniere non-intrusive pour les gratuits : masquee a la fermeture, reapparait
// au bout de 3 jours (Fonctionnalite 13).
function showPremiumBanner() {
  const DISMISS_KEY = "premiumBannerDismissedAt";
  const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  if (dismissedAt && Date.now() - dismissedAt < THREE_DAYS) return;

  const el = document.getElementById("premium-banner");
  if (!el) return;
  el.className = "premium-banner";
  el.innerHTML = `
    <span>⭐ Passe en Premium pour débloquer l'IA complète — 9.99€/mois</span>
    <div style="display:flex;align-items:center;gap:10px">
      <a class="btn btn-primary btn-sm" href="/premium.html">Découvrir</a>
      <button type="button" class="premium-banner-close" id="premium-banner-close" aria-label="Fermer">✕</button>
    </div>`;
  document.getElementById("premium-banner-close").addEventListener("click", () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    el.className = "";
    el.innerHTML = "";
  });
}

// ── Bien-etre du jour (Fonctionnalite 3, PREMIUM) ────────────
function wellnessGaugeColor(score) {
  if (score > 75) return "var(--green)";
  if (score >= 50) return "var(--gold)";
  return "var(--rust-soft)";
}

function renderWellnessResult(score, message) {
  const el = document.getElementById("wellness-content");
  el.innerHTML = `
    <div class="wellness-result">
      <div class="wellness-gauge-wrap">
        <div class="wellness-gauge-track"><div class="wellness-gauge-fill" style="width:${score}%;background:${wellnessGaugeColor(score)}"></div></div>
        <div class="wellness-message">${esc(message)}</div>
      </div>
      <div class="wellness-score-val" style="color:${wellnessGaugeColor(score)}">${score}</div>
    </div>`;
}

async function loadWellness(role) {
  const el = document.getElementById("wellness-content");
  if (role === "user") {
    lockSection(el, { title: "Bien-être du jour — Premium", desc: "Un check-in de 3 secondes chaque jour pour adapter tes charges à ta forme réelle." });
    return;
  }

  try {
    const r = await fetch("/api/wellness/today").then(r => r.json());
    if (r.entry) {
      renderWellnessResult(r.entry.score, r.entry.message);
    } else {
      el.innerHTML = `
        <div class="wellness-cta">
          <span class="muted" style="font-size:.85rem">Pas encore répondu aujourd'hui.</span>
          <button class="btn btn-primary btn-sm" type="button" id="wellness-open-btn">Répondre en 3 secondes</button>
        </div>`;
      document.getElementById("wellness-open-btn").addEventListener("click", openWellnessModal);
      openWellnessModal();
    }
  } catch {
    el.innerHTML = `<p class="muted" style="font-size:.85rem">Impossible de charger.</p>`;
  }
}

function openWellnessModal() {
  document.getElementById("wellness-modal-overlay").classList.remove("hidden");
}
function closeWellnessModal() {
  document.getElementById("wellness-modal-overlay").classList.add("hidden");
}

["sleep", "energy", "soreness"].forEach(key => {
  const input = document.getElementById(`wellness-${key}`);
  const out = document.getElementById(`${key}-val`);
  input?.addEventListener("input", () => { out.textContent = input.value; });
});

document.getElementById("wellness-modal-close")?.addEventListener("click", closeWellnessModal);
document.getElementById("wellness-modal-overlay")?.addEventListener("click", e => {
  if (e.target.id === "wellness-modal-overlay") closeWellnessModal();
});

document.getElementById("wellness-submit-btn")?.addEventListener("click", async () => {
  const sleep_quality = document.getElementById("wellness-sleep").value;
  const energy_level = document.getElementById("wellness-energy").value;
  const soreness = document.getElementById("wellness-soreness").value;
  try {
    const res = await fetch("/api/wellness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sleep_quality, energy_level, soreness }),
    });
    const data = await res.json();
    closeWellnessModal();
    if (res.ok) renderWellnessResult(data.score, data.message);
  } catch { closeWellnessModal(); }
});

init();
