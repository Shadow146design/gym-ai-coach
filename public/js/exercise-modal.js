// Modal de démonstration visuelle d'un exercice (fonctionnalité 3).
// Déclenché sur tout clic d'un élément portant [data-ex-name] (session.html,
// dashboard.html, coach-client.html). Cherche l'exercice dans EXERCISES
// (exercises-data.js) pour la description/muscles secondaires, tente l'API
// Wger pour une image/gif de démo, et affiche sinon une silhouette SVG du
// groupe musculaire ciblé.

const MUSCLE_SVG_REGIONS = {
  "poitrine": { view: "front", regions: ["chest"] },
  "dos": { view: "back", regions: ["back"] },
  "épaules": { view: "front", regions: ["shoulders"] },
  "epaules": { view: "front", regions: ["shoulders"] },
  "biceps": { view: "front", regions: ["arms"] },
  "triceps": { view: "back", regions: ["arms"] },
  "avant-bras": { view: "front", regions: ["forearms"] },
  "jambes": { view: "front", regions: ["legs"] },
  "fessiers": { view: "back", regions: ["glutes"] },
  "abdos": { view: "front", regions: ["abs"] },
  "full body": { view: "front", regions: ["chest", "abs", "legs", "shoulders", "arms"] },
};

function findExerciseData(name) {
  if (typeof EXERCISES === "undefined") return null;
  const norm = s => (s || "").toLowerCase().trim();
  const target = norm(name);
  return EXERCISES.find(e => norm(e.name) === target)
    || EXERCISES.find(e => target.includes(norm(e.name)) || norm(e.name).includes(target))
    || null;
}

function bodySilhouetteSvg(view, activeRegions) {
  const active = r => activeRegions.includes(r);
  const fill = r => active(r) ? "#e06040" : "rgba(237,232,223,.12)";
  const stroke = "rgba(237,232,223,.28)";
  const parts = view === "front" ? [
    `<circle cx="80" cy="28" r="22" fill="rgba(237,232,223,.12)" stroke="${stroke}"/>`,
    `<rect x="45" y="52" width="70" height="18" rx="8" fill="${fill('shoulders')}" stroke="${stroke}"/>`,
    `<rect x="55" y="68" width="50" height="55" rx="10" fill="${fill('chest')}" stroke="${stroke}"/>`,
    `<rect x="58" y="123" width="44" height="45" rx="8" fill="${fill('abs')}" stroke="${stroke}"/>`,
    `<rect x="30" y="70" width="18" height="55" rx="8" fill="${fill('arms')}" stroke="${stroke}"/>`,
    `<rect x="112" y="70" width="18" height="55" rx="8" fill="${fill('arms')}" stroke="${stroke}"/>`,
    `<rect x="28" y="125" width="16" height="45" rx="7" fill="${fill('forearms')}" stroke="${stroke}"/>`,
    `<rect x="116" y="125" width="16" height="45" rx="7" fill="${fill('forearms')}" stroke="${stroke}"/>`,
    `<rect x="58" y="170" width="20" height="90" rx="9" fill="${fill('legs')}" stroke="${stroke}"/>`,
    `<rect x="82" y="170" width="20" height="90" rx="9" fill="${fill('legs')}" stroke="${stroke}"/>`,
  ] : [
    `<circle cx="80" cy="28" r="22" fill="rgba(237,232,223,.12)" stroke="${stroke}"/>`,
    `<rect x="45" y="52" width="70" height="18" rx="8" fill="${fill('shoulders')}" stroke="${stroke}"/>`,
    `<rect x="52" y="68" width="56" height="60" rx="10" fill="${fill('back')}" stroke="${stroke}"/>`,
    `<rect x="30" y="70" width="18" height="55" rx="8" fill="${fill('arms')}" stroke="${stroke}"/>`,
    `<rect x="112" y="70" width="18" height="55" rx="8" fill="${fill('arms')}" stroke="${stroke}"/>`,
    `<rect x="28" y="125" width="16" height="45" rx="7" fill="${fill('forearms')}" stroke="${stroke}"/>`,
    `<rect x="116" y="125" width="16" height="45" rx="7" fill="${fill('forearms')}" stroke="${stroke}"/>`,
    `<rect x="55" y="128" width="50" height="42" rx="8" fill="${fill('glutes')}" stroke="${stroke}"/>`,
    `<rect x="58" y="170" width="20" height="90" rx="9" fill="${fill('legs')}" stroke="${stroke}"/>`,
    `<rect x="82" y="170" width="20" height="90" rx="9" fill="${fill('legs')}" stroke="${stroke}"/>`,
  ];
  return `<svg viewBox="0 0 160 320" width="140" height="280" class="exercise-svg-${view}">${parts.join("")}</svg>`;
}

async function fetchWgerMedia(name) {
  try {
    const res = await fetch(`https://wger.de/api/v2/exercise/?format=json&language=2&name=${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const match = data.results?.[0];
    if (!match) return null;
    const imgRes = await fetch(`https://wger.de/api/v2/exerciseimage/?format=json&exercise=${match.id}`);
    if (!imgRes.ok) return null;
    const imgData = await imgRes.json();
    return imgData.results?.[0]?.image || null;
  } catch {
    return null;
  }
}

function escExMod(s) { const d = document.createElement("div"); d.textContent = String(s || ""); return d.innerHTML; }

async function openExerciseModal(name, muscleGroupHint, notesHint) {
  document.getElementById("exercise-modal-overlay")?.remove();

  const data = findExerciseData(name);
  const muscleGroup = data?.muscle_group || muscleGroupHint || "";
  const secondary = data?.secondary || [];
  const description = data?.description || "";
  const tip = notesHint || data?.tip || "";

  const svgCfg = MUSCLE_SVG_REGIONS[muscleGroup.toLowerCase().trim()] || { view: "front", regions: [] };

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "exercise-modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card exercise-modal-card">
      <button class="modal-close" type="button" id="exercise-modal-close">✕</button>
      <div class="exercise-modal-media" id="exercise-modal-media">${bodySilhouetteSvg(svgCfg.view, svgCfg.regions)}</div>
      <div class="exercise-modal-body">
        <h2>${escExMod(name)}</h2>
        ${muscleGroup ? `<span class="ex-badge">${escExMod(muscleGroup)}</span>` : ""}
        ${secondary.length ? `<div class="exercise-secondary">Muscles secondaires : ${secondary.map(escExMod).join(", ")}</div>` : ""}
        ${description ? `<p class="exercise-modal-desc">${escExMod(description)}</p>` : ""}
        ${tip ? `<div class="exercise-tip">💡 ${escExMod(tip)}</div>` : ""}
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById("exercise-modal-close").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });

  const mediaEl = document.getElementById("exercise-modal-media");
  const gifUrl = await fetchWgerMedia(name);
  if (!document.body.contains(overlay)) return; // fermé entre-temps
  if (gifUrl) {
    mediaEl.innerHTML = `<img src="${escExMod(gifUrl)}" alt="Démonstration ${escExMod(name)}" loading="lazy"/>`;
  }
}

document.addEventListener("click", e => {
  const el = e.target.closest("[data-ex-name]");
  if (!el) return;
  openExerciseModal(el.dataset.exName, el.dataset.muscleGroup || "", el.dataset.exNotes || "");
});

window.openExerciseModal = openExerciseModal;
