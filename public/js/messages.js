let currentWith = null;
let currentOther = null;
let pollInterval = null;
let myId = null;
let lastMsgCount = 0;
let audioCtx = null;

async function init() {
  const me = await fetch("/api/auth/me").then(r=>r.json());
  if (!me.user) return window.location.href="/";
  myId = me.user.id;

  const withId = new URLSearchParams(window.location.search).get("with");

  await loadConversations();
  if (withId) openConversation(parseInt(withId));
}

async function loadConversations() {
  const r = await fetch("/api/messages/conversations").then(r=>r.json());
  const list = document.getElementById("conv-list");
  const empty = document.getElementById("conv-empty");

  if (!r.conversations?.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  list.innerHTML = r.conversations.map(c => `
    <div class="conv-item ${currentWith===c.other_id?'active':''}" onclick="openConversation(${c.other_id})" id="conv-${c.other_id}">
      <div class="conv-avatar">${c.other_avatar ? `<img src="${esc(c.other_avatar)}"/>` : "👤"}</div>
      <div class="conv-meta">
        <div class="conv-name-row">
          <span class="conv-name">${esc(c.other_name)}</span>
          ${c.unread>0 ? `<span class="conv-unread-badge">${c.unread}</span>` : ""}
        </div>
        <div class="conv-last-msg">${esc(c.last_msg)}</div>
      </div>
    </div>`).join("");
}

async function openConversation(withId) {
  currentWith = withId;
  lastMsgCount = 0;
  if (pollInterval) clearInterval(pollInterval);

  document.getElementById("chat-placeholder").classList.add("hidden");

  const r = await fetch(`/api/messages/${withId}`).then(r=>r.json());
  currentOther = r.other || null;
  const header = document.getElementById("chat-header");
  const form = document.getElementById("chat-form");

  header.innerHTML = currentOther
    ? `<div class="chat-panel-head-avatar">${currentOther.avatar_url ? `<img src="${esc(currentOther.avatar_url)}"/>` : "👤"}</div>
       <span class="chat-panel-head-name">${esc(currentOther.name)}</span>
       <span class="chat-panel-head-role">${esc(currentOther.role)}</span>`
    : "Conversation";

  renderMessages(r.messages || [], true);
  form.classList.remove("hidden");
  document.getElementById("msg-input").focus();

  pollInterval = setInterval(() => refreshMessages(withId), 3000);
  loadConversations();
}

async function refreshMessages(withId) {
  if (currentWith !== withId) return;
  const r = await fetch(`/api/messages/${withId}`).then(r=>r.json());
  renderMessages(r.messages || []);
  loadConversations();
}

function renderMessages(msgs, isInitialLoad = false) {
  const box = document.getElementById("chat-msgs");
  const wasBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 20;

  // Notification sonore si de nouveaux messages de l'autre personne sont arrivés
  if (!isInitialLoad && msgs.length > lastMsgCount) {
    const newOnes = msgs.slice(lastMsgCount);
    if (newOnes.some(m => m.from_id !== myId)) playPing();
  }
  lastMsgCount = msgs.length;

  box.innerHTML = msgs.map(m => {
    const isMe = m.from_id === myId;
    const time = new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const avatarHtml = !isMe
      ? `<div class="msg-row-avatar">${currentOther?.avatar_url ? `<img src="${esc(currentOther.avatar_url)}"/>` : "👤"}</div>`
      : "";
    const readHtml = isMe
      ? `<span class="msg-read-tick${m.read_at ? " read" : ""}">${m.read_at ? "✓✓ Lu" : "✓ Envoyé"}</span>`
      : "";
    return `<div class="msg-row ${isMe ? "me" : "them"}">
      ${avatarHtml}
      <div class="msg-bubble">
        <div class="msg-text">${esc(m.content)}</div>
        <div class="msg-meta"><span>${time}</span>${readHtml}</div>
      </div>
    </div>`;
  }).join("");

  if (wasBottom || isInitialLoad) box.scrollTop = box.scrollHeight;
}

function playPing() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch {}
}

async function sendMsg() {
  const input = document.getElementById("msg-input");
  const text = input.value.trim();
  if (!text || !currentWith) return;
  input.value = "";
  await fetch(`/api/messages/${currentWith}`, {
    method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({content:text})
  });
  refreshMessages(currentWith);
}

document.getElementById("chat-form").addEventListener("submit", e => {
  e.preventDefault();
  sendMsg();
});

function esc(s) { const d=document.createElement("div"); d.textContent=String(s||""); return d.innerHTML; }
init();
