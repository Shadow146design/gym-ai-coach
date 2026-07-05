// Applique le theme sauvegarde immediatement (avant meme le fetch /me) pour eviter un flash.
document.documentElement.setAttribute("data-theme", localStorage.getItem("theme") || "dark");

(function () {
  const NAV_ITEMS = [
    { href: "/home.html", icon: "🏠", label: "Accueil" },
    { href: "/session.html", icon: "▶️", label: "Séance du jour", cta: true },
    { href: "/dashboard.html", icon: "📋", label: "Programme" },
    { href: "/stats.html", icon: "📊", label: "Statistiques" },
    { sep: true },
    { href: "/coaches.html", icon: "🏅", label: "Coaches" },
    { href: "/messages.html", icon: "💬", label: "Messages", badge: true },
    { href: "/premium.html", icon: "⭐", label: "Premium", hideForRoles: ["premium", "coach"] },
    { sep: true },
    { href: "/profile.html", icon: "👤", label: "Mon profil" },
    { href: "/history.html", icon: "📅", label: "Historique" },
    { href: "/settings.html", icon: "⚙️", label: "Paramètres" },
  ];

  const BOTTOM_NAV_ITEMS = [
    { href: "/home.html", icon: "🏠", label: "Accueil" },
    { href: "/session.html", icon: "▶️", label: "Séance" },
    { href: "/dashboard.html", icon: "📋", label: "Programme" },
    { href: "/stats.html", icon: "📊", label: "Stats" },
    { href: "/profile.html", icon: "👤", label: "Profil" },
  ];

  function initials(name) {
    if (!name) return "?";
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
  }

  function esc(s) { const d = document.createElement("div"); d.textContent = String(s || ""); return d.innerHTML; }

  async function init() {
    const me = await fetch("/api/auth/me").then(r => r.ok ? r.json() : null).catch(() => null);
    const user = me?.user;
    if (!user) return;

    const role = user.role;
    const path = window.location.pathname;

    let unread = 0;
    try {
      const u = await fetch("/api/messages/unread/count").then(r => r.ok ? r.json() : null);
      unread = u?.unread || 0;
    } catch {}

    const items = NAV_ITEMS.filter(it => !(it.hideForRoles && it.hideForRoles.includes(role)));

    if (role === "coach" || role === "admin") {
      items.push({ sep: true });
      items.push({ href: "/coach-dashboard.html", icon: "🎛️", label: "Mes clients" });
    }
    if (role === "admin") {
      items.push({ href: "/admin.html", icon: "🔧", label: "Admin" });
    }

    const navHtml = items.map(it => {
      if (it.sep) return `<div class="sidebar-sep"></div>`;
      const active = path === it.href ? " active" : "";
      const ctaClass = it.cta ? " sidebar-cta" : "";
      const badgeHtml = it.badge && unread > 0
        ? `<span class="sidebar-msg-badge">${unread > 9 ? "9+" : unread}</span>` : "";
      return `<a href="${it.href}" class="sidebar-item${active}${ctaClass}">
        <span class="icon">${it.icon}</span><span>${esc(it.label)}</span>${badgeHtml}
      </a>`;
    }).join("");

    const roleBadge = role === "premium" ? `<span class="sidebar-badge badge-premium">Premium</span>`
      : role === "coach" ? `<span class="sidebar-badge badge-coach">Coach</span>`
      : role === "admin" ? `<span class="sidebar-badge badge-admin">Admin</span>`
      : "";

    const avatarHtml = user.avatar_url
      ? `<img src="${esc(user.avatar_url)}" style="width:100%;height:100%;object-fit:cover"/>`
      : initials(user.name);

    const sidebarHtml = `
      <aside class="sidebar">
        <a class="sidebar-logo" href="/home.html">
          <svg viewBox="0 0 24 24" fill="none"><rect x="2" y="10" width="3" height="4" rx="1" fill="currentColor"/><rect x="6" y="8" width="2.5" height="8" rx="1" fill="currentColor"/><rect x="9.5" y="11" width="5" height="2" fill="currentColor"/><rect x="15.5" y="8" width="2.5" height="8" rx="1" fill="currentColor"/><rect x="19" y="10" width="3" height="4" rx="1" fill="currentColor"/></svg>
          <span>Gym AI Coach</span>
        </a>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-user">
          <div class="sidebar-avatar">${avatarHtml}</div>
          <div class="user-info" style="flex:1;min-width:0">
            <div style="font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(user.name)}</div>
            ${roleBadge}
          </div>
          <a href="#" class="sidebar-logout" id="sidebar-logout" title="Déconnexion">⏻</a>
        </div>
      </aside>`;

    const bottomNavHtml = `
      <nav class="bottom-nav">
        ${BOTTOM_NAV_ITEMS.map(it => `
          <a href="${it.href}" class="bottom-nav-item${path === it.href ? " active" : ""}">
            <span class="icon">${it.icon}</span>${esc(it.label)}
          </a>`).join("")}
      </nav>`;

    document.body.insertAdjacentHTML("afterbegin", sidebarHtml);
    document.body.insertAdjacentHTML("beforeend", bottomNavHtml);

    document.getElementById("sidebar-logout")?.addEventListener("click", async e => {
      e.preventDefault();
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    });
  }

  init();
})();
