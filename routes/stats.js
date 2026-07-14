const express = require("express");
const pool = require("../db/pool");
const { cached } = require("../services/cache");

const router = express.Router();

// GET /api/stats/public — compteurs globaux pour la landing page (pas d'auth
// requise). Cache 1h : simple, statique a la minute pres, evite de taper la
// DB a chaque chargement de la home publique.
router.get("/public", async (req, res) => {
  try {
    const data = await cached("stats:public", 60 * 60 * 1000, async () => {
      const usersR = await pool.query("SELECT COUNT(*)::int AS c FROM users");
      const workoutsR = await pool.query(
        "SELECT COUNT(DISTINCT (user_id, performed_at::date))::int AS c FROM logs"
      );
      return { totalUsers: usersR.rows[0].c, totalWorkouts: workoutsR.rows[0].c };
    });
    res.json(data);
  } catch (err) {
    console.error("Erreur GET /stats/public :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
