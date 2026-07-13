const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Mappe les noms d'exercices FR de la bibliothèque vers un ou plusieurs noms
// anglais à tenter sur Wger (essayés dans l'ordre, le premier qui matche
// gagne). L'API Wger ne fait qu'une égalité EXACTE sur "name" (pas de
// recherche floue/partielle cote serveur), d'où plusieurs variantes par
// exercice pour maximiser les chances de trouver une correspondance.
const EXERCISE_TRANSLATIONS = {
  "développé couché barre": ["Bench Press"],
  "développé couché haltères plat": ["Bench Press"],
  "squat barre": ["Squats"],
  "hack squat": ["Hack squat"],
  "soulevé de terre": ["Deadlifts", "Deadlift"],
  "soulevé de terre jambes tendues": ["Deadlifts", "Deadlift"],
  "rowing barre": ["Bent over Row", "Barbell Row"],
  "rowing haltère": ["One Arm Dumbbell Row", "Dumbbell Row"],
  "développé militaire": ["Overhead Press", "Military Press"],
  "développé militaire barre": ["Overhead Press", "Military Press"],
  "développé militaire haltères": ["Overhead Press", "Military Press"],
  "tractions": ["Pull-ups", "Pull-up"],
  "curl barre ez": ["EZ Bar Curl", "Barbell Curl"],
  "curl barre droite": ["Barbell Curl"],
  "presse à cuisses": ["Leg Press"],
  "leg extension": ["Leg Extension", "Leg Extensions"],
  "leg curl": ["Leg Curl", "Leg Curls"],
  "dips": ["Dips"],
  "dips triceps banc": ["Dips"],
  "élévations latérales": ["Lateral Raise", "Side Lateral Raise"],
  "élévations latérales haltères": ["Lateral Raise", "Side Lateral Raise"],
  "développé couché incliné haltères": ["Incline Bench Press"],
  "hip thrust": ["Hip Thrust"],
  "hip thrust barre": ["Hip Thrust"],
  "fentes haltères": ["Lunges"],
  "mollets debout machine": ["Standing Calf Raises", "Calf Raises"],
  "mollets assis machine": ["Seated Calf Raise", "Calf Raises"],
  "crunch": ["Crunches"],
  "planche": ["Plank"],
  "shrugs barre": ["Shrugs"],
};

function translateExerciseName(name) {
  const norm = String(name || "").toLowerCase().trim();
  if (EXERCISE_TRANSLATIONS[norm]) return EXERCISE_TRANSLATIONS[norm];
  for (const [fr, candidates] of Object.entries(EXERCISE_TRANSLATIONS)) {
    if (norm.includes(fr) || fr.includes(norm)) return candidates;
  }
  return [name]; // repli : tente le nom francais tel quel (echouera probablement sur Wger)
}

function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Interroge l'API Wger (gratuite, open source) : exercise-translation pour
// trouver l'id de l'exercice de base a partir du nom anglais, puis
// exerciseinfo pour l'image de demonstration et les muscles travailles.
async function fetchWgerDemo(name) {
  for (const candidate of translateExerciseName(name)) {
    try {
      const searchRes = await fetch(
        `https://wger.de/api/v2/exercise-translation/?format=json&language=2&name=${encodeURIComponent(candidate)}`
      );
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const match = searchData.results?.[0];
      if (!match) continue;

      const infoRes = await fetch(`https://wger.de/api/v2/exerciseinfo/${match.exercise}/?format=json`);
      if (!infoRes.ok) continue;
      const info = await infoRes.json();

      const mainImage = (info.images || []).find(i => i.is_main) || info.images?.[0];
      const muscles = [...(info.muscles || []), ...(info.muscles_secondary || [])].map(m => m.name_en || m.name);

      return {
        imageUrl: mainImage?.thumbnails?.medium || mainImage?.image || null,
        description: stripHtml(match.description) || null,
        muscles: [...new Set(muscles)],
      };
    } catch (e) {
      console.error(`Erreur appel Wger pour "${candidate}" :`, e.message);
    }
  }
  return null;
}

// GET /api/exercises/demo/:name — image/description/muscles de demonstration
// (remplace les videos YouTube). Cache local en base (table exercise_demos) :
// un seul appel Wger par exercice, meme si l'exercice n'est pas trouve
// (evite de re-interroger Wger a chaque ouverture du modal pour rien).
router.get("/demo/:name", async (req, res) => {
  try {
    const name = req.params.name;
    const cacheKey = name.toLowerCase().trim();

    const cached = await pool.query("SELECT image_url, description, muscles FROM exercise_demos WHERE exercise_name=$1", [cacheKey]);
    if (cached.rows.length) {
      const row = cached.rows[0];
      return res.json({ imageUrl: row.image_url, description: row.description, muscles: row.muscles || [] });
    }

    const demo = await fetchWgerDemo(name);

    await pool.query(
      `INSERT INTO exercise_demos (exercise_name, image_url, description, muscles) VALUES ($1,$2,$3,$4)
       ON CONFLICT (exercise_name) DO UPDATE SET image_url=$2, description=$3, muscles=$4, cached_at=NOW()`,
      [cacheKey, demo?.imageUrl || null, demo?.description || null, demo?.muscles || []]
    );

    res.json({ imageUrl: demo?.imageUrl || null, description: demo?.description || null, muscles: demo?.muscles || [] });
  } catch (err) {
    console.error("Erreur GET /exercises/demo :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
