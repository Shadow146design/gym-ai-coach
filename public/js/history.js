async function init() {
  const me = await fetch("/api/auth/me");
  if (!me.ok) return (window.location.href = "/");
  const r = await fetch("/api/program/history").then(r=>r.json());
  const list = document.getElementById("history-list");
  const empty = document.getElementById("empty");
  if (!r.programs?.length) { empty.classList.remove("hidden"); return; }

  r.programs.forEach(prog => {
    const q = prog.questionnaire;
    const card = document.createElement("div");
    card.className = "card";
    card.style.marginBottom = "14px";
    card.style.borderLeft = prog.is_active ? "3px solid var(--rust)" : "3px solid var(--border)";
    card.innerHTML = `
      <div class="flex-between">
        <div>
          <div style="font-weight:600;font-size:.95rem">${esc(prog.title)}</div>
          <div style="font-size:.78rem;color:var(--chalk-dim);margin-top:4px">
            ${esc(q.objectif||"")} · ${esc(q.niveau||"")} · ${esc(q.joursParSemaine||"")}j/sem
          </div>
          <div style="font-size:.72rem;color:var(--chalk-dim);margin-top:2px">
            ${new Date(prog.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
          </div>
        </div>
        ${prog.is_active
          ? `<span style="font-size:.75rem;background:var(--rust-bg);color:var(--rust-soft);padding:4px 10px;border-radius:4px">ACTIF</span>`
          : `<button class="btn btn-ghost btn-sm" onclick="reactivate(${prog.id})">Réactiver</button>`}
      </div>`;
    list.appendChild(card);
  });
}

async function reactivate(id) {
  await fetch(`/api/program/${id}/activate`, { method: "POST" });
  window.location.href = "/dashboard.html";
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = String(str||"");
  return d.innerHTML;
}

init();
