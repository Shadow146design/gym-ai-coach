(async function () {
  const container = document.getElementById("nav-role-link");
  if (!container) return;

  const me = await fetch("/api/auth/me").then(r => r.ok ? r.json() : null).catch(() => null);
  const role = me?.user?.role;

  if (role === "admin") {
    container.innerHTML = `<a href="/admin.html">⚙️ Admin</a>`;
  } else if (role === "coach") {
    container.innerHTML = `<a href="/coach-dashboard.html">🎛️ Clients</a>`;
  }
})();
