(async function () {
  const container = document.getElementById("nav-role-link");
  const nav = document.querySelector(".nav-links");

  const me = await fetch("/api/auth/me").then(r => r.ok ? r.json() : null).catch(() => null);
  const user = me?.user;
  if (!user) return;
  const role = user.role;

  if (container) {
    if (role === "admin") {
      container.innerHTML = `<a href="/admin.html">⚙️ Admin</a>`;
    } else if (role === "coach") {
      container.innerHTML = `<a href="/coach-dashboard.html">🎛️ Clients</a>`;
    }
  }

  if (nav && (role === "premium" || role === "coach")) {
    const badgeLabel = role === "coach" ? "COACH" : "PREMIUM";
    const badge = document.createElement("span");
    badge.className = "nav-user-badge";
    badge.innerHTML = `${user.name ? user.name + " " : ""}<span class="role-badge role-badge-${role}">${badgeLabel}</span>`;
    nav.insertBefore(badge, nav.firstChild);
  }
})();
