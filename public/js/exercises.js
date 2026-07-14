let activeGroup = "Tous";
let activeLevel = "Tous";
let activeEquipment = "Tous";
let searchTerm = "";

function esc(s) { const d = document.createElement("div"); d.textContent = String(s || ""); return d.innerHTML; }

// Niveau et équipement ne sont pas stockés dans exercises-data.js : on les
// déduit du nom/muscle pour éviter d'avoir à enrichir manuellement 50+
// entrées à la main (heuristique simple, pas une vérité absolue).
const EQUIPMENT_KEYWORDS = [
  ["Barre", ["barre"]],
  ["Haltères", ["haltère", "haltères"]],
  ["Machine / Poulie", ["machine", "poulie", "câble", "presse", "pec deck", "butterfly"]],
  ["Kettlebell", ["kettlebell"]],
  ["Poids du corps", ["pompes", "tractions", "dips", "planche", "burpees", "gainage", "suspendu"]],
];

function guessEquipment(ex) {
  const n = ex.name.toLowerCase();
  for (const [label, keywords] of EQUIPMENT_KEYWORDS) {
    if (keywords.some(k => n.includes(k))) return label;
  }
  return "Autre";
}

const ADVANCED_KEYWORDS = ["soulevé de terre", "clean and press", "thruster", "développé militaire", "tractions", "roue abdominale", "fentes bulgares"];
const BEGINNER_KEYWORDS = ["pompes", "crunch", "planche", "élévations", "curl", "mollets", "extension"];

function guessLevel(ex) {
  const n = ex.name.toLowerCase();
  if (ADVANCED_KEYWORDS.some(k => n.includes(k))) return "Avancé";
  if (BEGINNER_KEYWORDS.some(k => n.includes(k))) return "Débutant";
  return "Intermédiaire";
}

function init() {
  EXERCISES.forEach(ex => {
    ex._equipment = guessEquipment(ex);
    ex._level = guessLevel(ex);
  });

  const groups = ["Tous", ...new Set(EXERCISES.map(e => e.muscle_group))];
  const filterBar = document.getElementById("filter-bar");
  filterBar.innerHTML = groups.map(g =>
    `<button type="button" class="exercise-filter-btn${g === activeGroup ? " active" : ""}" data-group="${esc(g)}">${esc(g)}</button>`
  ).join("");

  filterBar.querySelectorAll(".exercise-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeGroup = btn.dataset.group;
      filterBar.querySelectorAll(".exercise-filter-btn").forEach(b => b.classList.toggle("active", b === btn));
      render();
    });
  });

  const levels = [...new Set(EXERCISES.map(e => e._level))].sort();
  const levelSelect = document.getElementById("level-filter");
  levels.forEach(l => levelSelect.insertAdjacentHTML("beforeend", `<option value="${esc(l)}">${esc(l)}</option>`));
  levelSelect.addEventListener("change", () => { activeLevel = levelSelect.value; render(); });

  const equipments = [...new Set(EXERCISES.map(e => e._equipment))].sort();
  const equipSelect = document.getElementById("equipment-filter");
  equipments.forEach(e => equipSelect.insertAdjacentHTML("beforeend", `<option value="${esc(e)}">${esc(e)}</option>`));
  equipSelect.addEventListener("change", () => { activeEquipment = equipSelect.value; render(); });

  document.getElementById("exercise-search-list").innerHTML =
    EXERCISES.map(e => `<option value="${esc(e.name)}"></option>`).join("");
  const searchInput = document.getElementById("exercise-search");
  searchInput.addEventListener("input", () => { searchTerm = searchInput.value.trim().toLowerCase(); render(); });

  render();
}

function render() {
  const grid = document.getElementById("exercises-grid");
  const empty = document.getElementById("exercises-empty");

  const list = EXERCISES.filter(e =>
    (activeGroup === "Tous" || e.muscle_group === activeGroup) &&
    (activeLevel === "Tous" || e._level === activeLevel) &&
    (activeEquipment === "Tous" || e._equipment === activeEquipment) &&
    (!searchTerm || e.name.toLowerCase().includes(searchTerm))
  );

  if (!list.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  grid.innerHTML = list.map(ex => `
    <div class="card exercise-card" data-ex-name="${esc(ex.name)}" data-muscle-group="${esc(ex.muscle_group)}">
      <div class="exercise-card-head">
        <span class="ex-badge">${esc(ex.muscle_group)}</span>
        <span class="ex-badge ex-badge-secondary">${esc(ex._level)}</span>
      </div>
      <div class="exercise-card-title">${esc(ex.name)}</div>
      <p class="exercise-card-desc">${esc(ex.description)}</p>
      ${ex.secondary?.length ? `<div class="exercise-secondary">Muscles secondaires : ${ex.secondary.map(esc).join(", ")}</div>` : ""}
      <div class="exercise-tip">💡 ${esc(ex.tip)}</div>
    </div>
  `).join("");
}

init();
