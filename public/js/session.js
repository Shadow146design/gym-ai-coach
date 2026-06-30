// ── State ─────────────────────────────────────────────────
let program = null;
let selectedDay = null;
let recentLogs = {};
let sessionLogs = [];
let timerInterval = null;
let secondsElapsed = 0;
let postChatHistory = [];

// ── Init ──────────────────────────────────────────────────
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
  grid.innerHTML = "";
  (program.content.days || []).forEach((day, i) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-ghost";
    btn.style.cssText = "text-align:left;padding:18px 20px;border-radius:var(--radius-lg);height:auto;flex-direction:column;align-items:flex-start;gap:6px;";
    btn.innerHTML = `
      <span style="font-family:var(--font-display);font-size:1rem;text-transform:uppercase;letter-spacing:.04em">${esc(day.day)}</span>
      <span style="font-size:.8rem;color:var(--chalk-dim);text-transform:none;letter-spacing:0;font-family:var(--font-body)">${esc(day.focus||"")}</span>
      <span style="font-size:.75rem;color:var(--steel-soft);font-family:var(--font-mono)">${(day.exercises||[]).length} exercices</span>`;
    btn.addEventListener("click", () => {
      selectedDay = program.content.days[i];
      document.getElementById("step-pick").classList.add("hidden");
      startSession();
    });
    grid.appendChild(btn);
  });
}

// ── Étape 2 : séance ──────────────────────────────────────
function startSession() {
  document.getElementById("session-day-title").textContent = selectedDay.day;
  document.getElementById("session-day-focus").textContent = selectedDay.focus || "";

  const container = document.getElementById("session-exercises");
  container.innerHTML = "";

  (selectedDay.exercises || []).forEach((ex, ei) => {
    const recent = recentLogs[ex.name];
    const defaultWeight = recent ? recent.weight : "";
    const sets = typeof ex.sets === "number" ? ex.sets : parseInt(ex.sets) || 3;
    const repsHint = ex.reps || "?";
    const prevTxt = recent
      ? `Dernière fois : ${recent.weight} kg × ${recent.reps} reps`
      : "Première fois ici";

    const card = document.createElement("div");
    card.className = "session-exercise-card";
    card.dataset.exercise = ex.name;
    card.dataset.muscleGroup = ex.muscle_group || "";
    card.dataset.previousWeight = recent ? recent.weight : "null";

    let setsHtml = `<div style="padding:6px 18px 4px;font-size:.7rem;color:var(--chalk-dim);display:grid;grid-template-columns:28px 1fr 1fr 36px;gap:8px;text-transform:uppercase;letter-spacing:.04em">
      <span>#</span><span>Poids kg</span><span>Reps</span><span></span></div>`;

    for (let s = 1; s <= sets; s++) {
      setsHtml += `
        <div class="set-row" data-set="${s}" data-ex="${ei}">
          <div class="set-num">${s}</div>
          <input type="number" class="weight-input" step="0.5" min="0" value="${defaultWeight}" placeholder="kg" />
          <input type="number" class="reps-input" min="1" value="${recent ? recent.reps : ""}" placeholder="${repsHint}" />
          <button class="done-btn" data-ex="${ei}" data-set="${s}">✓</button>
        </div>`;
    }

    card.innerHTML = `
      <div class="session-exercise-header">
        <div>
          <h3>${esc(ex.name)}</h3>
          <div style="font-size:.78rem;color:var(--chalk-dim);margin-top:3px">${sets} × ${repsHint} — repos ${ex.rest_seconds||"?"}s</div>
          <div style="font-size:.72rem;color:var(--steel-soft);margin-top:2px">${esc(prevTxt)}</div>
        </div>
        ${ex.muscle_group ? `<span class="muscle-tag">${esc(ex.muscle_group)}</span>` : ""}
      </div>
      ${setsHtml}`;

    container.appendChild(card);
  });

  container.querySelectorAll(".done-btn").forEach(btn => {
    btn.addEventListener("click", () => completeSet(btn));
  });

  secondsElapsed = 0;
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

  if (!weight && weight !== 0) { row.querySelector(".weight-input").focus(); return; }
  if (!reps || reps < 1) { row.querySelector(".reps-input").focus(); return; }

  btn.classList.add("checked");
  btn.disabled = true;
  row.classList.add("completed");

  sessionLogs.push({
    exercise_name: card.dataset.exercise,
    muscle_group: card.dataset.muscleGroup || null,
    previous_weight: card.dataset.previousWeight === "null" ? null : parseFloat(card.dataset.previousWeight),
    weight, reps, sets: 1,
  });
}

