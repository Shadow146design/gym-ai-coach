function renderSkeletons() {
  const grid = document.getElementById("coaches-grid");
  grid.innerHTML = Array.from({ length: 3 }).map(() => `
    <div class="card skeleton-card">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="skeleton" style="width:48px;height:48px;border-radius:50%;flex-shrink:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px">
          <div class="skeleton skeleton-line" style="width:60%"></div>
          <div class="skeleton skeleton-line" style="width:40%"></div>
        </div>
      </div>
      <div class="skeleton skeleton-line" style="width:100%"></div>
      <div class="skeleton skeleton-line" style="width:80%"></div>
    </div>
  `).join("");
}

async function init() {
  const me = await fetch("/api/auth/me").then(r=>r.json());
  if (!me.user) return window.location.href="/";

  renderSkeletons();

  // Mon coach actif
  const mineRes = await fetch("/api/coaches/mine").then(r=>r.json());
  if (mineRes.assignment) {
    const a = mineRes.assignment;
    const banner = document.getElementById("my-coach-banner");
    const txt = document.getElementById("my-coach-txt");
    const statusTxt = a.status === "active"
      ? `✅ Ton coach : <strong>${esc(a.name)}</strong>`
      : `⏳ Demande en attente pour <strong>${esc(a.name)}</strong>`;
    txt.innerHTML = statusTxt;
    document.getElementById("my-coach-msg-btn").innerHTML = a.status === "active"
      ? `<a class="btn btn-primary btn-sm" href="/messages.html?with=${a.coach_id}">💬 Envoyer un message</a>`
      : "";
    banner.classList.remove("hidden");
  }

  const r = await fetch("/api/coaches").then(r=>r.json());
  const grid = document.getElementById("coaches-grid");
  const empty = document.getElementById("empty");
  grid.innerHTML = "";

  if (!r.coaches?.length) { empty.classList.remove("hidden"); return; }

  r.coaches.forEach(coach => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "14px";

    const alreadyMine = mineRes.assignment?.coach_id === coach.id;
    const specs = (coach.specialties || []).map(s => `<span style="font-size:.72rem;background:var(--bg-hover);padding:3px 8px;border-radius:4px;color:var(--chalk-dim)">${esc(s)}</span>`).join(" ");
    const price = coach.price_monthly > 0 ? `${coach.price_monthly}€/mois` : "Gratuit";

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--rust-bg);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;overflow:hidden">
          ${coach.avatar_url ? `<img src="${esc(coach.avatar_url)}" style="width:100%;height:100%;object-fit:cover"/>` : "🏋️"}
        </div>
        <div>
          <div style="font-weight:600">${esc(coach.name)}</div>
          <div style="font-size:.78rem;color:var(--chalk-dim)">${coach.client_count} client${coach.client_count>1?"s":""} • ${price}</div>
        </div>
      </div>
      ${coach.bio ? `<p style="font-size:.87rem;color:var(--chalk-dim);margin:0">${esc(coach.bio)}</p>` : ""}
      ${specs ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${specs}</div>` : ""}
      ${alreadyMine
        ? `<div style="text-align:center;font-size:.82rem;color:var(--green)">✅ Ton coach actuel</div>`
        : `<button class="btn btn-primary btn-sm" onclick="requestCoach(${coach.id},this)">Choisir ce coach</button>`}`;
    grid.appendChild(card);
  });
}

async function requestCoach(id, btn) {
  btn.disabled = true;
  btn.textContent = "Envoi…";
  const r = await fetch(`/api/coaches/${id}/request`, { method: "POST" }).then(r=>r.json());
  if (r.ok) { btn.textContent = "✅ Demande envoyée !"; btn.style.background = "var(--green)"; }
  else { btn.disabled = false; btn.textContent = r.error || "Erreur"; }
}

function esc(s) { const d=document.createElement("div"); d.textContent=String(s||""); return d.innerHTML; }
init();
