const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { stripHtml } = require("../middleware/sanitize");
const { ensureUsername } = require("../services/username");

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
              weight_kg, height_cm, age, gender, activity_level,
              main_goal, goal_date, personal_note, target_weight_kg,
              profile_visible_to_coaches, stats_visible_to_coaches,
              username, public_profile
       FROM users WHERE id=$1`,
      [uid]
    );
    if (!userR.rows.length) return res.status(404).json({ error: "Utilisateur introuvable." });
    const user = userR.rows[0];
    // Reformate en "YYYY-MM-DD" cote serveur : eviter que JSON.stringify() applique
    // toISOString() sur la Date (minuit local) et decale le jour hors UTC.
    if (user.goal_date) user.goal_date = dayStr(user.goal_date);

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
    const uid = req.session.userId;

    const before = await pool.query("SELECT weight_kg, height_cm FROM users WHERE id=$1", [uid]);
    const prev = before.rows[0] || {};
    const norm = v => (v === null || v === undefined || v === "" ? null : Number(v));
    const morphologyChanged = norm(prev.weight_kg) !== norm(weight_kg) || norm(prev.height_cm) !== norm(height_cm);

    await pool.query(
      `UPDATE users SET weight_kg=$1, height_cm=$2, age=$3, gender=$4, activity_level=$5
       WHERE id=$6`,
      [weight_kg||null, height_cm||null, age||null, gender||null, activity_level||null, uid]
    );
    res.json({ ok: true, profileUpdated: morphologyChanged, suggestRegenerate: morphologyChanged });
  } catch (err) {
    console.error("Erreur PUT /profile :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Met a jour l'objectif principal, la date cible, le poids objectif et la note personnelle
router.put("/goals", async (req, res) => {
  try {
    const { main_goal, goal_date, personal_note, target_weight_kg } = req.body;
    await pool.query(
      `UPDATE users SET main_goal=$1, goal_date=$2, personal_note=$3, target_weight_kg=$4 WHERE id=$5`,
      [stripHtml(main_goal) || null, goal_date || null, stripHtml(personal_note) || null, target_weight_kg || null, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur PUT /profile/goals :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Met a jour les preferences de confidentialite vis-a-vis des coaches
router.put("/privacy", async (req, res) => {
  try {
    const { profile_visible_to_coaches, stats_visible_to_coaches } = req.body;
    await pool.query(
      `UPDATE users SET profile_visible_to_coaches=$1, stats_visible_to_coaches=$2 WHERE id=$3`,
      [!!profile_visible_to_coaches, !!stats_visible_to_coaches, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur PUT /profile/privacy :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Active/desactive le profil public (fonctionnalite 7). Genere le username
// a la volee si le compte n'en a pas encore (ex: cree avant cette feature).
router.put("/public-profile", async (req, res) => {
  try {
    const uid = req.session.userId;
    const publicProfile = !!req.body.public_profile;
    if (publicProfile) await ensureUsername(uid);

    const r = await pool.query(
      "UPDATE users SET public_profile=$1 WHERE id=$2 RETURNING username, public_profile",
      [publicProfile, uid]
    );
    res.json({ ok: true, username: r.rows[0].username, public_profile: r.rows[0].public_profile });
  } catch (err) {
    console.error("Erreur PUT /profile/public-profile :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Met a jour le nom / la photo, independamment des donnees physiques
router.put("/identity", async (req, res) => {
  try {
    const { name, avatar_url } = req.body;
    const cleanName = stripHtml(name);
    if (!cleanName) return res.status(400).json({ error: "Le nom ne peut pas être vide." });
    await pool.query(
      "UPDATE users SET name=$1, avatar_url=COALESCE($2, avatar_url) WHERE id=$3",
      [cleanName, avatar_url?.trim() || null, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur PUT /profile/identity :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Delie le compte Google, uniquement si un mot de passe est deja defini
// (sinon l'utilisateur se retrouverait bloque hors de son compte).
router.post("/unlink-google", async (req, res) => {
  try {
    const r = await pool.query("SELECT password_hash FROM users WHERE id=$1", [req.session.userId]);
    if (!r.rows[0]?.password_hash) {
      return res.status(400).json({ error: "Définis d'abord un mot de passe avant de délier Google (sinon tu ne pourrais plus te connecter)." });
    }
    await pool.query("UPDATE users SET google_id=NULL WHERE id=$1", [req.session.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur POST /profile/unlink-google :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
