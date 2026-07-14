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

function activityHeatmapHtml(activity) {
  const byDay = {};
  activity.forEach(a => { byDay[a.day] = a.count; });

  const today = new Date();
  const cells = [];
  for (let i = 363; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const count = byDay[key] || 0;
    const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : 3;
    cells.push(`<div class="activity-cell level-${level}" title="${key} : ${count} série${count > 1 ? "s" : ""}"></div>`);
  }
  return `<div class="activity-heatmap">${cells.join("")}</div>`;
}

async function init() {
  const username = window.location.pathname.split("/").filter(Boolean).pop();
  const content = document.getElementById("u-content");

  try {
    const [res, meRes] = await Promise.all([
      fetch(`/api/users/profile/${encodeURIComponent(username)}`),
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    const viewerLoggedIn = !!meRes?.user;
    if (!res.ok) {
      content.innerHTML = `
        <div class="empty-state">
          <h3>Profil introuvable</h3>
          <p class="muted" style="margin-top:8px">Ce profil n'existe pas ou n'est pas public.</p>
        </div>`;
      return;
    }
    const { user, stats, topRecords, badgeCount, activeProgramTitle, certifiedAt, muscleVolume, activity } = await res.json();

    const avatarHtml = user.avatar_url
      ? `<img src="${esc(user.avatar_url)}" style="width:100%;height:100%;object-fit:cover"/>`
      : initials(user.name);

    content.innerHTML = `
      <div class="profile-section">
        <div class="identity-row">
          <div class="avatar-large" id="u-avatar">${avatarHtml}</div>
          <div class="identity-meta">
            <div class="identity-name">${esc(user.name)}${certifiedAt ? ` <span title="Athlète Certifié Gym AI Coach">🎓</span>` : ""}</div>
            <div style="margin-top:6px">${roleBadgeHtml(user.role)}</div>
            <div class="identity-since">Membre depuis le ${new Date(user.memberSince).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
            ${certifiedAt ? `<div class="identity-since" style="color:var(--gold)">🎓 Athlète Certifié depuis le ${new Date(certifiedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>` : ""}
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

      ${muscleVolume.length >= 3 ? `
      <div class="profile-section">
        <div class="profile-section-title">🎯 Groupes musculaires (30j)</div>
        <canvas id="u-muscle-radar" height="200"></canvas>
      </div>` : ""}

      <div class="profile-section">
        <div class="profile-section-title">📅 Activité (12 derniers mois)</div>
        ${activityHeatmapHtml(activity)}
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:20px 0">
        ${viewerLoggedIn ? `<button class="btn btn-primary btn-sm" id="u-challenge-btn">🥊 Défier cette semaine</button>` : ""}
        <button class="btn btn-ghost btn-sm" id="u-share-btn">🔗 Copier le lien</button>
      </div>

      <p class="muted" style="text-align:center;font-size:.8rem;margin:20px 0">Généré par <a href="/" style="color:var(--rust-soft)">Gym AI Coach</a></p>`;

    if (muscleVolume.length >= 3 && typeof Chart !== "undefined") {
      new Chart(document.getElementById("u-muscle-radar"), {
        type: "radar",
        data: {
          labels: muscleVolume.map(m => m.muscle_group),
          datasets: [{
            label: "Volume 30j (kg)",
            data: muscleVolume.map(m => m.volume),
            borderColor: "#3da874",
            backgroundColor: "rgba(61,168,116,.18)",
            pointBackgroundColor: "#e8b33d",
            pointBorderColor: "#e8b33d",
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: "#8f8b84", font: { family: "Inter", size: 11 } } } },
          scales: {
            r: {
              angleLines: { color: "rgba(255,255,255,.08)" },
              grid: { color: "rgba(255,255,255,.08)" },
              pointLabels: { color: "#c9c6c1", font: { size: 11 } },
              ticks: { display: false },
            },
          },
        },
      });
    }

    document.getElementById("u-share-btn")?.addEventListener("click", async e => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        e.target.textContent = "✓ Lien copié";
        setTimeout(() => { e.target.textContent = "🔗 Copier le lien"; }, 2000);
      } catch {}
    });

    document.getElementById("u-challenge-btn")?.addEventListener("click", async e => {
      e.target.disabled = true;
      try {
        const r = await fetch(`/api/users/challenge/${encodeURIComponent(username)}`, { method: "POST" });
        const data = await r.json();
        if (r.ok) { e.target.textContent = "✓ Défi envoyé"; }
        else { e.target.textContent = data.error || "Erreur"; e.target.disabled = false; }
      } catch {
        e.target.disabled = false;
      }
    });
  } catch {
    content.innerHTML = `<p class="muted">Impossible de charger ce profil.</p>`;
  }
}

init();
