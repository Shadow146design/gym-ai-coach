// ── Auth ──────────────────────────────────────────────────
let currentUser = null;
let chatHistory = [];
let feedbackAccumulated = "";

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

  container.innerHTML = "";
  (program.content.days || []).forEach((day, i) => {
    const details = document.createElement("details");
    details.className = "day-card";
    if (i === 0) details.open = true;

    const exHtml = (day.exercises || []).map(ex => `
      <div class="exercise-row">
        <div>
          <div class="ex-name">${esc(ex.name)}</div>
          ${ex.muscle_group ? `<span class="ex-badge">${esc(ex.muscle_group)}</span>` : ""}
          ${ex.notes ? `<div class="ex-notes">${esc(ex.notes)}</div>` : ""}
        </div>
        <div class="ex-meta">${esc(String(ex.sets))}×${esc(String(ex.reps))}<br><span style="font-size:.72rem;color:var(--chalk-dim)">${esc(String(ex.rest_seconds||"—"))}s repos</span></div>
      </div>`).join("");

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

    // Detecte si l'IA oriente vers une regeneration
    if (reply.toLowerCase().includes("régénér") || reply.toLowerCase().includes("regen")) {
      feedbackAccumulated = chatHistory
        .filter(m => m.role === "user")
        .map(m => m.content)
        .join(" | ");
      document.getElementById("regen-banner").classList.remove("hidden");
    }
  } catch (e) {
    thinking.remove();
    appendMsg("coach", "Désolé, je n'arrive pas à répondre pour l'instant. Réessaie dans quelques secondes.");
  }
}

function appendMsg(role, text, isThinking = false) {
  const box = document.getElementById("chat-messages");
  const el = document.createElement("div");
  el.className = `chat-msg ${role}${isThinking ? " thinking" : ""}`;
  el.textContent = text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

document.getElementById("regen-btn").addEventListener("click", () => {
  const params = new URLSearchParams({ feedback: feedbackAccumulated });
  window.location.href = `/questionnaire.html?${params.toString()}`;
});

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

init();
