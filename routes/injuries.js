const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { EXERCISE_DATABASE } = require("../services/aiCoach");
const { logProgramChange } = require("../services/programHistory");

const router = express.Router();
router.use(requireAuth);

// Correspondance muscle_group (francais, tel que stocke sur les exercices du
// programme) -> cle de EXERCISE_DATABASE, pour piocher un exercice de
// remplacement cible sur le meme muscle (fonctionnalite 3.4).
const MUSCLE_TO_DB_KEY = {
  "dos": "DOS", "poitrine": "PECS", "pecs": "PECS", "pectoraux": "PECS",
  "épaules": "EPAULES", "epaules": "EPAULES", "biceps": "BICEPS", "triceps": "TRICEPS",
  "jambes": "JAMBES", "fessiers": "JAMBES", "abdos": "ABDOS", "abdominaux": "ABDOS",
};

// Choisit un exercice de remplacement du meme muscle, different de celui
// blesse et de ceux deja presents sur la meme journee (evite les doublons).
function pickReplacement(muscleGroup, excludeNames) {
  const key = MUSCLE_TO_DB_KEY[String(muscleGroup || "").toLowerCase().trim()];
  if (!key) return null;
  const excluded = new Set(excludeNames.map(n => n.toLowerCase()));
  const candidates = (EXERCISE_DATABASE[key] || []).filter(n => !excluded.has(n.toLowerCase()));
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Signalements de fatigue/blessure non resolus (fonctionnalite 5)
router.get("/current", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id, exercise_name, type, detected_at FROM injury_flags WHERE user_id=$1 AND resolved_at IS NULL ORDER BY detected_at DESC",
      [req.session.userId]
    );
    res.json({ injuries: r.rows });
  } catch (err) {
    console.error("Erreur GET /injuries/current :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Resout un signalement. body.action="adapt" retire en plus l'exercice
// concerne du programme actif (le bouton "Adapter le programme") ; toute
// autre valeur (ou absente) resout simplement le signalement ("C'est ok, continuer").
router.post("/resolve/:id", async (req, res) => {
  try {
    const { action } = req.body || {};
    const flagR = await pool.query(
      "SELECT id, exercise_name FROM injury_flags WHERE id=$1 AND user_id=$2 AND resolved_at IS NULL",
      [req.params.id, req.session.userId]
    );
    const flag = flagR.rows[0];
    if (!flag) return res.status(404).json({ error: "Signalement introuvable." });

    let adapted = false;
    let replacement = null;
    if (action === "adapt") {
      const progR = await pool.query(
        "SELECT id, content FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
        [req.session.userId]
      );
      const row = progR.rows[0];
      if (row) {
        const previousContent = JSON.parse(JSON.stringify(row.content));
        const program = row.content;
        const target = flag.exercise_name.toLowerCase();

        (program.days || []).forEach(day => {
          const exercises = day.exercises || [];
          const idx = exercises.findIndex(ex => (ex.name || "").toLowerCase() === target);
          if (idx === -1) return;

          const injured = exercises[idx];
          const dayNames = exercises.map(ex => ex.name);
          const sub = pickReplacement(injured.muscle_group, [...dayNames, flag.exercise_name]);

          if (sub) {
            // Remplacement cible sur le meme muscle, charge de reprise a 50%
            // (reference explicite dans les notes pour que l'utilisateur/coach le voie).
            exercises[idx] = {
              ...injured,
              name: sub,
              notes: `Remplace ${injured.name} (gêne signalée). Reprends à ~50% de ta charge habituelle sur cet exercice, puis augmente progressivement sur les séances suivantes.`,
            };
            replacement = sub;
          } else {
            exercises.splice(idx, 1); // pas de substitut trouvé pour ce muscle : on retire simplement
          }
          adapted = true;
        });

        if (adapted) {
          await pool.query("UPDATE programs SET content=$1 WHERE id=$2", [JSON.stringify(program), row.id]);
          const desc = replacement
            ? `${flag.exercise_name} remplacé par ${replacement} (blessure/gêne signalée)`
            : `${flag.exercise_name} retiré du programme (blessure/gêne signalée)`;
          logProgramChange(req.session.userId, row.id, "injury", desc, previousContent);
        }
      }
    }

    await pool.query("UPDATE injury_flags SET resolved_at=NOW() WHERE id=$1", [flag.id]);
    res.json({ ok: true, adapted, replacement });
  } catch (err) {
    console.error("Erreur POST /injuries/resolve :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
