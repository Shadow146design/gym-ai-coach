const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { requirePremium } = require("../middleware/premium");

const router = express.Router();
router.use(requireAuth);
router.use(requirePremium);

function computeScore(sleep, energy, soreness) {
  return Math.round(((sleep * 0.4) + (energy * 0.4) + ((11 - soreness) * 0.2)) * 10);
}

function messageForScore(score) {
  if (score > 75) return "Tu es au top ! Vas-y à fond aujourd'hui 💪";
  if (score >= 50) return "Bonne forme, séance normale recommandée";
  return "Tu sembles fatigué, réduis les charges de 15-20% aujourd'hui";
}

router.get("/today", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT sleep_quality, energy_level, soreness, score FROM daily_wellness WHERE user_id=$1 AND created_at=CURRENT_DATE",
      [req.session.userId]
    );
    const entry = r.rows[0] || null;
    res.json({ entry: entry ? { ...entry, score: Number(entry.score), message: messageForScore(Number(entry.score)) } : null });
  } catch (err) {
    console.error("Erreur GET /wellness/today :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/", async (req, res) => {
  try {
    const sleep = parseInt(req.body.sleep_quality, 10);
    const energy = parseInt(req.body.energy_level, 10);
    const soreness = parseInt(req.body.soreness, 10);
    if ([sleep, energy, soreness].some(v => !Number.isInteger(v) || v < 1 || v > 10)) {
      return res.status(400).json({ error: "Les 3 valeurs doivent être des entiers entre 1 et 10." });
    }

    const score = computeScore(sleep, energy, soreness);
    await pool.query(
      `INSERT INTO daily_wellness (user_id, sleep_quality, energy_level, soreness, score)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, created_at) DO UPDATE SET sleep_quality=$2, energy_level=$3, soreness=$4, score=$5`,
      [req.session.userId, sleep, energy, soreness, score]
    );
    res.json({ score, message: messageForScore(score) });
  } catch (err) {
    console.error("Erreur POST /wellness :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
