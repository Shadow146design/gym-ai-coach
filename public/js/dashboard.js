// ── Auth ──────────────────────────────────────────────────
let currentUser = null;
let chatHistory = [];
let lastProgramExercises = new Set();

async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");
  const { user } = await meRes.json();
  currentUser = user;
  document.getElementById("user-greeting").textContent = `Salut ${user.name} 👋`;
  loadProgram();
  loadCoachMessage();

  // Arrivee depuis l'alerte plateau de la page d'accueil : demande directement
  // des conseils IA specifiques et les affiche dans le chat.
  if (new URLSearchParams(window.location.search).get("plateau") === "1") {
    askPlateauAdvice();
  }
}

async function askPlateauAdvice() {
  const raw = sessionStorage.getItem("plateauData");
  sessionStorage.removeItem("plateauData");
  if (!raw) return;
  let plateaus;
  try { plateaus = JSON.parse(raw); } catch { return; }
  if (!plateaus?.length) return;

  const names = plateaus.map(p => p.exercise_name).join(", ");
  appendMsg("user", `J'ai un plateau sur : ${names}. Peux-tu me donner des conseils pour progresser ?`);
  const thinking = appendMsg("coach", "…", true);

  try {
    const res = await fetch("/api/chat/plateau-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plateaus }),
    });
    const data = await res.json();
    thinking.remove();
    if (!res.ok) throw new Error(data.error);
    appendMsg("coach", data.advice);
  } catch {
    thinking.remove();
    appendMsg("coach", "Désolé, je n'arrive pas à analyser tes plateaux pour l'instant. Réessaie dans quelques secondes.");
  }
}

// ── Dernier message du coach ────────────────────────────────
async function loadCoachMessage() {
  try {
    const mine = await fetch("/api/coaches/mine").then(r => r.json());
    const assignment = mine.assignment;
    if (!assignment || assignment.status !== "active") return;

    const conv = await fetch("/api/messages/conversations").then(r => r.json());
    const withCoach = (conv.conversations || []).find(c => c.other_id === assignment.coach_id);
    if (!withCoach) return;

    document.getElementById("coach-msg-avatar").innerHTML = withCoach.other_avatar
      ? `<img src="${esc(withCoach.other_avatar)}" style="width:100%;height:100%;object-fit:cover"/>` : "👤";
    document.getElementById("coach-msg-preview").textContent = withCoach.last_msg;
    document.getElementById("coach-msg-reply-btn").href = `/messages.html?with=${assignment.coach_id}`;
    document.getElementById("coach-msg-card").classList.remove("hidden");
  } catch {}
}

