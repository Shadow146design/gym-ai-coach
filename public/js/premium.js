let currentRole = "user";

async function init() {
  const me = await fetch("/api/auth/me").then(r => r.ok ? r.json() : null).catch(() => null);
  currentRole = me?.user?.role || "user";
  updateButtons();

  const params = new URLSearchParams(location.search);
  if (params.get("canceled")) showBanner("error", "Paiement annulé.");
}

function updateButtons() {
  document.querySelectorAll('[data-plan="premium"]').forEach(btn => {
    if (btn.dataset.plan === currentRole) {
      btn.textContent = "Formule actuelle";
      btn.disabled = true;
    }
  });

  const cancelZone = document.getElementById("cancel-zone");
  cancelZone.classList.toggle("hidden", currentRole !== "premium");

  document.getElementById("premium-sticky-cta")?.classList.toggle("visible", currentRole === "user");
}

async function subscribe(plan) {
  const r = await fetch("/api/stripe/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  }).then(r => r.json());
  if (r.error) return alert(r.error);
  window.location.href = r.url;
}

async function cancelSubscription() {
  if (!confirm("Annuler ton abonnement ? Tu repasseras en formule gratuite.")) return;
  const r = await fetch("/api/stripe/cancel-subscription", { method: "POST" }).then(r => r.json());
  if (!r.ok) return alert(r.error);
  alert("Abonnement annulé.");
  location.reload();
}

function showBanner(type, msg) {
  document.getElementById("banner").innerHTML =
    `<div class="${type === "success" ? "success-msg" : "error-msg"}">${msg}</div>`;
}

// Cards Gratuit/Premium en scroll horizontal sur mobile (fix accessibilité) :
// synchronise les points de pagination avec la card actuellement visible.
function initPricingScrollSync() {
  const grid = document.getElementById("pricing-grid");
  const dots = document.querySelectorAll("#pricing-dots .pricing-dot");
  if (!grid || !dots.length) return;

  const cards = Array.from(grid.querySelectorAll(".pricing-card"));

  const setActive = index => {
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
  };

  let ticking = false;
  grid.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const gridCenter = grid.scrollLeft + grid.clientWidth / 2;
      let closest = 0, closestDist = Infinity;
      cards.forEach((card, i) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(cardCenter - gridCenter);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      });
      setActive(closest);
      ticking = false;
    });
  }, { passive: true });

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      cards[i]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    });
  });
}
initPricingScrollSync();

init();
