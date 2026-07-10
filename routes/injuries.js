const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Signalements de fatigue/blessure non resolus (fonctionnalite 5)
router.get("/current", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id, exercise_name, type, detected_at FROM injury_flags WHERE user_id=$1 AND resolved_at IS NULL ORDER BY detected_at DESC",
      [req.session.userId]
    );
    res.json({ injuries: r.rows });
  } catch (err) {
    console.error("Erreur GET /injuries/current :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Resout un signalement. body.action="adapt" retire en plus l'exercice
// concerne du programme actif (le bouton "Adapter le programme") ; toute
// autre valeur (ou absente) resout simplement le signalement ("C'est ok, continuer").
router.post("/resolve/:id", async (req, res) => {
  try {
    const { action } = req.body || {};
    const flagR = await pool.query(
      "SELECT id, exercise_name FROM injury_flags WHERE id=$1 AND user_id=$2 AND resolved_at IS NULL",
      [req.params.id, req.session.userId]
    );
    const flag = flagR.rows[0];
    if (!flag) return res.status(404).json({ error: "Signalement introuvable." });

    let adapted = false;
    if (action === "adapt") {
      const progR = await pool.query(
        "SELECT id, content FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
        [req.session.userId]
      );
      const row = progR.rows[0];
      if (row) {
        const program = row.content;
        const target = flag.exercise_name.toLowerCase();
        let removed = false;
        (program.days || []).forEach(day => {
          const before = (day.exercises || []).length;
          day.exercises = (day.exercises || []).filter(ex => (ex.name || "").toLowerCase() !== target);
          if (day.exercises.length < before) removed = true;
        });
        if (removed) {
          await pool.query("UPDATE programs SET content=$1 WHERE id=$2", [JSON.stringify(program), row.id]);
          adapted = true;
        }
      }
    }

    await pool.query("UPDATE injury_flags SET resolved_at=NOW() WHERE id=$1", [flag.id]);
    res.json({ ok: true, adapted });
  } catch (err) {
    console.error("Erreur POST /injuries/resolve :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
