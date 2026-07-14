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

let myRole = "user";
let allCoaches = [];
let mineAssignment = null;

function populateSpecialtyFilter(coaches) {
  const specs = new Set();
  coaches.forEach(c => (c.specialties || []).forEach(s => specs.add(s)));
  const select = document.getElementById("filter-specialty");
  [...specs].sort().forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });
}

function applyFilters() {
  const specialty = document.getElementById("filter-specialty").value;
  const price = document.getElementById("filter-price").value;
  const filtered = allCoaches.filter(c => {
    if (specialty && !(c.specialties || []).includes(specialty)) return false;
    if (price === "free" && c.price_monthly > 0) return false;
    if (price === "paid" && !(c.price_monthly > 0)) return false;
    return true;
  });
  renderCoaches(filtered);
}

document.getElementById("filter-specialty").addEventListener("change", applyFilters);
document.getElementById("filter-price").addEventListener("change", applyFilters);

async function init() {
  const me = await fetch("/api/auth/me").then(r=>r.json());
  if (!me.user) return window.location.href="/";
  myRole = me.user.role;

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
  allCoaches = r.coaches || [];
  mineAssignment = mineRes.assignment || null;

  if (allCoaches.length) {
    populateSpecialtyFilter(allCoaches);
    document.getElementById("coaches-filters").classList.remove("hidden");
  }

  renderCoaches(allCoaches);
}

function renderCoaches(coaches) {
  const grid = document.getElementById("coaches-grid");
  const empty = document.getElementById("empty");
  grid.innerHTML = "";

  if (!coaches.length) { empty.classList.remove("hidden"); empty.querySelector("p").textContent = allCoaches.length ? "Aucun coach ne correspond à ces filtres." : "Reviens bientôt !"; return; }
  empty.classList.add("hidden");

  coaches.forEach(coach => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "14px";

    const alreadyMine = mineAssignment?.coach_id === coach.id;
    const specs = (coach.specialties || []).map(s => `<span style="font-size:.72rem;background:var(--bg-hover);padding:3px 8px;border-radius:4px;color:var(--chalk-dim)">${esc(s)}</span>`).join(" ");
    const isPaid = coach.price_monthly > 0;
    const price = isPaid ? `${coach.price_monthly}€/mois` : "Gratuit";
    const needsPremium = isPaid && !["premium", "admin"].includes(myRole);

    let ctaHtml;
    if (alreadyMine) {
      ctaHtml = `<div style="text-align:center;font-size:.82rem;color:var(--green)">✅ Ton coach actuel</div>`;
    } else if (needsPremium) {
      ctaHtml = `<a class="btn btn-ghost btn-sm" href="/premium.html">⭐ Passer Premium pour choisir ce coach</a>`;
    } else {
      ctaHtml = `<button class="btn btn-primary btn-sm" onclick="requestCoach(${coach.id},this)">Choisir ce coach</button>`;
    }

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--rust-bg);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;overflow:hidden">
          ${coach.avatar_url ? `<img src="${esc(coach.avatar_url)}" style="width:100%;height:100%;object-fit:cover" loading="lazy"/>` : "🏋️"}
        </div>
        <div>
          <div style="font-weight:600">${esc(coach.name)}</div>
          <div style="font-size:.78rem;color:var(--chalk-dim);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span>${coach.client_count} client${coach.client_count>1?"s":""} • ${price}</span>
            ${coach.avg_rating ? `<span style="color:var(--gold)">⭐ ${coach.avg_rating} — ${coach.review_count} avis</span>` : `<span>Pas encore d'avis</span>`}
            ${needsPremium ? `<span class="sidebar-badge badge-premium">Premium requis</span>` : ""}
          </div>
        </div>
      </div>
      ${coach.bio ? `<p style="font-size:.87rem;color:var(--chalk-dim);margin:0">${esc(coach.bio)}</p>` : ""}
      ${specs ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${specs}</div>` : ""}
      ${ctaHtml}`;
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
