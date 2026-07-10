const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Vidéo YouTube de démonstration pour un exercice (fonctionnalité 1). Essaie
// une égalité stricte (casse ignorée) d'abord, puis un recouvrement partiel
// dans les deux sens (le nom généré par l'IA contient souvent le nom
// générique de la bibliothèque, ou l'inverse).
router.get("/video/:name", async (req, res) => {
  try {
    const name = req.params.name;
    let r = await pool.query(
      "SELECT exercise_name, youtube_id, thumbnail_url FROM exercise_videos WHERE lower(exercise_name)=lower($1)",
      [name]
    );
    if (!r.rows.length) {
      r = await pool.query(
        `SELECT exercise_name, youtube_id, thumbnail_url FROM exercise_videos
         WHERE $1 ILIKE '%' || exercise_name || '%' OR exercise_name ILIKE '%' || $1 || '%'
         ORDER BY length(exercise_name) DESC LIMIT 1`,
        [name]
      );
    }
    res.json({ video: r.rows[0] || null });
  } catch (err) {
    console.error("Erreur GET /exercises/video :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
