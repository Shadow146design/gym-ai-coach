let currentWith = null;
let pollInterval = null;
let myId = null;

async function init() {
  const me = await fetch("/api/auth/me").then(r=>r.json());
  if (!me.user) return window.location.href="/";
  myId = me.user.id;

  // Ouvre directement la conv avec le coach si ?with=ID dans l'URL
  const withId = new URLSearchParams(window.location.search).get("with");

  await loadConversations();
  if (withId) openConversation(parseInt(withId));
}

async function loadConversations() {
  const r = await fetch("/api/messages/conversations").then(r=>r.json());
  const list = document.getElementById("conv-list");
  const empty = document.getElementById("conv-empty");
  if (!r.conversations?.length) { empty.classList.remove("hidden"); return; }

  list.innerHTML = r.conversations.map(c => `
    <div class="conv-item ${currentWith===c.other_id?'active':''}" onclick="openConversation(${c.other_id})" id="conv-${c.other_id}">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--rust-bg);display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0;overflow:hidden">
          ${c.other_avatar ? `<img src="${esc(c.other_avatar)}" style="width:100%;height:100%;object-fit:cover"/>` : "👤"}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:.88rem;font-weight:600;display:flex;justify-content:space-between">
            <span>${esc(c.other_name)}</span>
            ${c.unread>0 ? `<span style="background:var(--rust);color:#fff;border-radius:10px;padding:1px 6px;font-size:.65rem">${c.unread}</span>` : ""}
          </div>
          <div style="font-size:.75rem;color:var(--chalk-dim);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc(c.last_msg)}</div>
        </div>
      </div>
    </div>`).join("");
}

async function openConversation(withId) {
  currentWith = withId;
  if (pollInterval) clearInterval(pollInterval);

  const r = await fetch(`/api/messages/${withId}`).then(r=>r.json());
  const header = document.getElementById("chat-header");
  const msgs = document.getElementById("chat-msgs");
  const form = document.getElementById("chat-form");

  header.innerHTML = r.other
    ? `<div style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:50%;overflow:hidden;background:var(--rust-bg);display:flex;align-items:center;justify-content:center">
          ${r.other.avatar_url ? `<img src="${esc(r.other.avatar_url)}" style="width:100%;height:100%;object-fit:cover"/>` : "👤"}
        </div>
        <span>${esc(r.other.name)}</span>
        <span style="font-size:.72rem;background:var(--bg-hover);padding:2px 8px;border-radius:4px;color:var(--chalk-dim)">${esc(r.other.role)}</span>
      </div>`
    : "Conversation";

  renderMessages(r.messages || []);
  form.classList.remove("hidden");
  document.getElementById("msg-input").focus();

  // Recharge les messages toutes les 5 secondes
  pollInterval = setInterval(() => refreshMessages(withId), 5000);

  // Met à jour la liste
  loadConversations();
}

async function refreshMessages(withId) {
  if (currentWith !== withId) return;
  const r = await fetch(`/api/messages/${withId}`).then(r=>r.json());
  renderMessages(r.messages || []);
}

function renderMessages(msgs) {
  const box = document.getElementById("chat-msgs");
  const wasBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 20;
  box.innerHTML = msgs.map(m => {
    const isMe = m.from_id === myId;
    return `<div style="display:flex;${isMe?'justify-content:flex-end':''}">
      <div style="max-width:75%;padding:9px 13px;border-radius:${isMe?'12px 12px 4px 12px':'12px 12px 12px 4px'};background:${isMe?'var(--rust-bg)':'var(--bg-hover)'};font-size:.88rem;line-height:1.5">
        ${esc(m.content)}
        <div style="font-size:.65rem;color:var(--chalk-dim);margin-top:3px;text-align:right">
          ${new Date(m.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
        </div>
      </div>
    </div>`;
  }).join("");
  if (wasBottom) box.scrollTop = box.scrollHeight;
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
  loadConversations();
}

document.getElementById("msg-input")?.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
});

function esc(s) { const d=document.createElement("div"); d.textContent=String(s||""); return d.innerHTML; }
init();
