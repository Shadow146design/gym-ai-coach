// Pictogrammes animés façon "machine de salle de sport" (Basic Fit) : un
// bonhomme filiforme (stick figure) mime en boucle CSS le mouvement exact
// de l'exercice. Remplace complètement les images Wger/YouTube — aucune
// dépendance externe, aucun appel réseau, fonctionne hors-ligne.
//
// Chaque entrée de EXERCISE_ANIMATIONS est un SVG autonome (style CSS +
// keyframes inclus) : le corps statique est en var(--chalk), le ou les
// segments qui bougent sont en var(--rust) via la classe .move. Géométrie
// volontairement large et espacée (peu d'éléments qui se chevauchent) pour
// que le mouvement reste lisible à la taille d'un pictogramme.

const STICK_STYLE = `
  .stick { stroke: var(--chalk, #f2f1ee); fill: none; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
  .joint { fill: var(--chalk, #f2f1ee); }
  .move { stroke: var(--rust, #c94d28); }
  .equip { stroke: var(--chalk-dim, #8f8d89); stroke-width: 4; fill: none; stroke-linecap: round; }
  .bench { fill: var(--bg-hover, rgba(255,255,255,.06)); stroke: var(--chalk-dim, #8f8d89); stroke-width: 3; }
  .ground { stroke: var(--chalk-dim, #8f8d89); stroke-width: 4; stroke-linecap: round; }
`;

