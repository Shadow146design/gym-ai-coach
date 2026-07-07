// Systeme de parrainage (fonctionnalite 5) : affiche le lien unique et les
// statistiques, tente une reclamation (filet de securite) au chargement.
async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");

  try { await fetch("/api/referral/claim", { method: "POST" }); } catch {}

  try {
    const data = await fetch("/api/referral/stats").then(r => r.json());
    document.getElementById("referral-link-input").value = data.referralLink;
    document.getElementById("ref-total").textContent = data.totalReferred;
    document.getElementById("ref-rewarded").textContent = data.totalRewarded;

    if (data.premiumUntil) {
      document.getElementById("ref-until-row").classList.remove("hidden");
      document.getElementById("ref-until").textContent = new Date(data.premiumUntil).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    }
  } catch {
    document.getElementById("copy-status").textContent = "Impossible de charger tes statistiques.";
  }
}

document.getElementById("copy-link-btn").addEventListener("click", async () => {
  const input = document.getElementById("referral-link-input");
  input.select();
  const status = document.getElementById("copy-status");
  try {
    await navigator.clipboard.writeText(input.value);
    status.textContent = "✓ Lien copié !";
  } catch {
    document.execCommand("copy");
    status.textContent = "✓ Lien copié !";
  }
  setTimeout(() => { status.textContent = ""; }, 2500);
});

init();
