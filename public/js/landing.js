// CTA "Essayer gratuitement" + boutons de pricing : bascule sur l'onglet inscription
document.querySelectorAll('#hero-cta-register, .landing-plan-btn').forEach(btn => {
  btn.addEventListener("click", e => {
    e.preventDefault();
    document.querySelector('[data-tab="register"]')?.click();
    document.getElementById("auth")?.scrollIntoView({ behavior: "smooth" });
  });
});

document.getElementById("nav-login-btn")?.addEventListener("click", e => {
  e.preventDefault();
  document.querySelector('[data-tab="login"]')?.click();
  document.getElementById("auth")?.scrollIntoView({ behavior: "smooth" });
});

// Compteur d'utilisateurs en temps reel (masque si la route echoue, pour
// ne jamais afficher un "—" fige en cas de probleme reseau).
fetch("/api/stats/public")
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(data => {
    if (!data.totalUsers) return;
    document.getElementById("hero-stats-users").textContent = data.totalUsers;
    document.getElementById("hero-stats").hidden = false;
  })
  .catch(() => {});

// Animations subtiles au scroll (progressive enhancement : visible par defaut sans JS)
document.querySelectorAll(".reveal").forEach(el => el.classList.add("reveal-init"));
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach(el => el.classList.add("reveal-visible"));
}
