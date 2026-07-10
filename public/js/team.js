let myTeam = null;
let chatPollInterval = null;
let lastMessageCount = 0;

function esc(s) { const d = document.createElement("div"); d.textContent = String(s || ""); return d.innerHTML; }

async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");

  const r = await fetch("/api/teams/mine");
  const { team } = await r.json();
  myTeam = team;

  document.getElementById("team-loading").classList.add("hidden");

  if (!myTeam) {
    document.getElementById("no-team-state").classList.remove("hidden");
    wireNoTeamForms();
    return;
  }

  document.getElementById("team-app").classList.remove("hidden");
  renderTeamHeader();
  await loadLeaderboard();
  await loadChat();
  document.getElementById("team-chat-send-btn").addEventListener("click", sendTeamMessage);
  document.getElementById("team-chat-input").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTeamMessage(); }
  });
  chatPollInterval = setInterval(loadChat, 3000);
}

function wireNoTeamForms() {
  document.getElementById("create-team-form").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = document.getElementById("create-team-msg");
    const name = document.getElementById("team-name").value.trim();
    msg.textContent = "Création…";
    try {
      const res = await fetch("/api/teams", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { msg.innerHTML = `<span style="color:var(--red)">${esc(data.error)}</span>`; return; }
      window.location.reload();
    } catch {
      msg.innerHTML = `<span style="color:var(--red)">Impossible de joindre le serveur.</span>`;
    }
  });

  document.getElementById("join-team-form").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = document.getElementById("join-team-msg");
    const code = document.getElementById("team-code").value.trim().toUpperCase();
    msg.textContent = "Connexion…";
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { msg.innerHTML = `<span style="color:var(--red)">${esc(data.error)}</span>`; return; }
      window.location.reload();
    } catch {
      msg.innerHTML = `<span style="color:var(--red)">Impossible de joindre le serveur.</span>`;
    }
  });
}

function renderTeamHeader() {
  document.getElementById("team-name-display").textContent = myTeam.name;
  document.getElementById("team-code-display").textContent = myTeam.code;
}

async function loadLeaderboard() {
  const res = await fetch(`/api/teams/${myTeam.id}/leaderboard`);
  if (!res.ok) return;
  const { members, challenge } = await res.json();

  document.getElementById("team-member-count").textContent = `${members.length} membre${members.length > 1 ? "s" : ""}`;

  const medals = ["🥇", "🥈", "🥉"];
  document.getElementById("team-leaderboard").innerHTML = members.map((m, i) => `
    <div class="stat-row">
      <span style="display:flex;align-items:center;gap:8px">
        <span style="width:22px;text-align:center">${medals[i] || i + 1}</span>
        <span>${esc(m.name)}</span>
        ${m.role === "creator" ? `<span class="muted" style="font-size:.7rem">créateur</span>` : ""}
      </span>
      <span class="stat-val">${Math.round(m.week_volume)} kg</span>
    </div>`).join("") || `<p class="muted" style="font-size:.85rem">Aucun membre.</p>`;

  const pct = challenge.goalKg > 0 ? Math.min(100, Math.round((challenge.progressKg / challenge.goalKg) * 100)) : 0;
  document.getElementById("challenge-label").textContent =
    `L'équipe doit soulever ${Math.round(challenge.goalKg / 1000)} tonnes cette semaine — ${Math.round(challenge.progressKg)} kg / ${challenge.goalKg} kg (${pct}%)`;
  document.getElementById("challenge-fill").style.width = `${pct}%`;
}

async function loadChat() {
  try {
    const res = await fetch(`/api/teams/${myTeam.id}/messages`);
    if (!res.ok) return;
    const { messages } = await res.json();
    if (messages.length === lastMessageCount) return;
    lastMessageCount = messages.length;

    const meRes = await fetch("/api/auth/me").then(r => r.json());
    const myId = meRes.user.id;

    const box = document.getElementById("team-chat-messages");
    box.innerHTML = messages.map(m => `
      <div class="chat-msg ${m.user_id === myId ? "user" : "coach"}" style="align-self:${m.user_id === myId ? "flex-end" : "flex-start"};max-width:85%">
        ${m.user_id !== myId ? `<div style="font-size:.7rem;color:var(--chalk-dim);margin-bottom:2px">${esc(m.from_name)}</div>` : ""}
        ${esc(m.content)}
      </div>`).join("") || `<p class="muted" style="font-size:.85rem">Aucun message pour l'instant.</p>`;
    box.scrollTop = box.scrollHeight;
  } catch {}
}

async function sendTeamMessage() {
  const input = document.getElementById("team-chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  try {
    await fetch(`/api/teams/${myTeam.id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    await loadChat();
  } catch {}
}

window.addEventListener("beforeunload", () => clearInterval(chatPollInterval));

init();
