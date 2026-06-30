async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");

  const res = await fetch("/api/profile");
  const { profile } = await res.json();
  if (profile) {
    const form = document.getElementById("profile-form");
    ["weight_kg", "height_cm", "age", "gender", "activity_level"].forEach(field => {
      if (profile[field] !== null && profile[field] !== undefined) {
        form.elements[field].value = profile[field];
      }
    });
  }
}

document.getElementById("profile-form").addEventListener("submit", async e => {
  e.preventDefault();
  const status = document.getElementById("save-status");
  const errorBox = document.getElementById("profile-error");
  errorBox.innerHTML = "";
  status.textContent = "Enregistrement…";

  const data = Object.fromEntries(new FormData(e.target).entries());

  try {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      errorBox.innerHTML = `<div class="error-msg">${json.error}</div>`;
      status.textContent = "";
      return;
    }
    status.textContent = "✓ Enregistré";
    setTimeout(() => { status.textContent = ""; }, 2500);
  } catch {
    errorBox.innerHTML = `<div class="error-msg">Impossible de joindre le serveur.</div>`;
    status.textContent = "";
  }
});

init();
