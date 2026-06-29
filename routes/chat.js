const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { chatWithCoach } = require("../services/aiCoach");

const router = express.Router();
router.use(requireAuth);

// POST /api/chat — envoie un message au coach IA et retourne sa reponse.
// Le client envoie l'historique complet a chaque requete (l'IA est stateless).
router.post("/", async (req, res) => {
  try {
    const { history } = req.body;
    if (!Array.isArray(history) || !history.length) {
      return res.status(400).json({ error: "Le champ 'history' est requis." });
    }

    // On injecte le programme actif de l'utilisateur dans le contexte de l'IA
    const programResult = await pool.query(
      `SELECT content FROM programs WHERE user_id = $1 AND is_active = TRUE
       ORDER BY created_at DESC LIMIT 1`,
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

module.exports = router;
