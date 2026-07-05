const clientId = new URLSearchParams(window.location.search).get("id");
if (!clientId) window.location.href = "/coach-dashboard.html";

async function init() {
  const me = await fetch("/api/auth/me").then(r=>r.json());
  if (!me.user || !["coach","admin"].includes(me.user.role)) return window.location.href="/home.html";

  document.getElementById("msg-btn").href = `/messages.html?with=${clientId}`;

  const r = await fetch(`/api/coaches/dashboard/clients/${clientId}/stats`).then(r=>r.json());
  if (r.error) return window.location.href="/coach-dashboard.html";

  const { client, program, stats, records, hidden, statsHidden } = r;

  document.getElementById("client-name").textContent = client.name;
  document.getElementById("client-meta").textContent = client.email || "";

  if (hidden) {
    document.getElementById("client-profile").innerHTML = `<span class="muted">Ce client a restreint la visibilité de son profil.</span>`;
    document.getElementById("client-stats").innerHTML = `<span class="muted">Données non partagées.</span>`;
    return;
  }

  // Profil physique
  const profileItems = [
    client.weight_kg  ? `Poids : ${client.weight_kg} kg` : null,
    client.height_cm  ? `Taille : ${client.height_cm} cm` : null,
    client.age        ? `Âge : ${client.age} ans` : null,
    client.gender     ? `Genre : ${client.gender}` : null,
    client.activity_level ? `Activité : ${client.activity_level}` : null,
  ].filter(Boolean);

  document.getElementById("client-profile").innerHTML = profileItems.length
    ? profileItems.map(i => `<div style="padding:5px 0;border-bottom:1px solid var(--border-soft)">${i}</div>`).join("")
    : `<span class="muted">Profil non renseigné</span>`;

  // Stats
  document.getElementById("client-stats").innerHTML = statsHidden
    ? `<span class="muted">Ce client n'a pas partagé ses statistiques.</span>`
    : `<div style="padding:5px 0;border-bottom:1px solid var(--border-soft)">Séances : <strong>${stats?.sessions || 0}</strong></div>
       <div style="padding:5px 0">Volume total : <strong>${Math.round((stats?.total_volume||0)/1000)} T</strong></div>`;

  // Programme
  if (program) {
    document.getElementById("client-program-section").classList.remove("hidden");
    document.getElementById("client-program-content").innerHTML = `
      <div style="font-weight:600;margin-bottom:6px">${esc(program.title)}</div>
      <div style="font-size:.82rem;color:var(--chalk-dim)">${(program.content.days||[]).map(d=>`${d.day} (${d.focus})`).join(" · ")}</div>`;
  }

  // Records
  const recsEl = document.getElementById("client-records");
  recsEl.innerHTML = records.length
    ? records.map(r=>`<div class="home-record-row"><span>${esc(r.exercise_name)}</span><span class="home-record-val">${r.max_weight} kg</span></div>`).join("")
    : `<p class="muted" style="font-size:.85rem">Pas encore de données.</p>`;
}

function toggleProgForm() {
  document.getElementById("prog-form").classList.toggle("hidden");
}

async function createProgram() {
  const btn = document.getElementById("prog-btn");
  const msg = document.getElementById("prog-msg");
  btn.disabled = true;
  btn.textContent = "Génération en cours…";
  msg.textContent = "";

  const body = {
    objectif: document.getElementById("pf-objectif").value,
    niveau: document.getElementById("pf-niveau").value,
    joursParSemaine: document.getElementById("pf-jours").value,
    dureeSeance: document.getElementById("pf-duree").value,
    materiel: document.getElementById("pf-materiel").value,
    limitations: document.getElementById("pf-limitations").value,
  };

  const r = await fetch(`/api/coaches/dashboard/clients/${clientId}/program`, {
    method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body)
  }).then(r=>r.json());

  btn.disabled = false;
  btn.textContent = "Générer avec l'IA";

  if (r.program) {
    msg.innerHTML = `✅ Programme "<strong>${esc(r.program.title)}</strong>" créé et activé pour ${esc(document.getElementById("client-name").textContent)} !`;
    msg.style.color = "var(--green)";
    setTimeout(init, 1500);
  } else {
    msg.textContent = r.error || "Erreur lors de la génération.";
    msg.style.color = "var(--red)";
  }
}

function esc(s) { const d=document.createElement("div"); d.textContent=String(s||""); return d.innerHTML; }
init();
