// Retire toute balise HTML des champs texte libres avant stockage : defense
// en profondeur en plus de l'echappement deja fait cote affichage (esc()).
function stripHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/<[^>]*>/g, "").trim();
}

module.exports = { stripHtml };
