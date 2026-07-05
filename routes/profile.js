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

router.get("/", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT name, email, weight_kg, height_cm, age, gender, activity_level FROM users WHERE id=$1",
      [req.session.userId]
    );
    res.json({ profile: r.rows[0] || null });
  } catch (err) {
    console.error("Erreur GET /profile :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Profil complet : identite, donnees physiques, stats, abonnement
router.get("/full", async (req, res) => {
  try {
    const uid = req.session.userId;
    const userR = await pool.query(
      `SELECT name, email, role, avatar_url, created_at, google_id,
              weight_kg, height_cm, age, gender, activity_level
       FROM users WHERE id=$1`,
      [uid]
    );
    if (!userR.rows.length) return res.status(404).json({ error: "Utilisateur introuvable." });
    const user = userR.rows[0];

    const daysR = await pool.query(
      "SELECT DISTINCT performed_at::date AS day FROM logs WHERE user_id=$1 ORDER BY day DESC",
      [uid]
    );
    const days = daysR.rows.map(r => dayStr(r.day));
    const today = dayStr(new Date());
    const yesterday = dayStr(new Date(Date.now() - 86400000));
    let streak = 0, best = 0;
    if (days.length) {
      if (days[0] === today || days[0] === yesterday) {
        streak = 1;
        for (let i = 1; i < days.length; i++) {
          const diff = (new Date(days[i - 1]) - new Date(days[i])) / 86400000;
          if (diff === 1) streak++; else break;
        }
      }
      let tmp = 1;
      for (let i = 1; i < days.length; i++) {
        const diff = (new Date(days[i - 1]) - new Date(days[i])) / 86400000;
        if (diff === 1) tmp++;
        else { best = Math.max(best, tmp); tmp = 1; }
      }
      best = Math.max(best, tmp, streak);
    }

    const progR = await pool.query(
      "SELECT id, title FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
      [uid]
    );
    const subR = await pool.query(
      "SELECT plan, status, created_at FROM subscriptions WHERE user_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 1",
      [uid]
    );

    res.json({
      user,
      stats: {
        totalSessions: days.length,
        streak,
        bestStreak: best,
        lastSession: days[0] || null,
      },
      activeProgram: progR.rows[0] || null,
      subscription: subR.rows[0] || null,
    });
  } catch (err) {
    console.error("Erreur GET /profile/full :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.put("/", async (req, res) => {
  try {
    const { weight_kg, height_cm, age, gender, activity_level } = req.body;
    await pool.query(
      `UPDATE users SET weight_kg=$1, height_cm=$2, age=$3, gender=$4, activity_level=$5
       WHERE id=$6`,
      [weight_kg||null, height_cm||null, age||null, gender||null, activity_level||null, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur PUT /profile :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Met a jour le nom / la photo, independamment des donnees physiques
router.put("/identity", async (req, res) => {
  try {
    const { name, avatar_url } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Le nom ne peut pas être vide." });
    await pool.query(
      "UPDATE users SET name=$1, avatar_url=COALESCE($2, avatar_url) WHERE id=$3",
      [name.trim(), avatar_url?.trim() || null, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur PUT /profile/identity :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
