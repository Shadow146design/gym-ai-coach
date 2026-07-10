const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { computeNutritionGoals } = require("../services/nutrition");

const router = express.Router();
router.use(requireAuth);

// node-postgres parse les colonnes DATE en minuit LOCAL : utiliser les
// getters locaux (pas toISOString, qui decale d'un jour hors UTC) pour
// reconstruire "YYYY-MM-DD" de facon fiable quel que soit le fuseau du serveur.
function dayStr(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// Objectifs journaliers (calories/macros), calcules depuis le profil physique
// et l'objectif du programme actif (musculation/seche/maintien).
router.get("/goals", async (req, res) => {
  try {
    const profileR = await pool.query(
      "SELECT weight_kg, height_cm, age, gender, activity_level FROM users WHERE id=$1",
      [req.session.userId]
    );
    const profile = profileR.rows[0];

    const programR = await pool.query(
      "SELECT questionnaire FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
      [req.session.userId]
    );
    const objectif = programR.rows[0]?.questionnaire?.objectif || null;

    const goals = computeNutritionGoals(profile, objectif);
    if (!goals) {
      return res.status(400).json({
        error: "Complète ton profil (poids, taille, âge) pour calculer tes besoins nutritionnels.",
        incomplete: true,
      });
    }
    res.json({ goals });
  } catch (err) {
    console.error("Erreur GET /nutrition/goals :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Historique des 30 derniers jours (pour le graphe + le journal)
router.get("/", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, date, calories, proteins, carbs, fats, notes FROM nutrition_logs
       WHERE user_id=$1 AND date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY date ASC`,
      [req.session.userId]
    );
    const logs = r.rows.map(row => ({ ...row, date: dayStr(row.date) }));
    res.json({ logs });
  } catch (err) {
    console.error("Erreur GET /nutrition :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Enregistre l'entree du jour (une seule par jour : ecrase celle du jour si deja loggee)
router.post("/", async (req, res) => {
  try {
    const { calories, proteins, carbs, fats, notes } = req.body;
    const cal = calories === "" || calories == null ? null : Number(calories);
    const pro = proteins === "" || proteins == null ? null : Number(proteins);
    const carb = carbs === "" || carbs == null ? null : Number(carbs);
    const fat = fats === "" || fats == null ? null : Number(fats);

    for (const [label, v] of [["calories", cal], ["proteins", pro], ["carbs", carb], ["fats", fat]]) {
      if (v !== null && (isNaN(v) || v < 0 || v > 20000)) {
        return res.status(400).json({ error: `Valeur invalide pour ${label}.` });
      }
    }

    const r = await pool.query(
      `INSERT INTO nutrition_logs (user_id, date, calories, proteins, carbs, fats, notes)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, date) DO UPDATE SET
         calories=$2, proteins=$3, carbs=$4, fats=$5, notes=$6
       RETURNING id, date, calories, proteins, carbs, fats, notes`,
      [req.session.userId, cal, pro, carb, fat, notes ? String(notes).slice(0, 500) : null]
    );
    const log = r.rows[0];
    log.date = dayStr(log.date);
    res.status(201).json({ log });
  } catch (err) {
    console.error("Erreur POST /nutrition :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
