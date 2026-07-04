let allUsers = [];

async function init() {
  const me = await fetch("/api/auth/me").then(r=>r.json());
  if (!me.user || me.user.role !== "admin") return window.location.href="/home.html";

  const [statsR, usersR] = await Promise.all([
    fetch("/api/admin/stats").then(r=>r.json()),
    fetch("/api/admin/users").then(r=>r.json()),
  ]);

  // KPI
  const roleMap = {};
  statsR.roles?.forEach(r => { roleMap[r.role] = parseInt(r.count); });
  document.getElementById("admin-kpis").innerHTML = `
    <div class="kpi-tile"><div class="kpi-label">Utilisateurs</div><div class="kpi-value">${roleMap.user||0}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Premium</div><div class="kpi-value" style="color:var(--gold)">${roleMap.premium||0}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Coaches</div><div class="kpi-value" style="color:var(--steel-soft)">${roleMap.coach||0}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Séances totales</div><div class="kpi-value">${statsR.sessions||0}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Assignments actifs</div><div class="kpi-value">${statsR.assignments||0}</div></div>
    <div class="kpi-tile"><div class="kpi-label">Messages 7j</div><div class="kpi-value">${statsR.messages7d||0}</div></div>`;

  allUsers = usersR.users || [];
  renderUsers(allUsers);
}

function renderUsers(users) {
  const body = document.getElementById("users-body");
  const roles = ["user","premium","coach","admin"];
  const roleColors = { user:"var(--chalk-dim)", premium:"var(--gold)", coach:"var(--steel-soft)", admin:"var(--rust-soft)" };

  body.innerHTML = users.map(u => `
    <tr style="border-top:1px solid var(--border-soft)" id="row-${u.id}">
      <td style="padding:10px 8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:28px;height:28px;border-radius:50%;overflow:hidden;background:var(--bg-hover);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.8rem">
            ${u.avatar_url ? `<img src="${esc(u.avatar_url)}" style="width:100%;height:100%;object-fit:cover"/>` : "👤"}
          </div>
          ${esc(u.name)}
        </div>
      </td>
      <td style="padding:10px 8px;color:var(--chalk-dim)">${esc(u.email)}</td>
      <td style="padding:10px 8px">
        <select onchange="changeRole(${u.id}, this.value)" style="width:auto;padding:4px 8px;font-size:.78rem;color:${roleColors[u.role]||'var(--chalk)'}">
          ${roles.map(r => `<option value="${r}" ${r===u.role?"selected":""}>${r}</option>`).join("")}
        </select>
      </td>
      <td style="padding:10px 8px;text-align:right;font-family:var(--font-mono)">${u.logs_count||0}</td>
      <td style="padding:10px 8px;color:var(--chalk-dim)">
        ${u.last_session ? new Date(u.last_session).toLocaleDateString("fr-FR") : "—"}
      </td>
      <td style="padding:10px 8px">
        <a href="/messages.html?with=${u.id}" style="font-size:.78rem;color:var(--chalk-dim)">💬</a>
      </td>
    </tr>`).join("");
}

async function changeRole(userId, role) {
  const r = await fetch(`/api/admin/users/${userId}/role`, {
    method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({role})
  }).then(r=>r.json());
  if (!r.ok) alert(r.error);
  else {
    const u = allUsers.find(u=>u.id===userId);
    if (u) u.role = role;
  }
}

function filterUsers(q) {
  const filtered = q
    ? allUsers.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
    : allUsers;
  renderUsers(filtered);
}

function esc(s) { const d=document.createElement("div"); d.textContent=String(s||""); return d.innerHTML; }

document.getElementById("logout-link")?.addEventListener("click", async e => {
  e.preventDefault();
  await fetch("/api/auth/logout",{method:"POST"});
  window.location.href="/";
});

init();