const EXERCISE_ANIMATIONS = {

  "développé couché": `
    <svg viewBox="0 0 260 160" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .dc-arms { animation: dc-press 2.2s ease-in-out infinite; }
        @keyframes dc-press { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-45px); } }
      </style>
      <circle class="joint" cx="222" cy="55" r="14"/>
      <line class="stick" x1="208" y1="58" x2="95" y2="60"/>
      <rect class="bench" x="55" y="78" width="175" height="11" rx="5"/>
      <polyline class="stick" points="105,60 90,95 100,120"/>
      <g class="dc-arms">
        <line class="stick move" x1="165" y1="58" x2="165" y2="15"/>
        <line class="stick move" x1="140" y1="60" x2="140" y2="15"/>
        <line class="equip" x1="122" y1="15" x2="183" y2="15" stroke-width="7"/>
      </g>
    </svg>`,

  "squat": `
    <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .sq-up { animation: sq-fade-up 2.4s ease-in-out infinite; }
        .sq-down { animation: sq-fade-down 2.4s ease-in-out infinite; }
        @keyframes sq-fade-up { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes sq-fade-down { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <line class="ground" x1="50" y1="258" x2="150" y2="258"/>
      <g class="sq-up">
        <circle class="joint" cx="100" cy="35" r="15"/>
        <line class="stick" x1="100" y1="54" x2="100" y2="155"/>
        <line class="stick" x1="100" y1="70" x2="75" y2="95"/>
        <line class="stick" x1="100" y1="70" x2="125" y2="95"/>
        <line class="stick move" x1="100" y1="155" x2="70" y2="255"/>
        <line class="stick move" x1="100" y1="155" x2="130" y2="255"/>
      </g>
      <g class="sq-down">
        <circle class="joint" cx="100" cy="95" r="15"/>
        <line class="stick" x1="100" y1="114" x2="100" y2="180"/>
        <line class="stick" x1="100" y1="125" x2="70" y2="145"/>
        <line class="stick" x1="100" y1="125" x2="130" y2="145"/>
        <polyline class="stick move" points="100,180 55,205 65,255"/>
        <polyline class="stick move" points="100,180 145,205 135,255"/>
      </g>
    </svg>`,

  "rowing barre": `
    <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .row-arm { animation: row-pull 2s ease-in-out infinite; transform-origin: 150px 110px; }
        @keyframes row-pull { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-55deg); } }
      </style>
      <circle class="joint" cx="160" cy="93" r="15"/>
      <line class="stick" x1="100" y1="190" x2="150" y2="110"/>
      <line class="stick" x1="100" y1="190" x2="85" y2="255"/>
      <line class="stick" x1="100" y1="190" x2="115" y2="255"/>
      <g class="row-arm">
        <line class="stick move" x1="150" y1="110" x2="125" y2="175"/>
        <line class="equip" x1="112" y1="175" x2="138" y2="175"/>
      </g>
    </svg>`,

  "tractions": `
    <svg viewBox="0 0 200 270" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .tr-low { animation: tr-fade-low 2.2s ease-in-out infinite; }
        .tr-high { animation: tr-fade-high 2.2s ease-in-out infinite; }
        @keyframes tr-fade-low { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes tr-fade-high { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <line class="equip" x1="35" y1="20" x2="165" y2="20" stroke-width="7"/>
      <g class="tr-low">
        <line class="stick move" x1="70" y1="20" x2="75" y2="70"/>
        <line class="stick move" x1="130" y1="20" x2="125" y2="70"/>
        <circle class="joint" cx="100" cy="90" r="15"/>
        <line class="stick" x1="100" y1="105" x2="100" y2="190"/>
        <line class="stick" x1="100" y1="190" x2="80" y2="250"/>
        <line class="stick" x1="100" y1="190" x2="120" y2="250"/>
      </g>
      <g class="tr-high">
        <line class="stick move" x1="70" y1="20" x2="78" y2="35"/>
        <line class="stick move" x1="130" y1="20" x2="122" y2="35"/>
        <circle class="joint" cx="100" cy="55" r="15"/>
        <line class="stick" x1="100" y1="70" x2="100" y2="155"/>
        <line class="stick" x1="100" y1="155" x2="80" y2="215"/>
        <line class="stick" x1="100" y1="155" x2="120" y2="215"/>
      </g>
    </svg>`,

  "développé militaire": `
    <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .mp-arms { animation: mp-press 2.2s ease-in-out infinite; }
        @keyframes mp-press { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-85px); } }
      </style>
      <line class="ground" x1="55" y1="258" x2="145" y2="258"/>
      <circle class="joint" cx="100" cy="35" r="15"/>
      <line class="stick" x1="100" y1="54" x2="100" y2="155"/>
      <line class="stick" x1="100" y1="155" x2="75" y2="255"/>
      <line class="stick" x1="100" y1="155" x2="125" y2="255"/>
      <g class="mp-arms">
        <line class="stick move" x1="78" y1="120" x2="78" y2="100"/>
        <line class="stick move" x1="122" y1="120" x2="122" y2="100"/>
        <line class="equip" x1="65" y1="100" x2="135" y2="100" stroke-width="7"/>
      </g>
    </svg>`,

  "curl barre": `
    <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .curl-arms { animation: curl-flex 1.8s ease-in-out infinite; transform-origin: 100px 122px; }
        @keyframes curl-flex { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-105deg); } }
      </style>
      <line class="ground" x1="55" y1="258" x2="145" y2="258"/>
      <circle class="joint" cx="100" cy="35" r="15"/>
      <line class="stick" x1="100" y1="54" x2="100" y2="155"/>
      <line class="stick" x1="100" y1="155" x2="75" y2="255"/>
      <line class="stick" x1="100" y1="155" x2="125" y2="255"/>
      <line class="stick" x1="85" y1="65" x2="75" y2="122"/>
      <line class="stick" x1="115" y1="65" x2="125" y2="122"/>
      <g class="curl-arms">
        <line class="stick move" x1="75" y1="122" x2="70" y2="180"/>
        <line class="stick move" x1="125" y1="122" x2="130" y2="180"/>
        <line class="equip" x1="62" y1="180" x2="138" y2="180" stroke-width="7"/>
      </g>
    </svg>`,

  "extension triceps": `
    <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .tri-arm { animation: tri-extend 2s ease-in-out infinite; transform-origin: 78px 45px; }
        @keyframes tri-extend { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(150deg); } }
      </style>
      <line class="ground" x1="55" y1="258" x2="145" y2="258"/>
      <circle class="joint" cx="105" cy="35" r="15"/>
      <line class="stick" x1="105" y1="54" x2="100" y2="155"/>
      <line class="stick" x1="100" y1="155" x2="75" y2="255"/>
      <line class="stick" x1="100" y1="155" x2="125" y2="255"/>
      <line class="stick" x1="105" y1="65" x2="78" y2="45"/>
      <g class="tri-arm">
        <line class="stick move" x1="78" y1="45" x2="95" y2="90"/>
        <line class="equip" x1="85" y1="90" x2="105" y2="90"/>
      </g>
    </svg>`,

  "leg press": `
    <svg viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .lp-bent { animation: lp-fade-bent 2.2s ease-in-out infinite; }
        .lp-ext { animation: lp-fade-ext 2.2s ease-in-out infinite; }
        @keyframes lp-fade-bent { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes lp-fade-ext { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <circle class="joint" cx="35" cy="40" r="14"/>
      <line class="stick" x1="35" y1="53" x2="80" y2="115"/>
      <rect class="bench" x="15" y="115" width="45" height="10" rx="4"/>
      <g class="lp-bent">
        <polyline class="stick move" points="80,115 120,98 150,72"/>
        <line class="equip" x1="150" y1="35" x2="150" y2="95" stroke-width="5"/>
      </g>
      <g class="lp-ext">
        <polyline class="stick move" points="80,115 165,105 220,90"/>
        <line class="equip" x1="220" y1="50" x2="220" y2="120" stroke-width="5"/>
      </g>
    </svg>`,

  "leg extension": `
    <svg viewBox="0 0 240 190" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .le-shin { animation: le-extend 2s ease-in-out infinite; transform-origin: 105px 105px; }
        @keyframes le-extend { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-95deg); } }
      </style>
      <circle class="joint" cx="35" cy="25" r="14"/>
      <line class="stick" x1="35" y1="38" x2="35" y2="105"/>
      <rect class="bench" x="18" y="105" width="70" height="12" rx="5"/>
      <line class="stick" x1="35" y1="105" x2="105" y2="105"/>
      <g class="le-shin">
        <line class="stick move" x1="105" y1="105" x2="100" y2="165"/>
        <circle class="joint" cx="100" cy="165" r="6"/>
      </g>
    </svg>`,

  "leg curl": `
    <svg viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .lc-shin { animation: lc-curl 2s ease-in-out infinite; transform-origin: 175px 45px; }
        @keyframes lc-curl { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-105deg); } }
      </style>
      <circle class="joint" cx="30" cy="28" r="14"/>
      <line class="stick" x1="42" y1="32" x2="130" y2="40"/>
      <rect class="bench" x="22" y="52" width="140" height="10" rx="4"/>
      <line class="stick" x1="130" y1="40" x2="175" y2="45"/>
      <g class="lc-shin">
        <line class="stick move" x1="175" y1="45" x2="215" y2="48"/>
        <circle class="joint" cx="215" cy="48" r="6"/>
      </g>
    </svg>`,

  "élévations latérales": `
    <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .lat-l { animation: lat-raise-l 2s ease-in-out infinite; transform-origin: 78px 65px; }
        .lat-r { animation: lat-raise-r 2s ease-in-out infinite; transform-origin: 122px 65px; }
        @keyframes lat-raise-l { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-100deg); } }
        @keyframes lat-raise-r { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(100deg); } }
      </style>
      <line class="ground" x1="55" y1="258" x2="145" y2="258"/>
      <circle class="joint" cx="100" cy="35" r="15"/>
      <line class="stick" x1="100" y1="54" x2="100" y2="155"/>
      <line class="stick" x1="100" y1="155" x2="75" y2="255"/>
      <line class="stick" x1="100" y1="155" x2="125" y2="255"/>
      <g class="lat-l"><line class="stick move" x1="78" y1="65" x2="70" y2="120"/></g>
      <g class="lat-r"><line class="stick move" x1="122" y1="65" x2="130" y2="120"/></g>
    </svg>`,

  "tirage vertical": `
    <svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .tv-bar { animation: tv-pull 2.2s ease-in-out infinite; }
        @keyframes tv-pull { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(70px); } }
      </style>
      <circle class="joint" cx="110" cy="35" r="15"/>
      <line class="stick" x1="110" y1="50" x2="110" y2="165"/>
      <line class="stick" x1="110" y1="165" x2="90" y2="205"/>
      <line class="stick" x1="110" y1="165" x2="130" y2="205"/>
      <rect class="bench" x="80" y="165" width="60" height="11" rx="5"/>
      <g class="tv-bar">
        <line class="stick move" x1="85" y1="70" x2="65" y2="20"/>
        <line class="stick move" x1="135" y1="70" x2="155" y2="20"/>
        <line class="equip" x1="50" y1="20" x2="170" y2="20" stroke-width="7"/>
        <line class="equip" x1="110" y1="0" x2="110" y2="20"/>
      </g>
    </svg>`,

  "hip thrust": `
    <svg viewBox="0 0 260 160" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .ht-down { animation: ht-fade-down 2.2s ease-in-out infinite; }
        .ht-up { animation: ht-fade-up 2.2s ease-in-out infinite; }
        @keyframes ht-fade-down { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes ht-fade-up { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <circle class="joint" cx="30" cy="35" r="14"/>
      <rect class="bench" x="12" y="55" width="45" height="10" rx="4"/>
      <g class="ht-down">
        <line class="stick move" x1="38" y1="58" x2="110" y2="100"/>
        <polyline class="stick" points="110,100 160,80 160,130"/>
      </g>
      <g class="ht-up">
        <line class="stick move" x1="38" y1="58" x2="130" y2="68"/>
        <polyline class="stick" points="130,68 170,72 160,130"/>
      </g>
    </svg>`,

  "dips": `
    <svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .dip-high { animation: dip-fade-high 2s ease-in-out infinite; }
        .dip-low { animation: dip-fade-low 2s ease-in-out infinite; }
        @keyframes dip-fade-high { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes dip-fade-low { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <line class="equip" x1="40" y1="50" x2="40" y2="95" stroke-width="6"/>
      <line class="equip" x1="140" y1="50" x2="140" y2="95" stroke-width="6"/>
      <g class="dip-high">
        <line class="stick move" x1="55" y1="50" x2="55" y2="70"/>
        <line class="stick move" x1="125" y1="50" x2="125" y2="70"/>
        <circle class="joint" cx="90" cy="50" r="15"/>
        <line class="stick" x1="90" y1="65" x2="90" y2="130"/>
        <line class="stick" x1="90" y1="130" x2="95" y2="185"/>
      </g>
      <g class="dip-low">
        <line class="stick move" x1="55" y1="50" x2="55" y2="110"/>
        <line class="stick move" x1="125" y1="50" x2="125" y2="110"/>
        <circle class="joint" cx="90" cy="95" r="15"/>
        <line class="stick" x1="90" y1="110" x2="90" y2="170"/>
        <line class="stick" x1="90" y1="170" x2="95" y2="215"/>
      </g>
    </svg>`,

  "fentes": `
    <svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .lu-up { animation: lu-fade-up 2.4s ease-in-out infinite; }
        .lu-down { animation: lu-fade-down 2.4s ease-in-out infinite; }
        @keyframes lu-fade-up { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes lu-fade-down { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <line class="ground" x1="45" y1="258" x2="175" y2="258"/>
      <g class="lu-up">
        <circle class="joint" cx="100" cy="35" r="15"/>
        <line class="stick" x1="100" y1="54" x2="100" y2="155"/>
        <line class="stick move" x1="100" y1="155" x2="85" y2="255"/>
        <line class="stick move" x1="100" y1="155" x2="115" y2="255"/>
      </g>
      <g class="lu-down">
        <circle class="joint" cx="100" cy="55" r="15"/>
        <line class="stick" x1="100" y1="74" x2="105" y2="150"/>
        <polyline class="stick move" points="105,150 145,175 150,255"/>
        <polyline class="stick move" points="105,150 65,190 60,250"/>
      </g>
    </svg>`,

  "mollets": `
    <svg viewBox="0 0 160 280" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .mo-body { animation: mo-raise 2s ease-in-out infinite; transform-origin: 80px 255px; }
        @keyframes mo-raise { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
      </style>
      <line class="ground" x1="35" y1="258" x2="125" y2="258"/>
      <g class="mo-body">
        <circle class="joint" cx="80" cy="35" r="15"/>
        <line class="stick" x1="80" y1="54" x2="80" y2="155"/>
        <line class="stick" x1="80" y1="155" x2="60" y2="255"/>
        <line class="stick move" x1="80" y1="155" x2="100" y2="255"/>
        <line class="stick move" x1="100" y1="255" x2="100" y2="240"/>
      </g>
    </svg>`,

  "crunch": `
    <svg viewBox="0 0 260 160" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .cr-down { animation: cr-fade-down 2s ease-in-out infinite; }
        .cr-up { animation: cr-fade-up 2s ease-in-out infinite; }
        @keyframes cr-fade-down { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes cr-fade-up { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
      </style>
      <line class="ground" x1="20" y1="130" x2="240" y2="130"/>
      <g class="cr-down">
        <circle class="joint" cx="215" cy="115" r="14"/>
        <line class="stick move" x1="202" y1="118" x2="120" y2="118"/>
        <polyline class="stick" points="120,118 90,95 90,50"/>
        <polyline class="stick" points="90,50 60,35 60,15"/>
      </g>
      <g class="cr-up">
        <circle class="joint" cx="200" cy="80" r="14"/>
        <line class="stick move" x1="190" y1="90" x2="120" y2="115"/>
        <polyline class="stick" points="120,115 90,95 90,50"/>
        <polyline class="stick" points="90,50 60,35 60,15"/>
      </g>
    </svg>`,

  "planche": `
    <svg viewBox="0 0 260 140" xmlns="http://www.w3.org/2000/svg" class="exercise-anim-svg">
      <style>${STICK_STYLE}
        .pl-hold { animation: pl-pulse 2s ease-in-out infinite; transform-origin: 150px 90px; }
        @keyframes pl-pulse { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.04); } }
      </style>
      <line class="ground" x1="20" y1="128" x2="240" y2="128"/>
      <line class="stick" x1="60" y1="128" x2="60" y2="105"/>
      <line class="stick" x1="220" y1="90" x2="230" y2="128"/>
      <g class="pl-hold">
        <circle class="joint" cx="225" cy="72" r="13"/>
        <line class="stick move" x1="213" y1="80" x2="60" y2="105"/>
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
// l'ordre (premiere regle qui matche gagne). Classees du plus specifique au
// plus general (ex: "leg extension"/"leg curl" AVANT "extension"/"curl"
// generiques, sans quoi le mouvement jambes serait eclipse par le mouvement
// bras) — BUG 2 du 2026-07-23 : plusieurs exercices tombaient sur aucune
// regle faute de mots-cles assez larges.
const ANIMATION_MATCH_RULES = [
  // Développé : variantes les plus specifiques d'abord.
  { key: "développé militaire", test: n => n.includes("developpe militaire") || n.includes("militaire") },
  { key: "développé couché", test: n => n.includes("developpe couche") },
  // Jambes isolees : "leg X" avant le "X" generique correspondant.
  { key: "leg extension", test: n => n.includes("leg extension") },
  { key: "leg curl", test: n => n.includes("leg curl") },
  { key: "leg press", test: n => n.includes("leg press") || n.includes("presse") },
  { key: "squat", test: n => n.includes("squat") || n.includes("hack") },
  { key: "fentes", test: n => n.includes("fente") },
  { key: "hip thrust", test: n => n.includes("hip") },
  { key: "mollets", test: n => n.includes("mollet") },
  // Dos/tirage.
  { key: "rowing barre", test: n => n.includes("rowing") },
  { key: "tractions", test: n => n.includes("traction") },
  { key: "tirage vertical", test: n => n.includes("tirage") && !n.includes("horizontal") && !n.includes("face") },
  // Bras : generiques "curl"/"extension" seulement apres avoir exclu leg curl/extension ci-dessus.
  { key: "curl barre", test: n => n.includes("curl") },
  { key: "extension triceps", test: n => n.includes("pushdown") || n.includes("triceps") || (n.includes("extension") && !n.includes("lombaire") && !n.includes("dos")) },
  // "elevation" seul, mais pas frontale/arriere/oiseau (mouvement different, pas lateral).
  { key: "élévations latérales", test: n => n.includes("elevation") && !n.includes("frontale") && !n.includes("arriere") && !n.includes("oiseau") },
  { key: "dips", test: n => n.includes("dip") },
  // Abdos / gainage.
  { key: "crunch", test: n => n.includes("crunch") },
  { key: "planche", test: n => n.includes("planche") },
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
