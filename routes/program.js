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

    const userR = await pool.query("SELECT role FROM users WHERE id=$1", [req.session.userId]);
    if (userR.rows[0]?.role === "user") {
      const countR = await pool.query("SELECT COUNT(*) AS n FROM programs WHERE user_id=$1", [req.session.userId]);
      if (parseInt(countR.rows[0].n, 10) >= 3) {
        return res.status(403).json({
          error: "Tu as atteint la limite gratuite (3 programmes). Passe en Premium pour générer des programmes illimités.",
          upgrade_url: "/premium.html",
        });
      }
    }

    try {
      const profRes = await pool.query(
        "SELECT weight_kg, height_cm, age, gender, activity_level, main_goal, goal_date, personal_note FROM users WHERE id=$1",
        [req.session.userId]
      );
      const prof = profRes.rows[0] || {};
      if (prof.weight_kg) Object.assign(answers, prof);
      if (prof.main_goal) answers.main_goal = prof.main_goal;
      if (prof.goal_date) answers.goal_date = prof.goal_date;
      if (prof.personal_note) answers.personal_note = prof.personal_note;
    } catch(e) { console.warn("Profil ignoré :", e.message); }

    // Anti-duplication (module C) : les 3 derniers programmes servent a
    // eviter que l'IA ne reproduise les memes exercices/ordre.
    let previousPrograms = [];
    try {
      const prevR = await pool.query(
        "SELECT title, content FROM programs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 3",
        [req.session.userId]
      );
      previousPrograms = prevR.rows.map(p => ({
        title: p.title,
        exercises: (p.content?.days || []).flatMap(d => (d.exercises || []).map(e => e.name)),
      }));
    } catch (e) { console.warn("Historique programmes ignoré :", e.message); }

    const program = await generateProgram(answers, previousPrograms);
    await pool.query("UPDATE programs SET is_active=FALSE WHERE user_id=$1", [req.session.userId]);
    const r = await pool.query(
      `INSERT INTO programs (user_id, title, questionnaire, content, is_active)
       VALUES ($1,$2,$3,$4,TRUE) RETURNING id, title, content, created_at`,
      [req.session.userId, program.title||"Mon programme", JSON.stringify(answers), JSON.stringify(program)]
    );
    res.status(201).json({ program: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message||"Erreur génération." });
  }
});

router.get("/active", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id,title,content,created_at FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
      [req.session.userId]
    );
    res.json({ program: r.rows[0]||null });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Historique de tous les programmes
router.get("/history", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id,title,is_active,created_at,questionnaire FROM programs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20",
      [req.session.userId]
    );
    res.json({ programs: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Réactiver un ancien programme
router.post("/:id/activate", async (req, res) => {
  try {
    await pool.query("UPDATE programs SET is_active=FALSE WHERE user_id=$1", [req.session.userId]);
    const r = await pool.query(
      "UPDATE programs SET is_active=TRUE WHERE id=$1 AND user_id=$2 RETURNING id,title",
      [req.params.id, req.session.userId]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Programme introuvable." });
    res.json({ ok: true, program: r.rows[0] });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

module.exports = router;
