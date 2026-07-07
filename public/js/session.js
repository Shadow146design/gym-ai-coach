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
    btn.style.cssText = "text-align:left;padding:18px 20px;border-radius:var(--radius-lg);height:auto;flex-direction:column;align-items:flex-start;gap:6px;width:100%";
    btn.innerHTML = `
      <span style="font-family:var(--font-display);font-size:1rem;text-transform:uppercase;letter-spacing:.04em">${esc(day.day)}</span>
      <span style="font-size:.8rem;color:var(--chalk-dim)">${esc(day.focus||"")}</span>
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

function completeSet(btn) {
  const row = btn.closest(".set-row");
  const card = btn.closest(".session-exercise-card");
  const weight = parseFloat(row.querySelector(".weight-input").value);
  const reps   = parseInt(row.querySelector(".reps-input").value);

  if (isNaN(weight) || weight < 0) { row.querySelector(".weight-input").focus(); return; }
  if (!reps || reps < 1)           { row.querySelector(".reps-input").focus(); return; }

  btn.classList.add("checked");
  btn.disabled = true;
  row.classList.add("completed");

  sessionLogs.push({
    exercise_name: card.dataset.exercise,
    muscle_group:  card.dataset.muscleGroup || null,
    weight, reps, sets: 1,
  });

  // Lance le minuteur de repos
  const restSeconds = parseInt(btn.dataset.rest) || 90;
  startRestTimer(restSeconds);
}

// ── Minuteur de repos ─────────────────────────────────────
function startRestTimer(seconds) {
  if (restTimerInterval) { clearInterval(restTimerInterval); removeRestOverlay(); }

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
      // Vibration sur mobile
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      overlay.classList.add("done");
      if (el) el.textContent = "GO !";
      setTimeout(removeRestOverlay, 2000);
    }
  }, 1000);
}

function skipRest() {
  if (restTimerInterval) clearInterval(restTimerInterval);
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
  if (restTimerInterval) { clearInterval(restTimerInterval); removeRestOverlay(); }
  document.getElementById("finish-btn").disabled = true;
  document.getElementById("finish-btn").textContent = "Enregistrement…";

  await Promise.all(sessionLogs.map(log => fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log),
  })));

  document.getElementById("step-session").classList.add("hidden");
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

  document.getElementById("recap-stats").innerHTML = `
    <div class="kpi-tile"><div class="kpi-label">Séries</div><div class="kpi-value">${sessionLogs.length}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Volume</div><div class="kpi-value">${Math.round(totalVolume)}<span style="font-size:.9rem"> kg</span></div></div>
    <div class="kpi-tile"><div class="kpi-label">Records 🏆</div><div class="kpi-value" style="color:var(--gold)">${prs}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Durée</div><div class="kpi-value">${mins}<span style="font-size:.9rem"> min</span></div></div>`;

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

function esc(str) {
  const d = document.createElement("div");
  d.textContent = String(str||"");
  return d.innerHTML;
}

init();
