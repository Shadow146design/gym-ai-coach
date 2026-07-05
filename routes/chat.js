const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { chatWithCoach, debriefSession, analyzePlateau } = require("../services/aiCoach");

const router = express.Router();
router.use(requireAuth);

// POST /api/chat — chat general (connait le programme actif)
router.post("/", async (req, res) => {
  try {
    const { history } = req.body;
    if (!Array.isArray(history) || !history.length)
      return res.status(400).json({ error: "Le champ 'history' est requis." });

    const programResult = await pool.query(
      `SELECT content FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1`,
      [req.session.userId]
    );
    const program = programResult.rows[0]?.content || null;

    const reply = await chatWithCoach(history, program);
    res.json({ reply });
  } catch (err) {
    console.error("Erreur /api/chat :", err);
    res.status(500).json({ error: err.message || "Erreur du coach IA." });
  }
});

// POST /api/chat/debrief — analyse automatique de la seance qui vient de se terminer
router.post("/debrief", async (req, res) => {
  try {
    const { exercises, totalVolume, durationMins, prs, programFocus } = req.body;
    if (!Array.isArray(exercises) || !exercises.length)
      return res.status(400).json({ error: "Aucune donnee de seance fournie." });

    const debrief = await debriefSession({ exercises, totalVolume, durationMins, prs, programFocus });
    res.json({ debrief });
  } catch (err) {
    console.error("Erreur /api/chat/debrief :", err);
    res.status(500).json({ error: err.message || "Erreur lors de l'analyse de la seance." });
  }
});

// POST /api/chat/plateau-advice — conseils IA specifiques pour sortir d'un plateau
router.post("/plateau-advice", async (req, res) => {
  try {
    const { plateaus } = req.body;
    if (!Array.isArray(plateaus) || !plateaus.length)
      return res.status(400).json({ error: "Aucun plateau fourni." });

    const advice = await analyzePlateau(plateaus);
    res.json({ advice });
  } catch (err) {
    console.error("Erreur /api/chat/plateau-advice :", err);
    res.status(500).json({ error: err.message || "Erreur du coach IA." });
  }
});

module.exports = router;
