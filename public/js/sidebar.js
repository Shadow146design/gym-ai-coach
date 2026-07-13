// Applique le theme sauvegarde immediatement (avant meme le fetch /me) pour eviter un flash.
// "system" suit le theme OS via prefers-color-scheme ; sinon valeur explicite (dark/light).
function resolveTheme(pref) {
  if (pref === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return pref;
}
const _themePref = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", resolveTheme(_themePref));
if (_themePref === "system") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    if ((localStorage.getItem("theme") || "dark") === "system") {
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    }
  });
}

(function () {
  const NAV_ITEMS = [
    { href: "/home.html", icon: "🏠", labelKey: "nav_home" },
    { href: "/session.html", icon: "▶️", labelKey: "nav_session", cta: true },
    { href: "/dashboard.html", icon: "📋", labelKey: "nav_program" },
    { href: "/stats.html", icon: "📊", labelKey: "nav_stats" },
    { sep: true },
    { href: "/exercises.html", icon: "🏋️", labelKey: "nav_exercises" },
    { href: "/nutrition.html", icon: "🥗", labelKey: "nav_nutrition" },
    { href: "/coaches.html", icon: "🏅", labelKey: "nav_coaches" },
    { href: "/messages.html", icon: "💬", labelKey: "nav_messages", badge: true },
    { href: "/team.html", icon: "👥", labelKey: "nav_team" },
    { href: "/competition.html", icon: "🏆", labelKey: "nav_competition" },
    { href: "/referral.html", icon: "🎁", labelKey: "nav_referral" },
    { href: "/premium.html", icon: "⭐", labelKey: "nav_premium", hideForRoles: ["premium", "coach"] },
    { sep: true },
    { href: "/profile.html", icon: "👤", labelKey: "nav_profile" },
    { href: "/history.html", icon: "📅", labelKey: "nav_history" },
    { href: "/settings.html", icon: "⚙️", labelKey: "nav_settings" },
  ];

  // Icones SVG inline (style Feather) — remplacent les emojis sur la bottom nav mobile et le drawer "Plus".
  function svgIcon(inner) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  }
  const ICONS = {
    home: svgIcon(`<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`),
    play: svgIcon(`<polygon points="5 3 19 12 5 21 5 3"/>`),
    list: svgIcon(`<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`),
    barChart: svgIcon(`<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>`),
    user: svgIcon(`<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`),
    more: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,
    award: svgIcon(`<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>`),
    message: svgIcon(`<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>`),
    star: svgIcon(`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`),
    calendar: svgIcon(`<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`),
    activity: svgIcon(`<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`),
    settings: svgIcon(`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`),
    tool: svgIcon(`<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>`),
    users: svgIcon(`<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`),
    logout: svgIcon(`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`),
    pieChart: svgIcon(`<circle cx="12" cy="12" r="10"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>`),
    close: svgIcon(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`),
  };

  const BOTTOM_NAV_ITEMS = [
    { href: "/home.html", icon: ICONS.home, labelKey: "bottom_home" },
    { href: "/session.html", icon: ICONS.play, labelKey: "bottom_session" },
    { href: "/dashboard.html", icon: ICONS.list, labelKey: "bottom_program" },
    { href: "/stats.html", icon: ICONS.barChart, labelKey: "bottom_stats" },
    { href: "/profile.html", icon: ICONS.user, labelKey: "bottom_profile" },
  ];

  // Liens complementaires accessibles depuis le drawer "Plus" de la bottom nav mobile.
  const MORE_ITEMS = [
    { href: "/nutrition.html", icon: ICONS.pieChart, labelKey: "nav_nutrition" },
    { href: "/coaches.html", icon: ICONS.award, labelKey: "nav_coaches" },
    { href: "/messages.html", icon: ICONS.message, labelKey: "nav_messages", badge: true },
    { href: "/team.html", icon: ICONS.users, labelKey: "nav_team" },
    { href: "/competition.html", icon: ICONS.award, labelKey: "nav_competition" },
    { href: "/referral.html", icon: ICONS.users, labelKey: "nav_referral" },
    { href: "/premium.html", icon: ICONS.star, labelKey: "nav_premium", hideForRoles: ["premium", "coach"] },
    { href: "/history.html", icon: ICONS.calendar, labelKey: "nav_history" },
    { href: "/exercises.html", icon: ICONS.activity, labelKey: "nav_exercises" },
    { href: "/settings.html", icon: ICONS.settings, labelKey: "nav_settings" },
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

    // La route repond differemment pour un admin ({ certified: [...] }, la
    // liste globale) que pour un utilisateur normal ({ certified: bool }) :
    // on ignore le cas liste ici, seul le badge personnel nous interesse.
    let certified = false;
    try {
      const c = await fetch("/api/badges/certified").then(r => r.ok ? r.json() : null);
      certified = typeof c?.certified === "boolean" && c.certified;
    } catch {}

    const items = NAV_ITEMS.filter(it => !(it.hideForRoles && it.hideForRoles.includes(role)));

    if (role === "coach" || role === "admin") {
      items.push({ sep: true });
      items.push({ href: "/coach-dashboard.html", icon: "🎛️", labelKey: "nav_coach_clients" });
    }
    if (role === "admin") {
      items.push({ href: "/admin.html", icon: "🔧", labelKey: "nav_admin" });
    }

    // Liens du drawer "Plus" (bottom nav mobile) : memes regles de role que la sidebar desktop.
    const moreItems = MORE_ITEMS.filter(it => !(it.hideForRoles && it.hideForRoles.includes(role)));
    if (role === "coach" || role === "admin") {
      moreItems.push({ href: "/coach-dashboard.html", icon: ICONS.users, labelKey: "nav_coach_clients" });
    }
    if (role === "admin") {
      moreItems.push({ href: "/admin.html", icon: ICONS.tool, labelKey: "nav_admin" });
    }
    moreItems.push({ action: "logout", icon: ICONS.logout, labelKey: "nav_logout", logout: true });

    const navHtml = items.map(it => {
      if (it.sep) return `<div class="sidebar-sep"></div>`;
      const active = path === it.href ? " active" : "";
      const ctaClass = it.cta ? " sidebar-cta" : "";
      const badgeHtml = it.badge && unread > 0
        ? `<span class="sidebar-msg-badge">${unread > 9 ? "9+" : unread}</span>` : "";
      return `<a href="${it.href}" class="sidebar-item${active}${ctaClass}" data-key="${it.labelKey}" title="${esc(t(it.labelKey))}">
        <span class="icon">${it.icon}</span><span class="lbl">${esc(t(it.labelKey))}</span>${badgeHtml}
      </a>`;
    }).join("");

    const roleBadge = role === "premium" ? `<span class="sidebar-badge badge-premium">Premium</span>`
      : role === "coach" ? `<span class="sidebar-badge badge-coach">Coach</span>`
      : role === "admin" ? `<span class="sidebar-badge badge-admin">Admin</span>`
      : `<span class="sidebar-badge badge-free">Gratuit</span>`;

    const avatarHtml = user.avatar_url
      ? `<img src="${esc(user.avatar_url)}" style="width:100%;height:100%;object-fit:cover"/>`
      : initials(user.name);

    const lang = window.i18n ? window.i18n.getLang() : "fr";
    const sidebarHtml = `
      <aside class="sidebar">
        <div class="sidebar-logo-row">
          <a class="sidebar-logo" href="/home.html">
            <img src="/logo.svg" alt="" width="22" height="22"/>
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
            <div style="font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(user.name)}${certified ? ` <span title="Athlète Certifié Gym AI Coach">🎓</span>` : ""}</div>
            ${roleBadge}
          </div>
          <a href="#" class="sidebar-logout" id="sidebar-logout" title="${esc(t("nav_logout"))}">⏻</a>
        </div>
      </aside>`;

    const moreActivePath = moreItems.some(it => it.href === path);
    const moreUnread = moreItems.some(it => it.badge) && unread > 0;

    const bottomNavHtml = `
      <nav class="bottom-nav">
        ${BOTTOM_NAV_ITEMS.map(it => `
          <a href="${it.href}" class="bottom-nav-item${path === it.href ? " active" : ""}" data-key="${it.labelKey}">
            <span class="icon">${it.icon}</span><span class="lbl">${esc(t(it.labelKey))}</span>
          </a>`).join("")}
        <button type="button" class="bottom-nav-item${moreActivePath ? " active" : ""}" id="bottom-nav-more" data-key="bottom_more">
          <span class="icon">${ICONS.more}</span><span class="lbl">${esc(t("bottom_more"))}</span>
          ${moreUnread ? `<span class="nav-dot" id="more-nav-dot"></span>` : ""}
        </button>
      </nav>
      <div class="mobile-more-backdrop" id="mobile-more-backdrop"></div>
      <div class="mobile-more-drawer" id="mobile-more-drawer">
        <div class="mobile-more-head">
          <span class="mobile-more-title" data-key="more_drawer_title">${esc(t("more_drawer_title"))}</span>
          <button type="button" class="mobile-more-close" id="mobile-more-close" aria-label="Fermer">${ICONS.close}</button>
        </div>
        <div class="mobile-more-grid">
          ${moreItems.map(it => {
            const badgeHtml = it.badge && unread > 0 ? `<span class="mobile-more-badge">${unread > 9 ? "9+" : unread}</span>` : "";
            const tag = it.logout ? "button" : "a";
            const attrs = it.logout ? `type="button" id="mobile-more-logout"` : `href="${it.href}"`;
            return `<${tag} class="mobile-more-item${it.logout ? " logout" : ""}" ${attrs} data-key="${it.labelKey}">
              <span class="mobile-more-icon">${it.icon}</span><span class="lbl">${esc(t(it.labelKey))}</span>${badgeHtml}
            </${tag}>`;
          }).join("")}
        </div>
      </div>`;

    document.body.insertAdjacentHTML("afterbegin", sidebarHtml);
    document.body.insertAdjacentHTML("beforeend", bottomNavHtml);

    const bannerContainer = document.createElement("div");
    bannerContainer.id = "top-message-banner-container";
    document.body.appendChild(bannerContainer);
    refreshMessageBanner(notifUnread);

    document.getElementById("sidebar-logout")?.addEventListener("click", async e => {
      e.preventDefault();
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    });

    const moreBtn = document.getElementById("bottom-nav-more");
    const moreBackdrop = document.getElementById("mobile-more-backdrop");
    const moreDrawer = document.getElementById("mobile-more-drawer");
    function openMoreDrawer() {
      moreBackdrop.classList.add("open");
      moreDrawer.classList.add("open");
    }
    function closeMoreDrawer() {
      moreBackdrop.classList.remove("open");
      moreDrawer.classList.remove("open");
    }
    moreBtn?.addEventListener("click", openMoreDrawer);
    moreBackdrop?.addEventListener("click", closeMoreDrawer);
    document.getElementById("mobile-more-close")?.addEventListener("click", closeMoreDrawer);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeMoreDrawer(); });
    document.getElementById("mobile-more-logout")?.addEventListener("click", async () => {
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
      document.getElementById("top-message-banner-container").innerHTML = "";
    });

    // Banniere persistante en haut de l'ecran pour les nouveaux messages
    // (type 'new_message' de la table notifications) — en plus du badge sur
    // l'icone Messages, tant qu'elle n'a pas ete lue (au clic, ou en ouvrant
    // la conversation depuis messages.html). Sert de repli fiable pendant
    // que les emails de notification sont desactives (domaine Resend non
    // verifie) — voir routes/messages.js.
    async function refreshMessageBanner(notifUnreadCount) {
      const container = document.getElementById("top-message-banner-container");
      if (!container) return;
      if (!notifUnreadCount) { container.innerHTML = ""; container.removeAttribute("data-notif-id"); return; }
      try {
        const r = await fetch("/api/notifications").then(r => r.json());
        const unreadMsgNotifs = (r.notifications || []).filter(x => x.type === "new_message" && !x.read_at);
        if (!unreadMsgNotifs.length) { container.innerHTML = ""; container.removeAttribute("data-notif-id"); return; }

        const latest = unreadMsgNotifs[0];
        if (container.dataset.notifId === String(latest.id)) return; // deja affichee, evite de repartir l'animation
        container.dataset.notifId = latest.id;
        container.innerHTML = `
          <a href="${esc(latest.link || "/messages.html")}" class="top-message-banner" id="top-message-banner">
            <span class="top-message-banner-text">${esc(latest.message)}</span>
            ${unreadMsgNotifs.length > 1 ? `<span class="top-message-banner-count">+${unreadMsgNotifs.length - 1}</span>` : ""}
          </a>`;
        document.getElementById("top-message-banner")?.addEventListener("click", () => {
          fetch(`/api/notifications/${latest.id}/read`, { method: "POST" }).catch(() => {});
        });
      } catch {}
    }

    document.querySelectorAll(".sidebar-lang-btn").forEach(btn => {
      btn.addEventListener("click", () => window.i18n?.setLang(btn.dataset.lang));
    });

    function relabelNav() {
      document.querySelectorAll(".sidebar-item[data-key], .bottom-nav-item[data-key], .mobile-more-item[data-key]").forEach(el => {
        const lbl = el.querySelector(".lbl");
        const label = t(el.getAttribute("data-key"));
        if (lbl) lbl.textContent = label;
        if (el.classList.contains("sidebar-item")) el.title = label;
      });
      const logout = document.getElementById("sidebar-logout");
      if (logout) logout.title = t("nav_logout");
      const drawerTitle = document.querySelector(".mobile-more-title[data-key]");
      if (drawerTitle) drawerTitle.textContent = t("more_drawer_title");
    }

    // Reagit a un changement de langue declenche depuis n'importe ou sur la page
    // (sidebar elle-meme, ou le selecteur de la page Parametres).
    document.addEventListener("langchange", e => {
      relabelNav();
      document.querySelectorAll(".sidebar-lang-btn").forEach(b => b.classList.toggle("active", b.dataset.lang === e.detail.lang));
    });

    async function refreshBadges() {
      try {
        const [u, n] = await Promise.all([
          fetch("/api/messages/unread/count").then(r => r.ok ? r.json() : null).catch(() => null),
          fetch("/api/notifications/unread/count").then(r => r.ok ? r.json() : null).catch(() => null),
        ]);

        const msgItem = document.querySelector('.sidebar-item[data-key="nav_messages"]');
        if (msgItem) {
          const count = u?.unread || 0;
          let badge = msgItem.querySelector(".sidebar-msg-badge");
          if (count > 0) {
            if (!badge) { badge = document.createElement("span"); badge.className = "sidebar-msg-badge"; msgItem.appendChild(badge); }
            badge.textContent = count > 9 ? "9+" : count;
          } else if (badge) badge.remove();
        }

        const notifCount = n?.unread || 0;
        let bellBadge = bellBtn?.querySelector(".sidebar-bell-badge");
        if (notifCount > 0) {
          if (!bellBadge && bellBtn) { bellBadge = document.createElement("span"); bellBadge.className = "sidebar-bell-badge"; bellBtn.appendChild(bellBadge); }
          if (bellBadge) bellBadge.textContent = notifCount > 9 ? "9+" : notifCount;
        } else if (bellBadge) bellBadge.remove();

        const msgCount = u?.unread || 0;
        const moreMsgItem = document.querySelector('.mobile-more-item[data-key="nav_messages"]');
        if (moreMsgItem) {
          let moreBadge = moreMsgItem.querySelector(".mobile-more-badge");
          if (msgCount > 0) {
            if (!moreBadge) { moreBadge = document.createElement("span"); moreBadge.className = "mobile-more-badge"; moreMsgItem.appendChild(moreBadge); }
            moreBadge.textContent = msgCount > 9 ? "9+" : msgCount;
          } else if (moreBadge) moreBadge.remove();
        }
        let navDot = moreBtn?.querySelector(".nav-dot");
        if (msgCount > 0) {
          if (!navDot && moreBtn) { navDot = document.createElement("span"); navDot.className = "nav-dot"; moreBtn.appendChild(navDot); }
        } else if (navDot) navDot.remove();

        await refreshMessageBanner(notifCount);
      } catch {}
    }

    setInterval(refreshBadges, 30000);
  }

  init();
})();
