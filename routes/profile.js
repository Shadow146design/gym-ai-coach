const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT name, email, weight_kg, height_cm, age, gender, activity_level FROM users WHERE id=$1",
      [req.session.userId]
    );
    res.json({ profile: r.rows[0] || null });
  } catch (err) {
    console.error("Erreur GET /profile :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.put("/", async (req, res) => {
  try {
    const { weight_kg, height_cm, age, gender, activity_level } = req.body;
    await pool.query(
      `UPDATE users SET weight_kg=$1, height_cm=$2, age=$3, gender=$4, activity_level=$5
       WHERE id=$6`,
      [weight_kg||null, height_cm||null, age||null, gender||null, activity_level||null, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur PUT /profile :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
