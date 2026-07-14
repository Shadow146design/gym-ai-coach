// Pictogrammes animés façon "machine de salle de sport" (Basic Fit) : un
// bonhomme filiforme (stick figure) mime en boucle CSS le mouvement exact
// de l'exercice. Remplace complètement les images Wger/YouTube — aucune
// dépendance externe, aucun appel réseau, fonctionne hors-ligne.
//
// Chaque entrée de EXERCISE_ANIMATIONS est un SVG autonome (style CSS +
// keyframes inclus) : le corps statique est en var(--chalk), le ou les
// segments qui bougent sont en var(--rust) via la classe .move.

const STICK_STYLE = `
  .stick { stroke: var(--chalk, #f2f1ee); fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
  .joint { fill: var(--chalk, #f2f1ee); }
  .move { stroke: var(--rust, #c94d28); }
  .equip { stroke: var(--chalk-dim, #8f8d89); stroke-width: 3; fill: none; stroke-linecap: round; }
  .bench { fill: var(--bg-hover, rgba(255,255,255,.06)); stroke: var(--chalk-dim, #8f8d89); stroke-width: 2; }
  .ground { stroke: var(--chalk-dim, #8f8d89); stroke-width: 3; stroke-linecap: round; }
`;

const EXERCISE_ANIMATIONS = {

  "développé couché": `
    <svg viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .dc-arms { animation: dc-press 2.2s ease-in-out infinite; }
        @keyframes dc-press { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-32px); } }
      </style>
      <circle class="joint" cx="188" cy="42" r="11"/>
      <line class="stick" x1="176" y1="45" x2="70" y2="48"/>
      <rect class="bench" x="40" y="60" width="150" height="9" rx="4"/>
      <polyline class="stick" points="95,47 78,75 85,105"/>
      <polyline class="stick" points="75,48 60,75 68,105"/>
      <g class="dc-arms">
        <line class="stick move" x1="150" y1="46" x2="150" y2="14"/>
        <line class="stick move" x1="128" y1="47" x2="128" y2="14"/>
        <line class="equip" x1="112" y1="14" x2="168" y2="14" stroke-width="6"/>
      </g>
    </svg>`,

  "squat": `
    <svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .sq-up { animation: sq-fade-up 2.4s ease-in-out infinite; }
        .sq-down { animation: sq-fade-down 2.4s ease-in-out infinite; }
        @keyframes sq-fade-up { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes sq-fade-down { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <line class="ground" x1="35" y1="208" x2="125" y2="208"/>
      <g class="sq-up">
        <circle class="joint" cx="80" cy="25" r="11"/>
        <line class="stick" x1="80" y1="36" x2="80" y2="95"/>
        <line class="stick" x1="80" y1="55" x2="60" y2="75"/>
        <line class="stick" x1="80" y1="55" x2="100" y2="75"/>
        <polyline class="stick move" points="80,95 65,150 62,205"/>
        <polyline class="stick move" points="80,95 95,150 98,205"/>
      </g>
      <g class="sq-down">
        <circle class="joint" cx="80" cy="70" r="11"/>
        <line class="stick" x1="80" y1="81" x2="80" y2="120"/>
        <line class="stick" x1="80" y1="95" x2="60" y2="105"/>
        <line class="stick" x1="80" y1="95" x2="100" y2="105"/>
        <polyline class="stick move" points="80,120 50,140 60,205"/>
        <polyline class="stick move" points="80,120 110,140 100,205"/>
      </g>
    </svg>`,

  "rowing barre": `
    <svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .row-arm { animation: row-pull 2s ease-in-out infinite; transform-origin: 155px 70px; }
        @keyframes row-pull { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-38deg); } }
      </style>
      <circle class="joint" cx="163" cy="58" r="10"/>
      <line class="stick" x1="110" y1="115" x2="155" y2="70"/>
      <polyline class="stick" points="110,115 105,140 108,160"/>
      <polyline class="stick" points="95,113 90,140 93,160"/>
      <g class="row-arm">
        <line class="stick move" x1="155" y1="70" x2="140" y2="112"/>
        <line class="equip" x1="128" y1="112" x2="152" y2="112"/>
      </g>
    </svg>`,

  "tractions": `
    <svg viewBox="0 0 140 200" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .tr-down { animation: tr-fade-down 2.2s ease-in-out infinite; }
        .tr-up { animation: tr-fade-up 2.2s ease-in-out infinite; }
        @keyframes tr-fade-down { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes tr-fade-up { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <line class="equip" x1="25" y1="20" x2="115" y2="20" stroke-width="5"/>
      <g class="tr-down">
        <line class="stick move" x1="50" y1="20" x2="58" y2="65"/>
        <line class="stick move" x1="90" y1="20" x2="82" y2="65"/>
        <circle class="joint" cx="70" cy="76" r="11"/>
        <line class="stick" x1="70" y1="87" x2="70" y2="140"/>
        <polyline class="stick" points="70,140 65,170 68,195"/>
      </g>
      <g class="tr-up">
        <line class="stick move" x1="50" y1="20" x2="55" y2="35"/>
        <line class="stick move" x1="90" y1="20" x2="85" y2="35"/>
        <circle class="joint" cx="70" cy="45" r="11"/>
        <line class="stick" x1="70" y1="56" x2="70" y2="110"/>
        <polyline class="stick" points="70,110 65,145 68,175"/>
      </g>
    </svg>`,

  "développé militaire": `
    <svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .mp-arms { animation: mp-press 2.2s ease-in-out infinite; }
        @keyframes mp-press { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-55px); } }
      </style>
      <line class="ground" x1="40" y1="208" x2="120" y2="208"/>
      <circle class="joint" cx="80" cy="30" r="11"/>
      <line class="stick" x1="80" y1="41" x2="80" y2="110"/>
      <polyline class="stick" points="80,110 72,160 75,205"/>
      <polyline class="stick" points="80,110 88,160 85,205"/>
      <g class="mp-arms">
        <line class="stick move" x1="65" y1="95" x2="65" y2="70"/>
        <line class="stick move" x1="95" y1="95" x2="95" y2="70"/>
        <line class="equip" x1="55" y1="70" x2="105" y2="70" stroke-width="5"/>
      </g>
    </svg>`,

  "curl barre": `
    <svg viewBox="0 0 140 220" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .curl-arms { animation: curl-flex 1.8s ease-in-out infinite; transform-origin: 70px 90px; }
        @keyframes curl-flex { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-120deg); } }
      </style>
      <line class="ground" x1="45" y1="208" x2="95" y2="208"/>
      <circle class="joint" cx="70" cy="28" r="10"/>
      <line class="stick" x1="70" y1="39" x2="70" y2="105"/>
      <polyline class="stick" points="70,105 62,155 65,205"/>
      <polyline class="stick" points="70,105 78,155 75,205"/>
      <line class="stick" x1="70" y1="55" x2="60" y2="90"/>
      <line class="stick" x1="70" y1="55" x2="80" y2="90"/>
      <g class="curl-arms">
        <line class="stick move" x1="60" y1="90" x2="55" y2="128"/>
        <line class="stick move" x1="80" y1="90" x2="85" y2="128"/>
        <line class="equip" x1="52" y1="128" x2="88" y2="128" stroke-width="5"/>
      </g>
    </svg>`,

  "extension triceps": `
    <svg viewBox="0 0 140 220" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .tri-arm { animation: tri-extend 2s ease-in-out infinite; transform-origin: 70px 25px; }
        @keyframes tri-extend { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(180deg); } }
      </style>
      <line class="ground" x1="45" y1="208" x2="95" y2="208"/>
      <circle class="joint" cx="70" cy="10" r="10"/>
      <line class="stick" x1="70" y1="21" x2="70" y2="105"/>
      <polyline class="stick" points="70,105 62,155 65,205"/>
      <polyline class="stick" points="70,105 78,155 75,205"/>
      <line class="stick" x1="70" y1="55" x2="70" y2="25"/>
      <g class="tri-arm">
        <line class="stick move" x1="70" y1="25" x2="70" y2="55"/>
        <line class="equip" x1="60" y1="55" x2="80" y2="55" stroke-width="5"/>
      </g>
    </svg>`,

  "leg press": `
    <svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .lp-bent { animation: lp-fade-bent 2.2s ease-in-out infinite; }
        .lp-ext { animation: lp-fade-ext 2.2s ease-in-out infinite; }
        @keyframes lp-fade-bent { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes lp-fade-ext { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <circle class="joint" cx="25" cy="32" r="10"/>
      <line class="stick" x1="25" y1="42" x2="65" y2="95"/>
      <rect class="bench" x="10" y="95" width="35" height="8" rx="3"/>
      <g class="lp-bent">
        <polyline class="stick move" points="65,95 100,80 128,60"/>
        <line class="equip" x1="128" y1="30" x2="128" y2="80" stroke-width="4"/>
      </g>
      <g class="lp-ext">
        <polyline class="stick move" points="65,95 140,88 185,75"/>
        <line class="equip" x1="185" y1="40" x2="185" y2="100" stroke-width="4"/>
      </g>
    </svg>`,

  "leg extension": `
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .le-shin { animation: le-extend 2s ease-in-out infinite; transform-origin: 90px 90px; }
        @keyframes le-extend { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-100deg); } }
      </style>
      <circle class="joint" cx="30" cy="18" r="10"/>
      <line class="stick" x1="30" y1="28" x2="30" y2="90"/>
      <rect class="bench" x="15" y="90" width="60" height="10" rx="4"/>
      <line class="stick" x1="30" y1="90" x2="90" y2="90"/>
      <g class="le-shin">
        <line class="stick move" x1="90" y1="90" x2="85" y2="140"/>
        <circle class="joint" cx="85" cy="140" r="5"/>
      </g>
    </svg>`,

  "leg curl": `
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .lc-shin { animation: lc-curl 2s ease-in-out infinite; transform-origin: 150px 40px; }
        @keyframes lc-curl { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-110deg); } }
      </style>
      <circle class="joint" cx="25" cy="25" r="10"/>
      <line class="stick" x1="35" y1="28" x2="110" y2="35"/>
      <rect class="bench" x="20" y="45" width="120" height="8" rx="3"/>
      <line class="stick" x1="110" y1="35" x2="150" y2="40"/>
      <g class="lc-shin">
        <line class="stick move" x1="150" y1="40" x2="185" y2="42"/>
        <circle class="joint" cx="185" cy="42" r="5"/>
      </g>
    </svg>`,

  "élévations latérales": `
    <svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .lat-l { animation: lat-raise-l 2s ease-in-out infinite; transform-origin: 65px 48px; }
        .lat-r { animation: lat-raise-r 2s ease-in-out infinite; transform-origin: 95px 48px; }
        @keyframes lat-raise-l { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-95deg); } }
        @keyframes lat-raise-r { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(95deg); } }
      </style>
      <line class="ground" x1="45" y1="208" x2="115" y2="208"/>
      <circle class="joint" cx="80" cy="28" r="10"/>
      <line class="stick" x1="80" y1="39" x2="80" y2="110"/>
      <line class="stick" x1="65" y1="110" x2="65" y2="205"/>
      <line class="stick" x1="95" y1="110" x2="95" y2="205"/>
      <g class="lat-l"><line class="stick move" x1="65" y1="48" x2="60" y2="90"/></g>
      <g class="lat-r"><line class="stick move" x1="95" y1="48" x2="100" y2="90"/></g>
    </svg>`,

  "tirage vertical": `
    <svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .tv-bar { animation: tv-pull 2.2s ease-in-out infinite; }
        @keyframes tv-pull { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(55px); } }
      </style>
      <circle class="joint" cx="90" cy="30" r="10"/>
      <line class="stick" x1="90" y1="41" x2="90" y2="140"/>
      <polyline class="stick" points="90,140 70,150 70,170"/>
      <polyline class="stick" points="90,140 110,150 110,170"/>
      <rect class="bench" x="60" y="140" width="50" height="10" rx="4"/>
      <g class="tv-bar">
        <line class="stick move" x1="70" y1="55" x2="55" y2="20"/>
        <line class="stick move" x1="110" y1="55" x2="125" y2="20"/>
        <line class="equip" x1="45" y1="20" x2="135" y2="20" stroke-width="5"/>
        <line class="equip" x1="90" y1="0" x2="90" y2="20"/>
      </g>
    </svg>`,

  "hip thrust": `
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .ht-down { animation: ht-fade-down 2.2s ease-in-out infinite; }
        .ht-up { animation: ht-fade-up 2.2s ease-in-out infinite; }
        @keyframes ht-fade-down { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes ht-fade-up { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <circle class="joint" cx="22" cy="25" r="10"/>
      <rect class="bench" x="8" y="40" width="40" height="8" rx="3"/>
      <g class="ht-down">
        <line class="stick move" x1="30" y1="44" x2="90" y2="78"/>
        <polyline class="stick" points="90,78 128,62 128,98"/>
      </g>
      <g class="ht-up">
        <line class="stick move" x1="30" y1="44" x2="102" y2="52"/>
        <polyline class="stick" points="102,52 132,55 128,98"/>
      </g>
    </svg>`,

  "dips": `
    <svg viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .dip-high { animation: dip-fade-high 2s ease-in-out infinite; }
        .dip-low { animation: dip-fade-low 2s ease-in-out infinite; }
        @keyframes dip-fade-high { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes dip-fade-low { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <line class="equip" x1="30" y1="40" x2="30" y2="70" stroke-width="4"/>
      <line class="equip" x1="110" y1="40" x2="110" y2="70" stroke-width="4"/>
      <g class="dip-high">
        <line class="stick move" x1="45" y1="40" x2="45" y2="55"/>
        <line class="stick move" x1="95" y1="40" x2="95" y2="55"/>
        <circle class="joint" cx="70" cy="40" r="10"/>
        <line class="stick" x1="70" y1="51" x2="70" y2="100"/>
        <polyline class="stick" points="70,100 75,140 70,170"/>
      </g>
      <g class="dip-low">
        <line class="stick move" x1="45" y1="40" x2="45" y2="90"/>
        <line class="stick move" x1="95" y1="40" x2="95" y2="90"/>
        <circle class="joint" cx="70" cy="75" r="10"/>
        <line class="stick" x1="70" y1="86" x2="70" y2="130"/>
        <polyline class="stick" points="70,130 75,165 70,190"/>
      </g>
    </svg>`,

  "fentes": `
    <svg viewBox="0 0 180 220" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .lu-up { animation: lu-fade-up 2.4s ease-in-out infinite; }
        .lu-down { animation: lu-fade-down 2.4s ease-in-out infinite; }
        @keyframes lu-fade-up { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes lu-fade-down { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <line class="ground" x1="35" y1="208" x2="140" y2="208"/>
      <g class="lu-up">
        <circle class="joint" cx="80" cy="25" r="10"/>
        <line class="stick" x1="80" y1="36" x2="80" y2="110"/>
        <polyline class="stick move" points="80,110 75,160 78,205"/>
        <polyline class="stick move" points="80,110 85,160 82,205"/>
      </g>
      <g class="lu-down">
        <circle class="joint" cx="80" cy="42" r="10"/>
        <line class="stick" x1="80" y1="53" x2="80" y2="120"/>
        <polyline class="stick move" points="80,120 115,140 115,205"/>
        <polyline class="stick move" points="80,120 55,160 50,200"/>
      </g>
    </svg>`,
};

