const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// node-postgres parse les colonnes DATE en minuit LOCAL : utiliser les
// getters locaux (pas toISOString, qui decale d'un jour hors UTC) pour
// reconstruire "YYYY-MM-DD" de facon fiable quel que soit le fuseau du serveur.
function dayStr(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// Historique des 90 derniers jours (pour le graphe)
router.get("/", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, weight_kg, measured_at FROM weight_logs
       WHERE user_id=$1 AND measured_at >= CURRENT_DATE - INTERVAL '90 days'
       ORDER BY measured_at ASC`,
      [req.session.userId]
    );
    const logs = r.rows.map(row => ({ ...row, measured_at: dayStr(row.measured_at) }));
    res.json({ logs });
  } catch (err) {
    console.error("Erreur GET /weight :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Ajoute une pesee (une seule par jour : ecrase celle du jour si deja loggee)
router.post("/", async (req, res) => {
  try {
    const { weight_kg } = req.body;
    const w = Number(weight_kg);
    if (!w || w < 20 || w > 400) return res.status(400).json({ error: "Poids invalide." });

    const existing = await pool.query(
      "SELECT id FROM weight_logs WHERE user_id=$1 AND measured_at=CURRENT_DATE",
      [req.session.userId]
    );
    let row;
    if (existing.rows.length) {
      const r = await pool.query(
        "UPDATE weight_logs SET weight_kg=$1 WHERE id=$2 RETURNING id, weight_kg, measured_at",
        [w, existing.rows[0].id]
      );
      row = r.rows[0];
    } else {
      const r = await pool.query(
        "INSERT INTO weight_logs (user_id, weight_kg) VALUES ($1,$2) RETURNING id, weight_kg, measured_at",
        [req.session.userId, w]
      );
      row = r.rows[0];
    }
    row.measured_at = dayStr(row.measured_at);

    // Garde le profil (weight_kg) synchronise avec la derniere pesee.
    await pool.query("UPDATE users SET weight_kg=$1 WHERE id=$2", [w, req.session.userId]);

    res.status(201).json({ log: row });
  } catch (err) {
    console.error("Erreur POST /weight :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
