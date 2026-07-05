// Applique le theme sauvegarde immediatement (avant meme le fetch /me) pour eviter un flash.
document.documentElement.setAttribute("data-theme", localStorage.getItem("theme") || "dark");

(function () {
  const NAV_ITEMS = [
    { href: "/home.html", icon: "🏠", labelKey: "nav_home" },
    { href: "/session.html", icon: "▶️", labelKey: "nav_session", cta: true },
    { href: "/dashboard.html", icon: "📋", labelKey: "nav_program" },
    { href: "/stats.html", icon: "📊", labelKey: "nav_stats" },
    { sep: true },
    { href: "/exercises.html", icon: "🏋️", labelKey: "nav_exercises" },
    { href: "/coaches.html", icon: "🏅", labelKey: "nav_coaches" },
    { href: "/messages.html", icon: "💬", labelKey: "nav_messages", badge: true },
    { href: "/premium.html", icon: "⭐", labelKey: "nav_premium", hideForRoles: ["premium", "coach"] },
    { sep: true },
    { href: "/profile.html", icon: "👤", labelKey: "nav_profile" },
    { href: "/history.html", icon: "📅", labelKey: "nav_history" },
    { href: "/settings.html", icon: "⚙️", labelKey: "nav_settings" },
  ];

  const BOTTOM_NAV_ITEMS = [
    { href: "/home.html", icon: "🏠", labelKey: "bottom_home" },
    { href: "/session.html", icon: "▶️", labelKey: "bottom_session" },
    { href: "/dashboard.html", icon: "📋", labelKey: "bottom_program" },
    { href: "/stats.html", icon: "📊", labelKey: "bottom_stats" },
    { href: "/profile.html", icon: "👤", labelKey: "bottom_profile" },
  ];

  const t = key => (window.i18n ? window.i18n.t(key) : key);

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

    let notifUnread = 0;
    try {
      const n = await fetch("/api/notifications/unread/count").then(r => r.ok ? r.json() : null);
      notifUnread = n?.unread || 0;
    } catch {}

    const items = NAV_ITEMS.filter(it => !(it.hideForRoles && it.hideForRoles.includes(role)));

    if (role === "coach" || role === "admin") {
      items.push({ sep: true });
      items.push({ href: "/coach-dashboard.html", icon: "🎛️", labelKey: "nav_coach_clients" });
    }
    if (role === "admin") {
      items.push({ href: "/admin.html", icon: "🔧", labelKey: "nav_admin" });
    }

    const navHtml = items.map(it => {
      if (it.sep) return `<div class="sidebar-sep"></div>`;
      const active = path === it.href ? " active" : "";
      const ctaClass = it.cta ? " sidebar-cta" : "";
      const badgeHtml = it.badge && unread > 0
        ? `<span class="sidebar-msg-badge">${unread > 9 ? "9+" : unread}</span>` : "";
      return `<a href="${it.href}" class="sidebar-item${active}${ctaClass}" data-key="${it.labelKey}">
        <span class="icon">${it.icon}</span><span class="lbl">${esc(t(it.labelKey))}</span>${badgeHtml}
      </a>`;
    }).join("");

    const roleBadge = role === "premium" ? `<span class="sidebar-badge badge-premium">Premium</span>`
      : role === "coach" ? `<span class="sidebar-badge badge-coach">Coach</span>`
      : role === "admin" ? `<span class="sidebar-badge badge-admin">Admin</span>`
      : "";

    const avatarHtml = user.avatar_url
      ? `<img src="${esc(user.avatar_url)}" style="width:100%;height:100%;object-fit:cover"/>`
      : initials(user.name);

    const lang = window.i18n ? window.i18n.getLang() : "fr";
    const sidebarHtml = `
      <aside class="sidebar">
        <div class="sidebar-logo-row">
          <a class="sidebar-logo" href="/home.html">
            <svg viewBox="0 0 24 24" fill="none"><rect x="2" y="10" width="3" height="4" rx="1" fill="currentColor"/><rect x="6" y="8" width="2.5" height="8" rx="1" fill="currentColor"/><rect x="9.5" y="11" width="5" height="2" fill="currentColor"/><rect x="15.5" y="8" width="2.5" height="8" rx="1" fill="currentColor"/><rect x="19" y="10" width="3" height="4" rx="1" fill="currentColor"/></svg>
            <span>Gym AI Coach</span>
          </a>
          <button type="button" class="sidebar-bell" id="sidebar-bell" title="Notifications">
            🔔${notifUnread > 0 ? `<span class="sidebar-bell-badge">${notifUnread > 9 ? "9+" : notifUnread}</span>` : ""}
          </button>
        </div>
        <div class="notif-panel hidden" id="notif-panel">
          <div class="notif-panel-head">
            <span>Notifications</span>
            <button type="button" class="notif-mark-all" id="notif-mark-all">Tout marquer lu</button>
          </div>
          <div class="notif-panel-list" id="notif-panel-list"></div>
        </div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-lang">
          <button type="button" class="sidebar-lang-btn${lang === "fr" ? " active" : ""}" data-lang="fr">FR</button>
          <button type="button" class="sidebar-lang-btn${lang === "en" ? " active" : ""}" data-lang="en">EN</button>
        </div>
        <div class="sidebar-user">
          <div class="sidebar-avatar">${avatarHtml}</div>
          <div class="user-info" style="flex:1;min-width:0">
            <div style="font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(user.name)}</div>
            ${roleBadge}
          </div>
          <a href="#" class="sidebar-logout" id="sidebar-logout" title="${esc(t("nav_logout"))}">⏻</a>
        </div>
      </aside>`;

    const bottomNavHtml = `
      <nav class="bottom-nav">
        ${BOTTOM_NAV_ITEMS.map(it => `
          <a href="${it.href}" class="bottom-nav-item${path === it.href ? " active" : ""}" data-key="${it.labelKey}">
            <span class="icon">${it.icon}</span><span class="lbl">${esc(t(it.labelKey))}</span>
          </a>`).join("")}
      </nav>`;

    document.body.insertAdjacentHTML("afterbegin", sidebarHtml);
    document.body.insertAdjacentHTML("beforeend", bottomNavHtml);

    document.getElementById("sidebar-logout")?.addEventListener("click", async e => {
      e.preventDefault();
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    });

    const bellBtn = document.getElementById("sidebar-bell");
    const notifPanel = document.getElementById("notif-panel");
    bellBtn?.addEventListener("click", async () => {
      const willOpen = notifPanel.classList.contains("hidden");
      notifPanel.classList.toggle("hidden");
      if (willOpen) await loadNotifPanel();
    });
    document.addEventListener("click", e => {
      if (!notifPanel.classList.contains("hidden") && !notifPanel.contains(e.target) && e.target !== bellBtn) {
        notifPanel.classList.add("hidden");
      }
    });

    async function loadNotifPanel() {
      const list = document.getElementById("notif-panel-list");
      list.innerHTML = `<div class="notif-empty">Chargement…</div>`;
      try {
        const r = await fetch("/api/notifications").then(r => r.json());
        const notifs = r.notifications || [];
        if (!notifs.length) { list.innerHTML = `<div class="notif-empty">Aucune notification.</div>`; return; }
        list.innerHTML = notifs.map(n => `
          <a href="${esc(n.link || "#")}" class="notif-item${n.read_at ? "" : " unread"}" data-id="${n.id}">
            <div class="notif-msg">${esc(n.message)}</div>
            <div class="notif-date">${new Date(n.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
          </a>`).join("");
        list.querySelectorAll(".notif-item").forEach(el => {
          el.addEventListener("click", () => {
            fetch(`/api/notifications/${el.dataset.id}/read`, { method: "POST" }).catch(() => {});
          });
        });
      } catch {
        list.innerHTML = `<div class="notif-empty">Impossible de charger.</div>`;
      }
    }

    document.getElementById("notif-mark-all")?.addEventListener("click", async () => {
      await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
      bellBtn.querySelector(".sidebar-bell-badge")?.remove();
      document.querySelectorAll(".notif-item.unread").forEach(el => el.classList.remove("unread"));
    });

    document.querySelectorAll(".sidebar-lang-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        window.i18n?.setLang(btn.dataset.lang);
        document.querySelectorAll(".sidebar-lang-btn").forEach(b => b.classList.toggle("active", b === btn));
        relabelNav();
      });
    });

    function relabelNav() {
      document.querySelectorAll(".sidebar-item[data-key], .bottom-nav-item[data-key]").forEach(el => {
        const lbl = el.querySelector(".lbl");
        if (lbl) lbl.textContent = t(el.getAttribute("data-key"));
      });
      const logout = document.getElementById("sidebar-logout");
      if (logout) logout.title = t("nav_logout");
    }
  }

  init();
})();