// Retire les diacritiques (meme logique que exercise-modal.js, dupliquee ici
// pour que ce fichier reste chargeable independamment).
function stripAccentsForAnim(s) {
  return Array.from(String(s || "").normalize("NFD"))
    .filter(ch => { const c = ch.codePointAt(0); return c < 0x0300 || c > 0x036f; })
    .join("");
}

// Regles de correspondance nom d'exercice -> cle d'animation, evaluees dans
// l'ordre (premiere regle qui matche gagne).
const ANIMATION_MATCH_RULES = [
  { key: "développé couché", test: n => n.includes("developpe couche") },
  { key: "squat", test: n => n.includes("squat") },
  { key: "rowing barre", test: n => n.includes("rowing") },
  { key: "tractions", test: n => n.includes("traction") },
  { key: "développé militaire", test: n => n.includes("developpe militaire") },
  { key: "curl barre", test: n => n.includes("curl") && (n.includes("barre") || n.includes("ez")) },
  { key: "extension triceps", test: n => (n.includes("extension") && n.includes("triceps")) || n.includes("pushdown") },
  { key: "leg press", test: n => n.includes("presse") || n.includes("leg press") },
  { key: "leg extension", test: n => n.includes("leg extension") },
  { key: "leg curl", test: n => n.includes("leg curl") },
  { key: "élévations latérales", test: n => n.includes("elevations laterales") || n.includes("elevation laterale") },
  { key: "tirage vertical", test: n => n.includes("tirage vertical") },
  { key: "hip thrust", test: n => n.includes("hip thrust") },
  { key: "dips", test: n => n.includes("dips") || n.includes("dip") },
  { key: "fentes", test: n => n.includes("fente") },
];

// Retourne le SVG animé (chaîne HTML) correspondant au nom d'exercice, ou
// null si aucune animation n'est disponible (repli sur la silhouette
// générique côté exercise-modal.js).
function matchExerciseAnimation(name) {
  const n = stripAccentsForAnim(String(name || "").toLowerCase().trim());
  for (const rule of ANIMATION_MATCH_RULES) {
    if (rule.test(n)) return EXERCISE_ANIMATIONS[rule.key] || null;
  }
  return null;
}

window.matchExerciseAnimation = matchExerciseAnimation;