// ── Terminer ──────────────────────────────────────────────
document.getElementById("finish-btn").addEventListener("click", async () => {
  if (sessionLogs.length === 0) { alert("Valide au moins une série avant de terminer !"); return; }
  clearInterval(timerInterval);
  document.getElementById("finish-btn").disabled = true;
  document.getElementById("finish-btn").textContent = "Enregistrement…";

  await Promise.all(sessionLogs.map(log =>
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    })
  ));

  document.getElementById("step-session").classList.add("hidden");
  await showRecap();
  document.getElementById("step-recap").classList.remove("hidden");
  triggerDebrief();
});

// ── Récap ─────────────────────────────────────────────────
async function showRecap() {
  const [recapRes, volumeRes] = await Promise.all([
    fetch("/api/logs/recap"),
    fetch("/api/logs/volume"),
  ]);
  const { recap } = await recapRes.json();
  const { volume } = await volumeRes.json();

  const totalVolume = sessionLogs.reduce((a, r) => a + r.weight * r.reps, 0);
  const prs = sessionLogs.filter(r => r.previous_weight === null || r.weight > r.previous_weight).length;
  const mins = Math.round(secondsElapsed / 60);

  document.getElementById("recap-stats").innerHTML = `
    <div class="kpi-tile"><div class="kpi-label">Séries</div><div class="kpi-value">${sessionLogs.length}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Volume</div><div class="kpi-value">${Math.round(totalVolume)}<span style="font-size:.9rem"> kg</span></div></div>
    <div class="kpi-tile"><div class="kpi-label">Records 🏆</div><div class="kpi-value" style="color:var(--gold)">${prs}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Durée</div><div class="kpi-value">${mins}<span style="font-size:.9rem"> min</span></div></div>`;

  const byEx = {};
  recap.forEach(r => {
    if (!byEx[r.exercise_name]) byEx[r.exercise_name] = { rows: [], prev: r.previous_weight };
    byEx[r.exercise_name].rows.push(r);
  });

  const exContainer = document.getElementById("recap-exercises");
  exContainer.innerHTML = "";
  Object.entries(byEx).forEach(([exName, { rows, prev }]) => {
    const best = Math.max(...rows.map(r => r.weight));
    const delta = prev !== null ? best - prev : null;
    const badge = delta === null
      ? `<span class="delta-badge new">Nouveau 🌟</span>`
      : delta > 0 ? `<span class="delta-badge up">▲ +${delta} kg</span>`
      : delta < 0 ? `<span class="delta-badge down">▼ ${Math.abs(delta)} kg</span>`
      : `<span class="delta-badge same">= Même poids</span>`;

    const card = document.createElement("div");
    card.className = "recap-card";
    card.innerHTML = `
      <div class="recap-card-header"><span>${esc(exName)}</span>${badge}</div>
      ${rows.map(r => `
        <div class="recap-row">
          <span>${r.weight} kg × ${r.reps} reps</span>
          <span class="recap-meta">${new Date(r.performed_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
        </div>`).join("")}`;
    exContainer.appendChild(card);
  });

  renderVolumeChart(volume);
}

// ── Debrief IA ────────────────────────────────────────────
async function triggerDebrief() {
  const totalVolume = sessionLogs.reduce((a, r) => a + r.weight * r.reps, 0);
  const prs = sessionLogs.filter(r => r.previous_weight === null || r.weight > r.previous_weight).length;
  const mins = Math.round(secondsElapsed / 60);

  // Prépare les données pour l'IA (1 ligne par exercice, meilleur poids)
  const byEx = {};
  sessionLogs.forEach(log => {
    if (!byEx[log.exercise_name] || log.weight > byEx[log.exercise_name].weight) {
      byEx[log.exercise_name] = {
        name: log.exercise_name,
        weight: log.weight,
        reps: log.reps,
        previousWeight: log.previous_weight,
      };
    }
  });

  try {
    const res = await fetch("/api/chat/debrief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercises: Object.values(byEx),
        totalVolume,
        durationMins: mins,
        prs,
        programFocus: selectedDay?.focus || "",
      }),
    });
    const { debrief } = await res.json();

    // Affiche le debrief avec formatage Markdown basique
    const formatted = debrief
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/✅/g, '<span style="color:var(--green)">✅</span>')
      .replace(/⚠️/g, '<span style="color:var(--gold)">⚠️</span>')
      .replace(/💡/g, '<span style="color:var(--steel-soft)">💡</span>')
      .replace(/🔄/g, '<span style="color:var(--rust-soft)">🔄</span>');

    document.getElementById("debrief-body").innerHTML = formatted;

    // Affiche le chat post-séance
    const chatWrap = document.getElementById("post-chat-wrap");
    chatWrap.style.display = "block";

    // Message d'accueil du coach dans le chat
    addPostChatMsg("coach", "Tu peux me poser toutes tes questions sur cette séance ! 💬");

    // Initialise l'historique du chat avec le contexte de la séance
    postChatHistory = [
      {
        role: "assistant",
        content: `[Contexte séance] ${selectedDay?.focus || "Entraînement"}, ${mins} min, ${Math.round(totalVolume)} kg de volume, ${prs} PR.\n\nDebrief:\n${debrief}`
      }
    ];

  } catch (err) {
    document.getElementById("debrief-body").textContent = "Je n'ai pas pu analyser cette séance. Réessaie plus tard.";
  }
}

