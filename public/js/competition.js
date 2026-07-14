// Mode compétition (Fonctionnalité 8) : classement top 10 volume de la
// semaine. Les gratuits consultent seulement (routes/competition.js ne
// classe que premium/coach/admin) ; le CTA les invite à passer Premium.
function esc(s) { const d = document.createElement("div"); d.textContent = String(s || ""); return d.innerHTML; }

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

async function init() {
  try {
    const data = await fetch("/api/competition/leaderboard").then(r => r.json());
    renderLeaderboard(data);
    startCountdown(data.resetAt);
  } catch {
    document.getElementById("comp-leaderboard").innerHTML = `<p class="muted">Impossible de charger le classement.</p>`;
  }
}

function renderLeaderboard(data) {
  const { top10, yourRank, yourVolume, isPremium, totalParticipants } = data;

  if (!isPremium) {
    const gate = document.getElementById("comp-gate");
    gate.classList.remove("hidden");
    lockSection(gate, {
      title: "Participe au classement — Premium",
      desc: "Les comptes gratuits peuvent consulter le classement, mais seuls les membres Premium y apparaissent et cumulent du volume classé.",
    });
  } else {
    const rankCard = document.getElementById("comp-your-rank");
    rankCard.classList.remove("hidden");
    rankCard.innerHTML = yourRank
      ? `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div><div class="card-title" style="margin-bottom:4px">Ta position</div>
          <div class="muted" style="font-size:.85rem">${Math.round(yourVolume)} kg soulevés cette semaine</div></div>
          <div style="font-family:var(--font-mono);font-size:1.8rem;color:var(--gold)">#${yourRank}</div>
        </div>`
      : `<p class="muted" style="font-size:.88rem">Valide une séance cette semaine pour apparaître au classement.</p>`;
  }

  const box = document.getElementById("comp-leaderboard");
  if (!top10.length) {
    document.getElementById("comp-empty").classList.remove("hidden");
    box.innerHTML = "";
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];
  box.innerHTML = top10.map(entry => `
    <div class="comp-row${entry.rank <= 3 ? " top3" : ""}">
      <div class="comp-rank">${medals[entry.rank - 1] || `#${entry.rank}`}</div>
      <div class="comp-avatar">${entry.avatar_url ? `<img src="${esc(entry.avatar_url)}" alt="" loading="lazy"/>` : initials(entry.name)}</div>
      <div class="comp-info">
        <div class="comp-name">${esc(entry.name)}</div>
        <div class="comp-meta muted">${entry.sessions} séance${entry.sessions > 1 ? "s" : ""}</div>
      </div>
      <div class="comp-volume">${Math.round(entry.volume)} <span>kg</span></div>
    </div>`).join("");

  if (totalParticipants) {
    box.insertAdjacentHTML("beforeend", `<p class="muted" style="font-size:.78rem;text-align:center;margin-top:14px">${totalParticipants} participant${totalParticipants > 1 ? "s" : ""} cette semaine</p>`);
  }
}

function startCountdown(resetAtIso) {
  const el = document.getElementById("comp-reset-countdown");
  if (!el || !resetAtIso) return;
  const resetAt = new Date(resetAtIso).getTime();

  function tick() {
    const diff = resetAt - Date.now();
    if (diff <= 0) { el.textContent = "00:00:00"; return; }
    const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    const days = Math.floor(diff / 86400000);
    el.textContent = days > 0 ? `${days}j ${h}:${m}:${s}` : `${h}:${m}:${s}`;
  }
  tick();
  setInterval(tick, 1000);
}

init();
