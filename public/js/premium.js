let currentRole = "user";

async function init() {
  const me = await fetch("/api/auth/me").then(r => r.ok ? r.json() : null).catch(() => null);
  currentRole = me?.user?.role || "user";
  updateButtons();

  const params = new URLSearchParams(location.search);
  if (params.get("success")) showBanner("success", "Paiement réussi ! Ton compte a été mis à jour.");
  if (params.get("canceled")) showBanner("error", "Paiement annulé.");
}

function updateButtons() {
  document.querySelectorAll('[data-plan="premium"], [data-plan="coach"]').forEach(btn => {
    if (btn.dataset.plan === currentRole) {
      btn.textContent = "Formule actuelle";
      btn.disabled = true;
    }
  });

  const cancelZone = document.getElementById("cancel-zone");
  cancelZone.classList.toggle("hidden", currentRole !== "premium" && currentRole !== "coach");
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

document.getElementById("logout-link")?.addEventListener("click", async e => {
  e.preventDefault();
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
});

init();
