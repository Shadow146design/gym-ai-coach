const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// ── Enregistre une serie ───────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { exercise_name, muscle_group, weight, reps, sets, note } = req.body;
    if (!exercise_name || weight === undefined || !reps)
      return res.status(400).json({ error: "exercise_name, weight et reps sont requis." });

    const r = await pool.query(
      `INSERT INTO logs (user_id, exercise_name, muscle_group, weight, reps, sets, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.session.userId, exercise_name.trim(), muscle_group||null, weight, reps, sets||1, note||null]
    );
    res.status(201).json({ log: r.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Exercices connus (autocomplete) ───────────────────────
router.get("/exercises", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT DISTINCT exercise_name FROM logs WHERE user_id=$1 ORDER BY exercise_name",
      [req.session.userId]
    );
    res.json({ exercises: r.rows.map(x => x.exercise_name) });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Records persos ─────────────────────────────────────────
router.get("/records", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT exercise_name, MAX(weight) AS max_weight FROM logs WHERE user_id=$1 GROUP BY exercise_name ORDER BY max_weight DESC",
      [req.session.userId]
    );
    res.json({ records: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Poids precedent par exercice (pour la seance 1-tap) ───
router.get("/recent", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT DISTINCT ON (exercise_name)
         exercise_name, weight, reps, performed_at
       FROM logs WHERE user_id=$1
       ORDER BY exercise_name, performed_at DESC`,
      [req.session.userId]
    );
    res.json({ recent: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Recap seance (series loggees aujourd'hui) ─────────────
router.get("/recap", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT l.*,
         (SELECT MAX(weight) FROM logs l2
          WHERE l2.user_id=l.user_id AND l2.exercise_name=l.exercise_name
          AND l2.performed_at < DATE_TRUNC('day', NOW())
         ) AS previous_weight
       FROM logs l
       WHERE l.user_id=$1 AND l.performed_at >= DATE_TRUNC('day', NOW())
       ORDER BY l.performed_at`,
      [req.session.userId]
    );
    res.json({ recap: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Volume total par jour (courbe seance) ─────────────────
router.get("/volume", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT performed_at::date AS day,
              SUM(weight * reps * sets) AS volume
       FROM logs WHERE user_id=$1
       GROUP BY day ORDER BY day`,
      [req.session.userId]
    );
    res.json({ volume: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Historique par exercice (courbe progression) ──────────
router.get("/", async (req, res) => {
  try {
    const { exercise } = req.query;
    let q = "SELECT * FROM logs WHERE user_id=$1";
    const p = [req.session.userId];
    if (exercise) { q += " AND exercise_name=$2"; p.push(exercise); }
    q += " ORDER BY performed_at ASC";
    const r = await pool.query(q, p);
    res.json({ logs: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Stats dashboard complet ───────────────────────────────
router.get("/dashboard-stats", async (req, res) => {
  try {
    const uid = req.session.userId;

    // Nombre total de seances distinctes (par jour)
    const sessRes = await pool.query(
      "SELECT COUNT(DISTINCT performed_at::date) AS total FROM logs WHERE user_id=$1",
      [uid]
    );
    const totalSessions = parseInt(sessRes.rows[0].total) || 0;

    // Derniere seance
    const lastRes = await pool.query(
      "SELECT MAX(performed_at) AS last FROM logs WHERE user_id=$1",
      [uid]
    );
    const lastSessionDate = lastRes.rows[0].last || null;

    // Frequence sur 4 semaines (nb de jours par semaine)
    const freqRes = await pool.query(
      `SELECT DATE_TRUNC('week', performed_at) AS week, COUNT(DISTINCT performed_at::date) AS days
       FROM logs WHERE user_id=$1 AND performed_at >= NOW() - INTERVAL '28 days'
       GROUP BY week ORDER BY week`,
      [uid]
    );
    // Remplir les 4 semaines même si vides
    const freqMap = {};
    freqRes.rows.forEach(r => { freqMap[r.week.toISOString().slice(0,10)] = parseInt(r.days); });
    const weeklyFrequency = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0,10);
      weeklyFrequency.push(freqMap[key] || 0);
    }

    // Recup programme actif pour calculer targetPerWeek
    const progRes = await pool.query(
      "SELECT content FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
      [uid]
    );
    let targetPerWeek = null;
    if (progRes.rows[0]) {
      targetPerWeek = (progRes.rows[0].content.days || []).length;
    }

    // Taux de completude : seances faites / objectif sur 4 semaines
    const totalDone = weeklyFrequency.reduce((a,b) => a+b, 0);
    const completionRate = targetPerWeek
      ? Math.min(100, Math.round((totalDone / (targetPerWeek * 4)) * 100))
      : null;

    // Volume par groupe musculaire (30 derniers jours)
    const muscRes = await pool.query(
      `SELECT COALESCE(muscle_group, 'Non défini') AS muscle_group,
              SUM(weight * reps * sets) AS volume
       FROM logs WHERE user_id=$1 AND muscle_group IS NOT NULL
       AND performed_at >= NOW() - INTERVAL '30 days'
       GROUP BY muscle_group ORDER BY volume DESC`,
      [uid]
    );

    res.json({
      totalSessions,
      lastSessionDate,
      weeklyFrequency,
      targetPerWeek,
      completionRate,
      avgSessionMinutes: null, // pas de champ duree en base pour l'instant
      muscleGroupVolume: muscRes.rows,
    });
  } catch (err) {
    console.error("Erreur /dashboard-stats :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── Stats hebdomadaires (tableau semaine par semaine) ─────
router.get("/weekly", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('week', performed_at), 'DD/MM') AS week_label,
         COUNT(DISTINCT performed_at::date) AS sessions,
         SUM(weight * reps * sets) AS volume,
         COUNT(*) AS total_sets,
         MAX(weight) AS max_weight
       FROM logs WHERE user_id=$1
       AND performed_at >= NOW() - INTERVAL '12 weeks'
       GROUP BY DATE_TRUNC('week', performed_at)
       ORDER BY DATE_TRUNC('week', performed_at) DESC`,
      [req.session.userId]
    );
    res.json({ weeks: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Projection de progression ─────────────────────────────
// Regression lineaire simple sur les 10 derniers poids d'un exercice
// pour estimer les 4 prochaines seances
router.get("/projection", async (req, res) => {
  try {
    const { exercise } = req.query;
    if (!exercise) return res.status(400).json({ error: "exercise requis." });

    const r = await pool.query(
      `SELECT weight, performed_at FROM logs
       WHERE user_id=$1 AND exercise_name=$2
       ORDER BY performed_at DESC LIMIT 10`,
      [req.session.userId, exercise]
    );
    const rows = r.rows.reverse();
    if (rows.length < 3) return res.json({ projection: [] });

    const n = rows.length;
    const xs = rows.map((_, i) => i);
    const ys = rows.map(r => Number(r.weight));
    const sumX = xs.reduce((a,b) => a+b, 0);
    const sumY = ys.reduce((a,b) => a+b, 0);
    const sumXY = xs.reduce((a,x,i) => a + x*ys[i], 0);
    const sumX2 = xs.reduce((a,x) => a + x*x, 0);
    const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
    const intercept = (sumY - slope*sumX) / n;

    const projection = [1,2,3,4].map(step => ({
      label: `S+${step}`,
      weight: Math.round((intercept + slope*(n-1+step)) * 2) / 2, // arrondi 0.5kg
    }));

    res.json({ projection });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

module.exports = router;
