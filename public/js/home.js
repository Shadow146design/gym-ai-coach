// ── Theme ─────────────────────────────────────────────────
const html = document.documentElement;
const themeBtn = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("theme") || "dark";
html.setAttribute("data-theme", savedTheme);
themeBtn.textContent = savedTheme === "dark" ? "☀️" : "🌙";
themeBtn.addEventListener("click", () => {
  const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  themeBtn.textContent = next === "dark" ? "☀️" : "🌙";
});

// ── Auth ──────────────────────────────────────────────────
async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");
  const { user } = await meRes.json();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bonsoir" : "Bonsoir";
  document.getElementById("greeting").textContent = `${greeting} ${user.name} 👋`;

  await Promise.all([loadStreak(), loadCalendar(), loadNextSession(), loadRecentPRs()]);
}

async function loadStreak() {
  const r = await fetch("/api/logs/streak").then(r=>r.json());
  const { streak, best } = r;

  const lastR = await fetch("/api/logs/dashboard-stats").then(r=>r.json());
  const lastDate = lastR.lastSessionDate
    ? new Date(lastR.lastSessionDate).toLocaleDateString("fr-FR", {weekday:"long",day:"numeric",month:"long"})
    : "jamais";

  document.getElementById("last-session-txt").textContent =
    lastR.lastSessionDate ? `Dernière séance : ${lastDate}` : "Pas encore de séance enregistrée";

  document.getElementById("quick-kpi").innerHTML = `
    <div class="kpi-tile">
      <div class="kpi-label">🔥 Streak actuel</div>
      <div class="kpi-value" style="color:var(--rust-soft)">${streak}</div>
      <div class="kpi-sub">jours consécutifs</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">🏅 Meilleur streak</div>
      <div class="kpi-value">${best}</div>
      <div class="kpi-sub">jours consécutifs</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">📊 Séances totales</div>
      <div class="kpi-value">${lastR.totalSessions || 0}</div>
    </div>
    <div class="kpi-tile">
      <div class="kpi-label">✅ Assiduité 4 sem.</div>
      <div class="kpi-value" style="color:${(lastR.completionRate||0)>=80?'var(--green)':(lastR.completionRate||0)>=50?'var(--gold)':'var(--rust-soft)'}">
        ${lastR.completionRate !== null ? lastR.completionRate + '%' : '—'}
      </div>
    </div>`;
}

async function loadCalendar() {
  const r = await fetch("/api/logs/calendar").then(r=>r.json());
  const { days } = r;
  const dayMap = {};
  days.forEach(d => { dayMap[d.day.slice(0,10)] = { exercises: parseInt(d.exercises), volume: Math.round(d.volume) }; });

  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";
  const today = new Date();

  // 12 semaines = 84 jours
  for (let w = 11; w >= 0; w--) {
    const weekDiv = document.createElement("div");
    weekDiv.className = "cal-week";
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * 7 + d));
      const key = date.toISOString().slice(0,10);
      const data = dayMap[key];
      const cell = document.createElement("div");
      cell.className = "cal-day";
      if (data) {
        const intensity = Math.min(1, data.exercises / 6);
        cell.style.background = `rgba(201,77,40,${0.3 + intensity * 0.7})`;
        cell.title = `${date.toLocaleDateString("fr-FR")} — ${data.exercises} exercices, ${data.volume} kg`;
      } else if (date > today) {
        cell.style.background = "transparent";
        cell.style.border = "1px dashed var(--chalk-faint)";
      } else {
        cell.style.background = "var(--bg-hover)";
        cell.title = date.toLocaleDateString("fr-FR");
      }
      weekDiv.appendChild(cell);
    }
    grid.appendChild(weekDiv);
  }
}

async function loadNextSession() {
  const el = document.getElementById("next-session-content");
  try {
    const r = await fetch("/api/program/active").then(r=>r.json());
    if (!r.program) {
      el.innerHTML = `Pas encore de programme. <a href="/questionnaire.html" class="muted" style="text-decoration:underline">Génère-en un</a>`;
      return;
    }
    const days = r.program.content.days || [];
    const streak = await fetch("/api/logs/streak").then(r=>r.json());
    const nextIdx = streak.streak % days.length;
    const nextDay = days[nextIdx];
    el.innerHTML = `<strong>${esc(nextDay.day)}</strong> — ${esc(nextDay.focus||"")}
      <div style="margin-top:8px;font-size:.83rem;color:var(--chalk-dim)">
        ${(nextDay.exercises||[]).slice(0,4).map(e=>`• ${esc(e.name)}`).join("<br>")}
        ${(nextDay.exercises||[]).length > 4 ? `<br>• +${(nextDay.exercises.length-4)} autres…` : ""}
      </div>
      <a class="btn btn-primary btn-sm" href="/session.html" style="margin-top:12px;display:inline-flex">Commencer ▶</a>`;
  } catch { el.textContent = "Impossible de charger."; }
}

async function loadRecentPRs() {
  const el = document.getElementById("last-pr-content");
  const r = await fetch("/api/logs/records").then(r=>r.json());
  if (!r.records?.length) { el.textContent = "Logge ta première séance pour voir tes records."; return; }
  el.innerHTML = r.records.slice(0,5).map(rec =>
    `<div class="flex-between" style="padding:7px 0;border-bottom:1px solid var(--border-soft)">
      <span style="font-size:.9rem">${esc(rec.exercise_name)}</span>
      <span class="mono" style="color:var(--gold)">${rec.max_weight} kg</span>
    </div>`).join("");
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = String(str||"");
  return d.innerHTML;
}

document.getElementById("logout-link").addEventListener("click", async e => {
  e.preventDefault();
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
});

init();
