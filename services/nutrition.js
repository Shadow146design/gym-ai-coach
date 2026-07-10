// Calcul des besoins nutritionnels quotidiens (fonctionnalite 3) : formule
// Harris-Benedict revisee pour le metabolisme de base (BMR), multipliee par
// un facteur d'activite pour obtenir la depense energetique totale (TDEE),
// puis ajustee selon l'objectif d'entrainement actif (deficit/surplus/maintien).

const ACTIVITY_MULTIPLIERS = {
  "sedentaire": 1.2,
  "legerement actif": 1.375,
  "actif": 1.55,
  "tres actif": 1.725,
};

function computeBMR({ weight_kg, height_cm, age, gender }) {
  const w = Number(weight_kg), h = Number(height_cm), a = Number(age);
  return gender === "femme"
    ? 447.593 + 9.247 * w + 3.098 * h - 4.330 * a
    : 88.362 + 13.397 * w + 4.799 * h - 5.677 * a;
}

function goalAdjustment(objectif) {
  const o = (objectif || "").toLowerCase();
  if (o.includes("perte") || o.includes("seche")) return { delta: -400, label: "Perte de poids" };
  if (o.includes("masse") || o.includes("hypertrophie")) return { delta: 400, label: "Prise de masse" };
  return { delta: 0, label: "Maintien" };
}

// Renvoie null si le profil physique est incomplet (impossible de calculer
// un BMR fiable) : l'appelant doit alors inviter l'utilisateur a completer
// son profil plutot que d'afficher des objectifs bidons.
function computeNutritionGoals(profile, objectif) {
  const { weight_kg, height_cm, age, gender, activity_level } = profile || {};
  if (!weight_kg || !height_cm || !age) return null;

  const bmr = computeBMR({ weight_kg, height_cm, age, gender });
  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] || ACTIVITY_MULTIPLIERS["legerement actif"];
  const tdee = bmr * multiplier;
  const { delta, label } = goalAdjustment(objectif);
  const calories = Math.round(tdee + delta);

  // Repartition des macros : proteines et lipides indexes sur le poids de
  // corps (reperes courants en musculation), le reste des calories va aux
  // glucides — jamais negatif meme si l'objectif calorique est tres bas.
  const w = Number(weight_kg);
  const proteins = Math.round(w * 2);
  const fats = Math.round(w * 0.9);
  const carbs = Math.max(0, Math.round((calories - proteins * 4 - fats * 9) / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories,
    proteins,
    carbs,
    fats,
    goalLabel: label,
  };
}

module.exports = { computeNutritionGoals, ACTIVITY_MULTIPLIERS };
