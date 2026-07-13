const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { fetchWgerDemo } = require("../services/wgerDemo");

const router = express.Router();
router.use(requireAuth);

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
