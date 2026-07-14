let currentWith = null;
let currentOther = null;
let pollInterval = null;
let myId = null;
let lastMsgCount = 0;
let audioCtx = null;
let allConversations = [];

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
  allConversations = r.conversations || [];
  const empty = document.getElementById("conv-empty");

  if (!allConversations.length) {
    document.getElementById("conv-list").innerHTML = "";
    document.getElementById("conv-search-wrap")?.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  document.getElementById("conv-search-wrap")?.classList.remove("hidden");
  renderConversations();
}

function renderConversations() {
  const list = document.getElementById("conv-list");
  const searchEmpty = document.getElementById("conv-search-empty");
  const q = (document.getElementById("conv-search")?.value || "").trim().toLowerCase();
  const filtered = q ? allConversations.filter(c => c.other_name.toLowerCase().includes(q)) : allConversations;

  if (!filtered.length) {
    list.innerHTML = "";
    searchEmpty.classList.remove("hidden");
    return;
  }
  searchEmpty.classList.add("hidden");

  list.innerHTML = filtered.map(c => `
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

document.getElementById("conv-search")?.addEventListener("input", renderConversations);

async function openConversation(withId) {
  currentWith = withId;
  lastMsgCount = 0;
  if (pollInterval) clearInterval(pollInterval);

  document.getElementById("chat-placeholder").classList.add("hidden");
  document.getElementById("conv-panel")?.parentElement.classList.add("show-chat");

  const r = await fetch(`/api/messages/${withId}`).then(r=>r.json());
  currentOther = r.other || null;
  const header = document.getElementById("chat-header");
  const form = document.getElementById("chat-form");

  header.innerHTML = currentOther
    ? `<button type="button" class="chat-back-btn" id="chat-back-btn" aria-label="Retour">←</button>
       <div class="chat-panel-head-avatar">${currentOther.avatar_url ? `<img src="${esc(currentOther.avatar_url)}"/>` : "👤"}</div>
       <span class="chat-panel-head-name">${esc(currentOther.name)}</span>
       <span class="chat-panel-head-role">${esc(currentOther.role)}</span>`
    : "Conversation";
  document.getElementById("chat-back-btn")?.addEventListener("click", closeConversationMobile);

  renderMessages(r.messages || [], true);
  form.classList.remove("hidden");
  document.getElementById("msg-input").focus();

  pollInterval = setInterval(() => refreshMessages(withId), 3000);
  loadConversations();
  maybeShowReviewInvite(withId);
}

function closeConversationMobile() {
  document.getElementById("conv-panel")?.parentElement.classList.remove("show-chat");
}

// ── Notation du coach (fonctionnalité 6) ──────────────────
async function maybeShowReviewInvite(coachId) {
  const box = document.getElementById("review-invite");
  box.classList.add("hidden");
  box.innerHTML = "";
  try {
    const mine = await fetch("/api/coaches/mine").then(r => r.json());
    const a = mine.assignment;
    if (!a || a.coach_id !== coachId || a.status !== "active") return;

    const daysSince = (Date.now() - new Date(a.since)) / 86400000;
    if (daysSince < 30) return;

    const mineReview = await fetch(`/api/coaches/${coachId}/my-review`).then(r => r.json());
    if (mineReview.review) return;

    renderReviewInvite(coachId);
  } catch {}
}

function renderReviewInvite(coachId) {
  const box = document.getElementById("review-invite");
  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="card" style="margin-bottom:10px">
      <div class="card-title">⭐ Note ton coach</div>
      <p class="muted" style="font-size:.85rem;margin-bottom:10px">Ça fait 30 jours que tu es suivi(e) — partage ton avis pour aider les autres membres.</p>
      <div class="review-stars" id="review-stars">
        ${[1,2,3,4,5].map(n => `<span class="review-star" data-val="${n}">★</span>`).join("")}
      </div>
      <textarea id="review-comment" maxlength="500" placeholder="Ton avis (optionnel)" style="margin:10px 0;width:100%"></textarea>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" type="button" id="review-submit-btn" disabled>Envoyer</button>
        <button class="btn btn-ghost btn-sm" type="button" id="review-dismiss-btn">Plus tard</button>
      </div>
    </div>`;

  let selectedRating = 0;
  const stars = box.querySelectorAll(".review-star");
  stars.forEach(star => {
    star.addEventListener("click", () => {
      selectedRating = parseInt(star.dataset.val, 10);
      stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.val, 10) <= selectedRating));
      document.getElementById("review-submit-btn").disabled = false;
    });
  });

  document.getElementById("review-dismiss-btn").addEventListener("click", () => box.classList.add("hidden"));
  document.getElementById("review-submit-btn").addEventListener("click", async () => {
    if (!selectedRating) return;
    const comment = document.getElementById("review-comment").value.trim();
    try {
      const res = await fetch(`/api/coaches/${coachId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: selectedRating, comment }),
      });
      if (res.ok) box.innerHTML = `<div class="card" style="margin-bottom:10px"><p style="font-size:.88rem;color:var(--green)">Merci pour ton avis ! ✓</p></div>`;
    } catch {}
  });
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

  let lastDateKey = null;
  box.innerHTML = msgs.map(m => {
    const d = new Date(m.created_at);
    const dateKey = d.toDateString();
    let sepHtml = "";
    if (dateKey !== lastDateKey) {
      sepHtml = `<div class="msg-date-sep"><span>${dateLabel(d)}</span></div>`;
      lastDateKey = dateKey;
    }

    const isMe = m.from_id === myId;
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const avatarHtml = !isMe
      ? `<div class="msg-row-avatar">${currentOther?.avatar_url ? `<img src="${esc(currentOther.avatar_url)}"/>` : "👤"}</div>`
      : "";
    const readHtml = isMe
      ? `<span class="msg-read-tick${m.read_at ? " read" : ""}">${m.read_at ? "✓✓ Lu" : "✓ Envoyé"}</span>`
      : "";
    return `${sepHtml}<div class="msg-row ${isMe ? "me" : "them"}">
      ${avatarHtml}
      <div class="msg-bubble">
        <div class="msg-text">${esc(m.content)}</div>
        <div class="msg-meta"><span>${time}</span>${readHtml}</div>
      </div>
    </div>`;
  }).join("");

  if (wasBottom || isInitialLoad) box.scrollTop = box.scrollHeight;
}

function dateLabel(d) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  const days = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
  const months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
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
initVoiceInput("msg-input", "msg-mic-btn");

function esc(s) { const d=document.createElement("div"); d.textContent=String(s||""); return d.innerHTML; }
init();
