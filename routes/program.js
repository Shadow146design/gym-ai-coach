const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { generateProgram } = require("../services/aiCoach");

const router = express.Router();
router.use(requireAuth);

router.post("/generate", async (req, res) => {
  try {
    const answers = req.body;
    const required = ["objectif","niveau","joursParSemaine","dureeSeance","materiel"];
    const missing = required.filter(k => !answers[k]);
    if (missing.length) return res.status(400).json({ error: `Champs manquants : ${missing.join(", ")}` });

    // Auto-injecte le profil physique — resilient si colonnes pas encore migrées
    try {
      const profRes = await pool.query(
        "SELECT weight_kg, height_cm, age, gender, activity_level FROM users WHERE id=$1",
        [req.session.userId]
      );
      const prof = profRes.rows[0] || {};
      if (prof.weight_kg) Object.assign(answers, prof);
    } catch (profileErr) {
      // Colonnes profil pas encore en base (migration non faite) : on continue sans
      console.warn("Profil physique ignoré (migration manquante) :", profileErr.message);
    }

    const program = await generateProgram(answers);

    await pool.query("UPDATE programs SET is_active=FALSE WHERE user_id=$1", [req.session.userId]);
    const r = await pool.query(
      `INSERT INTO programs (user_id, title, questionnaire, content, is_active)
       VALUES ($1,$2,$3,$4,TRUE) RETURNING id, title, content, created_at`,
      [req.session.userId, program.title || "Mon programme", JSON.stringify(answers), JSON.stringify(program)]
    );
    res.status(201).json({ program: r.rows[0] });
  } catch (err) {
    console.error("Erreur /program/generate :", err);
    res.status(500).json({ error: err.message || "Erreur lors de la génération." });
  }
});

router.get("/active", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id, title, content, created_at FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
      [req.session.userId]
    );
    res.json({ program: r.rows[0] || null });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

module.exports = router;
