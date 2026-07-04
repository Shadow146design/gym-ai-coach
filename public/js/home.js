// ── Theme ─────────────────────────────────────────────────
const html = document.documentElement;
const themeBtn = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("theme") || "dark";
html.setAttribute("data-theme", savedTheme);
if (themeBtn) {
  themeBtn.textContent = savedTheme === "dark" ? "☀️" : "🌙";
  themeBtn.addEventListener("click", () => {
    const t = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
    themeBtn.textContent = t === "dark" ? "☀️" : "🌙";
  });
}

async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");
  const { user } = await meRes.json();

  const h = new Date().getHours();
  const g = h < 12 ? "Bonjour" : h < 18 ? "Bonsoir" : "Bonsoir";
  document.getElementById("greeting").textContent = `${g} ${user.name} 👋`;

  await Promise.all([loadKPIs(), loadNextSession(), loadCalendar(), loadRecords()]);
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
    const streak = Number(streakRes.current ?? streakRes.streak) || 0;
    const next = days[streak % days.length];
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

document.getElementById("logout-link")?.addEventListener("click", async e => {
  e.preventDefault();
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
});

init();
