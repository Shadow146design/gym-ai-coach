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

// Retire les diacritiques (accents) d'une chaine : decompose en NFD (une
// lettre de base + marques combinantes separees), puis filtre les marques
// combinantes par point de code plutot que via une plage regex Unicode
// (plus fiable a travers les outils/editeurs que d'ecrire la plage litteralement).
function stripAccents(s) {
  return Array.from(String(s || "").normalize("NFD"))
    .filter(ch => { const c = ch.codePointAt(0); return c < 0x0300 || c > 0x036f; })
    .join("");
}

const EXERCISE_MATCH_STOPWORDS = new Set([
  "de", "du", "des", "la", "le", "les", "et", "a", "au", "aux", "un", "une", "sur", "avec", "pour", "en",
]);

function tokenizeExerciseName(name) {
  return stripAccents(String(name || "").toLowerCase())
    .replace(/[()]/g, " ")
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 1 && !EXERCISE_MATCH_STOPWORDS.has(w));
}

// Les noms d'exercices generes par l'IA ("Développé couché haltères plat")
// ne correspondent que rarement mot pour mot aux entrees de la bibliotheque
// statique ("Développé couché barre") : on cherche donc l'entree dont les
// mots-cles (accents/casse ignores) recouvrent le mieux ceux du nom cible,
// plutot que d'exiger une egalite stricte.
function findExerciseData(name) {
  if (typeof EXERCISES === "undefined") return null;
  const normEq = s => stripAccents(String(s || "").toLowerCase().trim());
  const target = normEq(name);

  const exact = EXERCISES.find(e => normEq(e.name) === target);
  if (exact) return exact;

  const targetWords = new Set(tokenizeExerciseName(name));
  if (!targetWords.size) return null;

  let best = null, bestScore = 0;
  for (const ex of EXERCISES) {
    const exWords = tokenizeExerciseName(ex.name);
    if (!exWords.length) continue;
    const shared = exWords.filter(w => targetWords.has(w)).length;
    if (!shared) continue;
    // Normalise par le plus petit des deux ensembles de mots : un nom court
    // et generique (ex "Pompes") doit pouvoir matcher une variante plus
    // longue ("Pompes lestées") sans etre penalise par la difference de taille.
    const score = shared / Math.min(exWords.length, targetWords.size);
    if (score > bestScore) { bestScore = score; best = ex; }
  }
  // Au moins la moitie des mots-cles du plus petit nom doivent se retrouver
  // dans l'autre : evite les faux positifs sur un seul mot commun trop generique.
  return bestScore >= 0.5 ? best : null;
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

// Vidéo YouTube de démonstration (fonctionnalité 1, bibliothèque exercise_videos)
// — priorité sur l'image Wger, elle-même prioritaire sur la silhouette SVG.
async function fetchExerciseVideoId(name) {
  try {
    const res = await fetch(`/api/exercises/video/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const { video } = await res.json();
    return video?.youtube_id || null;
  } catch {
    return null;
  }
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
  // Le nom canonique (resolu par la recherche floue) donne de meilleures
  // chances de trouver une video/image que le nom brut, potentiellement une
  // variante generee par l'IA ("Développé couché haltères plat").
  const lookupName = data?.name || name;

  const svgCfg = MUSCLE_SVG_REGIONS[muscleGroup.toLowerCase().trim()] || { view: "front", regions: [] };
  const canAddToSession = typeof window.addExerciseToSession === "function";

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
        ${canAddToSession ? `<button class="btn btn-primary btn-sm" type="button" id="exercise-modal-add-btn" style="margin-top:14px;width:100%">Ajouter à ma séance</button>` : ""}
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById("exercise-modal-close").addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  document.getElementById("exercise-modal-add-btn")?.addEventListener("click", () => {
    window.addExerciseToSession(name, muscleGroup);
    close();
  });

  const mediaEl = document.getElementById("exercise-modal-media");

  const youtubeId = await fetchExerciseVideoId(lookupName);
  if (!document.body.contains(overlay)) return; // fermé entre-temps
  if (youtubeId) {
    mediaEl.innerHTML = `<iframe class="exercise-modal-video" src="https://www.youtube.com/embed/${escExMod(youtubeId)}"
      title="Démonstration ${escExMod(name)}" frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>`;
    return;
  }

  const gifUrl = await fetchWgerMedia(lookupName);
  if (!document.body.contains(overlay)) return;
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
