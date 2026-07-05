let activeGroup = "Tous";

function esc(s) { const d = document.createElement("div"); d.textContent = String(s || ""); return d.innerHTML; }

function init() {
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

  render();
}

function render() {
  const grid = document.getElementById("exercises-grid");
  const list = activeGroup === "Tous" ? EXERCISES : EXERCISES.filter(e => e.muscle_group === activeGroup);

  grid.innerHTML = list.map(ex => `
    <div class="card exercise-card">
      <div class="exercise-card-head">
        <span class="ex-badge">${esc(ex.muscle_group)}</span>
      </div>
      <div class="exercise-card-title">${esc(ex.name)}</div>
      <p class="exercise-card-desc">${esc(ex.description)}</p>
      ${ex.secondary?.length ? `<div class="exercise-secondary">Muscles secondaires : ${ex.secondary.map(esc).join(", ")}</div>` : ""}
      <div class="exercise-tip">💡 ${esc(ex.tip)}</div>
    </div>
  `).join("");
}

init();