// ── Programme actif ───────────────────────────────────────
async function loadProgram() {
  const res = await fetch("/api/program/active");
  const { program } = await res.json();
  const subtitle = document.getElementById("program-subtitle");
  const summary  = document.getElementById("program-summary");
  const container = document.getElementById("days-container");
  const empty    = document.getElementById("empty-state");

  if (!program) {
    empty.classList.remove("hidden");
    document.getElementById("start-session-btn").classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  subtitle.textContent = program.title;
  summary.textContent  = program.content.summary || "";

  lastProgramExercises = new Set((program.content.days || []).flatMap(d => (d.exercises || []).map(e => e.name)));

  container.innerHTML = "";
  (program.content.days || []).forEach((day, i) => {
    const details = document.createElement("details");
    details.className = "day-card";
    if (i === 0) details.open = true;

    // Regroupe visuellement les exercices qui partagent le meme superset_group (module H.1)
    const exercises = day.exercises || [];
    const rendered = new Set();
    const exHtml = exercises.map((ex, idx) => {
      if (rendered.has(idx)) return "";
      const exRow = e => `
        <div class="exercise-row${e.superset_group ? " in-superset" : ""}" data-ex-name="${esc(e.name)}">
          <div>
            <div class="ex-name">${esc(e.name)}</div>
            ${e.muscle_group ? `<span class="ex-badge">${esc(e.muscle_group)}</span>` : ""}
            ${e.notes ? `<div class="ex-notes">${esc(e.notes)}</div>` : ""}
          </div>
          <div class="ex-meta">${esc(String(e.sets))}×${esc(String(e.reps))}<br><span style="font-size:.72rem;color:var(--chalk-dim)">${esc(String(e.rest_seconds||"—"))}s repos</span></div>
        </div>`;

      if (!ex.superset_group) { rendered.add(idx); return exRow(ex); }

      const partners = exercises
        .map((e2, i2) => ({ e2, i2 }))
        .filter(({ e2, i2 }) => i2 >= idx && e2.superset_group === ex.superset_group && !rendered.has(i2));
      partners.forEach(({ i2 }) => rendered.add(i2));
      if (partners.length < 2) return exRow(ex);
      return `<div class="superset-block">
        <div class="superset-label">SUPERSET</div>
        ${partners.map(({ e2 }) => exRow(e2)).join(`<div class="superset-plus">+</div>`)}
      </div>`;
    }).join("");

    details.innerHTML = `
      <summary>
        <span class="day-label">${esc(day.day)}</span>
        <span style="display:flex;align-items:center;gap:10px">
          <span class="focus">${esc(day.focus || "")}</span>
          <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </summary>
      ${exHtml}`;
    container.appendChild(details);
  });

  if (program.content.advice?.length) {
    const adv = document.createElement("div");
    adv.className = "card";
    adv.style.marginTop = "12px";
    adv.innerHTML = `<div class="card-title">Conseils du coach</div><ul style="padding-left:18px;color:var(--chalk-dim);font-size:.88rem">
      ${program.content.advice.map(a => `<li style="margin-bottom:6px">${esc(a)}</li>`).join("")}</ul>`;
    container.appendChild(adv);
  }
}

// ── Chat Coach IA ─────────────────────────────────────────
document.getElementById("chat-send-btn").addEventListener("click", sendMessage);
document.getElementById("chat-input").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

async function sendMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  appendMsg("user", text);
  chatHistory.push({ role: "user", content: text });

  const thinking = appendMsg("coach", "…", true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: chatHistory }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    thinking.remove();
    const reply = data.reply;
    appendMsg("coach", reply);
    chatHistory.push({ role: "assistant", content: reply });

    if (data.programUpdated) {
      const newExercises = new Set((data.newProgram?.days || []).flatMap(d => (d.exercises || []).map(e => e.name)));
      const changedNames = [...newExercises].filter(n => !lastProgramExercises.has(n));
      await loadProgram();
      showToast("Programme mis à jour ✓");
      highlightExercises(changedNames);
    }
  } catch (e) {
    thinking.remove();
    appendMsg("coach", "Désolé, je n'arrive pas à répondre pour l'instant. Réessaie dans quelques secondes.");
  }
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "app-toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => { toast.classList.remove("visible"); setTimeout(() => toast.remove(), 300); }, 3000);
}

function highlightExercises(names) {
  if (!names.length) return;
  names.forEach(name => {
    document.querySelectorAll(`.exercise-row[data-ex-name="${CSS.escape(name)}"]`).forEach(el => {
      el.classList.add("just-updated");
      setTimeout(() => el.classList.remove("just-updated"), 3000);
    });
  });
}

document.getElementById("modify-ai-btn")?.addEventListener("click", () => {
  const input = document.getElementById("chat-input");
  input.value = "Je voudrais modifier mon programme, voici ce que je veux changer : ";
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  document.getElementById("chat-wrap")?.scrollIntoView({ behavior: "smooth", block: "center" });
});

function appendMsg(role, text, isThinking = false) {
  const box = document.getElementById("chat-messages");
  const el = document.createElement("div");
  el.className = `chat-msg ${role}${isThinking ? " thinking" : ""}`;
  el.textContent = text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

init();
