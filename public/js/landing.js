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
