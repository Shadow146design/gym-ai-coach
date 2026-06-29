const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { chatWithCoach } = require("../services/aiCoach");

const router = express.Router();
router.use(requireAuth);

// Historique de la conversation avec le Coach IA
router.get("/messages", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, role, content, created_at FROM coach_messages
       WHERE user_id = $1 ORDER BY created_at ASC`,
      [req.session.userId]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    console.error("Erreur /coach/messages :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Envoie un message au Coach IA, recoit et sauvegarde la reponse
router.post("/messages", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message vide." });
    }

    // Recupere le programme actif pour donner du contexte a l'IA
    const programResult = await pool.query(
      `SELECT content FROM programs WHERE user_id = $1 AND is_active = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [req.session.userId]
    );
    const program = programResult.rows[0] ? programResult.rows[0].content : null;

    // Historique recent (20 derniers messages) pour la memoire de conversation
    const historyResult = await pool.query(
      `SELECT role, content FROM coach_messages WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.session.userId]
    );
    const history = historyResult.rows.reverse();
    history.push({ role: "user", content: content.trim() });

    const reply = await chatWithCoach(history, program);

    await pool.query(
      `INSERT INTO coach_messages (user_id, role, content) VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
      [req.session.userId, content.trim(), reply]
    );

    res.status(201).json({ reply });
  } catch (err) {
    console.error("Erreur POST /coach/messages :", err);
    res.status(500).json({ error: err.message || "Erreur serveur lors de la discussion avec le coach." });
  }
});

module.exports = router;
