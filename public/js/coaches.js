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
let recommendedCoachId = null;
let recommendedReason = "";

// Suggestion de coach (section 3.10) : associe l'objectif principal de
// l'utilisateur aux specialites des coaches via des mots-cles, sans appel IA
// supplementaire (le mapping est stable et gratuit a executer a chaque visite).
const GOAL_SPECIALTY_KEYWORDS = [
  { goalWords: ["masse", "muscl", "hypertrophie", "grossir"], specWords: ["masse", "hypertrophie", "musculation"] },
  { goalWords: ["perte", "poids", "sécher", "secher", "maigrir", "cardio"], specWords: ["perte de poids", "cardio", "sèche", "seche", "nutrition"] },
  { goalWords: ["force", "powerlifting", "1rm"], specWords: ["force", "powerlifting"] },
  { goalWords: ["débutant", "debutant", "reprise"], specWords: ["débutant", "debutant"] },
  { goalWords: ["blessure", "rééducation", "reeducation", "douleur"], specWords: ["rééducation", "reeducation", "prévention", "prevention"] },
];

async function computeRecommendation() {
  try {
    const profile = await fetch("/api/profile/full").then(r => r.ok ? r.json() : null).catch(() => null);
    const mainGoalRaw = profile?.user?.main_goal || "";
    const mainGoal = mainGoalRaw.toLowerCase();
    if (!mainGoal) return;

    const matchedSpecWords = GOAL_SPECIALTY_KEYWORDS
      .filter(rule => rule.goalWords.some(w => mainGoal.includes(w)))
      .flatMap(rule => rule.specWords);
    if (!matchedSpecWords.length) return;

    for (const coach of allCoaches) {
      const specs = (coach.specialties || []).map(s => s.toLowerCase());
      if (specs.some(s => matchedSpecWords.some(w => s.includes(w)))) {
        recommendedCoachId = coach.id;
        recommendedReason = `Basé sur ton objectif ("${mainGoalRaw}"), ce coach serait un bon choix pour toi.`;
        return;
      }
    }
  } catch {}
}

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

  if (!mineAssignment && allCoaches.length) await computeRecommendation();

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
    card.style.position = "relative";

    const alreadyMine = mineAssignment?.coach_id === coach.id;
    const isRecommended = coach.id === recommendedCoachId;
    if (isRecommended) card.style.borderColor = "var(--rust)";
    const specs = (coach.specialties || []).map(s => `<span class="badge badge-blue">${esc(s)}</span>`).join(" ");
    const isPaid = coach.price_monthly > 0;
    const price = isPaid ? `${coach.price_monthly}€/mois` : "Gratuit";
    const needsPremium = isPaid && !["premium", "admin"].includes(myRole);

    let ctaHtml;
    if (alreadyMine) {
      ctaHtml = `<div style="text-align:center;font-size:.82rem;color:var(--green)">✅ Ton coach actuel</div>`;
    } else if (needsPremium) {
      ctaHtml = `<a class="btn btn-ghost btn-sm btn-block" href="/premium.html">⭐ Passer Premium pour choisir ce coach</a>`;
    } else {
      ctaHtml = `<button class="btn btn-primary btn-block" onclick="requestCoach(${coach.id},this)">Contacter</button>`;
    }

    card.innerHTML = `
      ${isRecommended ? `<span style="position:absolute;top:-10px;right:14px;background:var(--grad-rust);color:#fff;font-size:.68rem;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:.02em">✨ Recommandé pour toi</span>` : ""}
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px">
        <div class="coach-card-avatar">
          ${coach.avatar_url ? `<img src="${esc(coach.avatar_url)}" style="width:100%;height:100%;object-fit:cover" loading="lazy"/>` : "🏋️"}
        </div>
        <div style="font-weight:700;font-size:1.05rem">${esc(coach.name)}</div>
        ${coach.avg_rating ? `<div style="color:var(--gold);font-size:.85rem">⭐ ${coach.avg_rating} <span style="color:var(--chalk-dim)">(${coach.review_count} avis)</span></div>` : `<div class="muted" style="font-size:.8rem">Pas encore d'avis</div>`}
        <div style="font-family:var(--font-mono);font-size:1.1rem;color:var(--chalk);margin-top:2px">${price}</div>
        <div style="font-size:.75rem;color:var(--chalk-dim)">${coach.client_count} client${coach.client_count>1?"s":""}${needsPremium ? ` <span class="badge badge-gold">Premium requis</span>` : ""}</div>
      </div>
      ${isRecommended ? `<p style="font-size:.82rem;color:var(--rust-soft);margin:0;text-align:center">💡 ${esc(recommendedReason)}</p>` : ""}
      ${coach.bio ? `<p class="coach-card-bio">${esc(coach.bio)}</p>` : ""}
      ${specs ? `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">${specs}</div>` : ""}
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
