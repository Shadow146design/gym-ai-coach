async function init() {
  const me = await fetch("/api/auth/me").then(r=>r.json());
  if (!me.user || !["coach","admin"].includes(me.user.role)) {
    return window.location.href="/home.html";
  }
  document.getElementById("coach-greeting").textContent = `Bonjour ${me.user.name} 👋`;

  await Promise.all([loadClients(), loadProfile(), loadAffiliations()]);
}

// ── Affiliations (fonctionnalité 8) ────────────────────────
async function loadAffiliations() {
  try {
    const r = await fetch("/api/affiliations/stats").then(res => res.json());

    document.getElementById("aff-link").value = r.link;
    document.getElementById("aff-kpis").innerHTML = `
      <div class="kpi-tile"><div class="kpi-label">Filleuls Premium</div><div class="kpi-value">${r.totalReferrals}</div></div>
      <div class="kpi-tile"><div class="kpi-label">Gains ce mois</div><div class="kpi-value" style="color:var(--gold)">${r.earningsThisMonth.toFixed(2)}<span style="font-size:.9rem"> €</span></div></div>
      <div class="kpi-tile"><div class="kpi-label">Gains totaux</div><div class="kpi-value">${r.totalEarnings.toFixed(2)}<span style="font-size:.9rem"> €</span></div></div>`;

    document.getElementById("aff-history").innerHTML = r.conversions.length
      ? r.conversions.map(c => `
        <div class="stat-row">
          <span>${esc(c.referred_name)} <span class="muted" style="font-size:.78rem">${new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span></span>
          <span class="stat-val">+${Number(c.commission).toFixed(2)} €</span>
        </div>`).join("")
      : `<p class="muted" style="font-size:.85rem">Aucune conversion pour l'instant. Partage ton lien pour commencer à gagner des commissions.</p>`;
  } catch {
    document.getElementById("aff-history").innerHTML = `<p class="muted" style="font-size:.85rem">Impossible de charger les affiliations.</p>`;
  }
}

document.getElementById("aff-copy-btn")?.addEventListener("click", () => {
  const input = document.getElementById("aff-link");
  input.select();
  navigator.clipboard?.writeText(input.value).catch(() => {});
  const btn = document.getElementById("aff-copy-btn");
  const original = btn.textContent;
  btn.textContent = "Copié ✓";
  setTimeout(() => { btn.textContent = original; }, 1500);
});

async function loadClients() {
  const r = await fetch("/api/coaches/dashboard/clients").then(r=>r.json());
  const pending = r.clients?.filter(c => c.status==="pending") || [];
  const active  = r.clients?.filter(c => c.status==="active")  || [];

  document.getElementById("coach-stats-line").textContent =
    `${active.length} client${active.length>1?"s":""} actif${active.length>1?"s":""} · ${pending.length} demande${pending.length>1?"s":""}`;

  // Demandes
  const pendingSec = document.getElementById("pending-section");
  const pendingList = document.getElementById("pending-list");
  if (pending.length) {
    pendingSec.classList.remove("hidden");
    pendingList.innerHTML = pending.map(c => `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:14px 18px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--rust-bg);display:flex;align-items:center;justify-content:center;overflow:hidden">
            ${c.avatar_url?`<img src="${esc(c.avatar_url)}" style="width:100%;height:100%;object-fit:cover" loading="lazy"/>`:"👤"}
          </div>
          <div><div style="font-weight:600">${esc(c.name)}</div><div style="font-size:.75rem;color:var(--chalk-dim)">${esc(c.email)}</div></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-green btn-sm" onclick="respond(${c.assignment_id},'accept',this)">Accepter</button>
          <button class="btn btn-ghost btn-sm" onclick="respond(${c.assignment_id},'decline',this)">Refuser</button>
        </div>
      </div>`).join("");
  }

  // Clients actifs
  const grid = document.getElementById("clients-grid");
  const noClients = document.getElementById("no-clients");
  if (!active.length) { noClients.classList.remove("hidden"); return; }

  grid.innerHTML = active.map(c => `
    <div class="card" style="cursor:pointer" onclick="openClient(${c.id})">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:40px;height:40px;border-radius:50%;background:var(--rust-bg);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
          ${c.avatar_url?`<img src="${esc(c.avatar_url)}" style="width:100%;height:100%;object-fit:cover" loading="lazy"/>`:"👤"}
        </div>
        <div>
          <div style="font-weight:600">${esc(c.name)}</div>
          <div style="font-size:.75rem;color:var(--chalk-dim)">${c.total_logs} séries loggées</div>
        </div>
      </div>
      <div style="font-size:.78rem;color:var(--chalk-dim)">
        ${c.last_session ? `Dernière séance : ${new Date(c.last_session).toLocaleDateString("fr-FR")}` : "Pas encore de séance"}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="event.stopPropagation();openClient(${c.id})">Voir les stats</button>
        <a class="btn btn-ghost btn-sm" href="/messages.html?with=${c.id}" onclick="event.stopPropagation()">💬</a>
      </div>
    </div>`).join("");
}

function openClient(id) {
  window.location.href = `/coach-client.html?id=${id}`;
}

async function respond(assignmentId, action, btn) {
  btn.disabled = true;
  await fetch(`/api/coaches/dashboard/assignments/${assignmentId}/${action}`, { method: "POST" });
  loadClients();
}

async function loadProfile() {
  const r = await fetch("/api/coaches/profile").then(r=>r.json());
  if (!r.profile) return;
  document.getElementById("cp-bio").value = r.profile.bio || "";
  document.getElementById("cp-specs").value = (r.profile.specialties || []).join(", ");
  document.getElementById("cp-price").value = r.profile.price_monthly || 0;
  document.getElementById("cp-available").checked = r.profile.available !== false;
}

function toggleProfileEdit() {
  document.getElementById("profile-edit").classList.toggle("hidden");
}

async function saveProfile() {
  const bio = document.getElementById("cp-bio").value;
  const specs = document.getElementById("cp-specs").value.split(",").map(s=>s.trim()).filter(Boolean);
  const price = parseFloat(document.getElementById("cp-price").value) || 0;
  const available = document.getElementById("cp-available").checked;
  const r = await fetch("/api/coaches/profile", {
    method: "PUT", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ bio, specialties: specs, price_monthly: price, available })
  }).then(r=>r.json());
  document.getElementById("profile-msg").textContent = r.ok ? "✅ Profil sauvegardé !" : r.error;
}

function esc(s) { const d=document.createElement("div"); d.textContent=String(s||""); return d.innerHTML; }

init();
