// Profil public (fonctionnalite 7) : page accessible sans connexion sur
// /u/[username]. Lit le username depuis l'URL et affiche les donnees
// renvoyees par GET /api/users/profile/:username.
function esc(s) { const d = document.createElement("div"); d.textContent = String(s || ""); return d.innerHTML; }

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function roleBadgeHtml(role) {
  if (role === "premium") return `<span class="sidebar-badge badge-premium">Premium</span>`;
  if (role === "coach") return `<span class="sidebar-badge badge-coach">Coach</span>`;
  if (role === "admin") return `<span class="sidebar-badge badge-admin">Admin</span>`;
  return "";
}

async function init() {
  const username = window.location.pathname.split("/").filter(Boolean).pop();
  const content = document.getElementById("u-content");

  try {
    const res = await fetch(`/api/users/profile/${encodeURIComponent(username)}`);
    if (!res.ok) {
      content.innerHTML = `
        <div class="empty-state">
          <h3>Profil introuvable</h3>
          <p class="muted" style="margin-top:8px">Ce profil n'existe pas ou n'est pas public.</p>
        </div>`;
      return;
    }
    const { user, stats, topRecords, badgeCount, activeProgramTitle } = await res.json();

    const avatarHtml = user.avatar_url
      ? `<img src="${esc(user.avatar_url)}" style="width:100%;height:100%;object-fit:cover"/>`
      : initials(user.name);

    content.innerHTML = `
      <div class="profile-section">
        <div class="identity-row">
          <div class="avatar-large" id="u-avatar">${avatarHtml}</div>
          <div class="identity-meta">
            <div class="identity-name">${esc(user.name)}</div>
            <div style="margin-top:6px">${roleBadgeHtml(user.role)}</div>
            <div class="identity-since">Membre depuis le ${new Date(user.memberSince).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <div class="profile-section-title">📊 Statistiques</div>
        <div class="stat-row"><span>Total séances</span><span class="stat-val">${stats.totalSessions}</span></div>
        <div class="stat-row"><span>Streak actuel</span><span class="stat-val">${stats.streak} 🔥</span></div>
        <div class="stat-row"><span>Meilleur streak</span><span class="stat-val">${stats.bestStreak}</span></div>
        <div class="stat-row"><span>Badges débloqués</span><span class="stat-val">${badgeCount} 🏅</span></div>
        ${activeProgramTitle ? `<div class="stat-row"><span>Programme actif</span><span class="stat-val">${esc(activeProgramTitle)}</span></div>` : ""}
      </div>

      ${topRecords.length ? `
      <div class="profile-section">
        <div class="profile-section-title">🏆 Records</div>
        <div class="records-grid">
          ${topRecords.map(r => `
            <div class="record-tile">
              <div class="rec-ex">${esc(r.exercise_name)}</div>
              <div class="rec-val">${r.max_weight} kg</div>
            </div>`).join("")}
        </div>
      </div>` : ""}

      <p class="muted" style="text-align:center;font-size:.8rem;margin:20px 0">Généré par <a href="/" style="color:var(--rust-soft)">Gym AI Coach</a></p>`;
  } catch {
    content.innerHTML = `<p class="muted">Impossible de charger ce profil.</p>`;
  }
}

init();