// ── Chat post-séance ──────────────────────────────────────
document.getElementById("post-chat-send").addEventListener("click", sendPostChat);
document.getElementById("post-chat-input").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); sendPostChat(); }
});

async function sendPostChat() {
  const input = document.getElementById("post-chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  addPostChatMsg("user", text);
  postChatHistory.push({ role: "user", content: text });

  const thinking = addPostChatMsg("coach", "…", true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: postChatHistory }),
    });
    const data = await res.json();
    thinking.remove();
    const reply = data.reply;
    addPostChatMsg("coach", reply);
    postChatHistory.push({ role: "assistant", content: reply });
  } catch {
    thinking.remove();
    addPostChatMsg("coach", "Je n'arrive pas à répondre pour l'instant, réessaie.");
  }
}

function addPostChatMsg(role, text, isThinking = false) {
  const box = document.getElementById("post-chat-messages");
  const el = document.createElement("div");
  el.className = `chat-msg ${role}${isThinking ? " thinking" : ""}`;
  el.textContent = text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

// ── Graphe volume ─────────────────────────────────────────
function renderVolumeChart(volume) {
  const canvas = document.getElementById("volume-chart");
  if (typeof Chart === "undefined" || !volume || volume.length < 2) {
    canvas.replaceWith(Object.assign(document.createElement("p"), {
      className: "muted", style: "margin-top:8px",
      textContent: volume?.length < 2
        ? "Reviens après ta 2ème séance pour voir la courbe !"
        : "Le graphique ne peut pas se charger.",
    }));
    return;
  }
  new Chart(canvas, {
    type: "line",
    data: {
      labels: volume.map(v => new Date(v.day).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})),
      datasets: [{
        label: "Volume (kg)",
        data: volume.map(v => Math.round(Number(v.volume))),
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

function esc(str) {
  const d = document.createElement("div");
  d.textContent = String(str || "");
  return d.innerHTML;
}

init();
