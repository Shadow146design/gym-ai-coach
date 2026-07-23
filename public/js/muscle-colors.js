// Mapping couleurs (refonte visuelle 2025) : rouge=Pecs, bleu=Dos, vert=Jambes,
// orange=Épaules, violet=Bras — le reste (fessiers/abdos/cardio) complète la palette.
const MUSCLE_STYLES = [
  { keys: ["poitrine", "pec", "chest"], color: "var(--red)", bg: "rgba(217,64,64,.12)", icon: "🎯" },
  { keys: ["dos", "dorsal", "back"], color: "var(--steel-soft)", bg: "rgba(79,122,138,.15)", icon: "🔙" },
  { keys: ["épaule", "epaule", "shoulder"], color: "var(--rust)", bg: "var(--rust-bg)", icon: "🏋️" },
  { keys: ["jambe", "quadriceps", "ischio", "leg"], color: "var(--green)", bg: "var(--green-bg)", icon: "🦵" },
  { keys: ["fessier", "glute"], color: "#c99020", bg: "rgba(201,144,32,.15)", icon: "🍑" },
  { keys: ["biceps", "triceps", "bras", "avant-bras", "arm"], color: "#9b6bc9", bg: "rgba(155,107,201,.12)", icon: "💪" },
  { keys: ["abdo", "core", "abs", "gainage"], color: "var(--steel)", bg: "rgba(79,122,138,.12)", icon: "🔥" },
  { keys: ["cardio", "full body", "full-body", "corps entier"], color: "var(--gold)", bg: "var(--gold-bg)", icon: "⚡" },
];

function getMuscleStyle(text) {
  const t = (text || "").toLowerCase();
  for (const m of MUSCLE_STYLES) if (m.keys.some(k => t.includes(k))) return m;
  return { color: "var(--chalk-dim)", bg: "var(--bg-hover)", icon: "🏋️" };
}

function muscleBadgeHtml(text) {
  if (!text) return "";
  const s = getMuscleStyle(text);
  const esc = String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  return `<span class="muscle-badge" style="--mg-color:${s.color};--mg-bg:${s.bg}">${s.icon} ${esc}</span>`;
}
