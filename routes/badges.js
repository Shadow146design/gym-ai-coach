const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function dayStr(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function bestStreakFromDays(days) {
  if (!days.length) return 0;
  let best = 1, tmp = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i - 1]) - new Date(days[i])) / 86400000;
    if (diff === 1) { tmp++; best = Math.max(best, tmp); } else tmp = 1;
  }
  return best;
}

// Definition des badges : id, icone, titre, description, seuil et unite
// affichee dans la barre de progression.
const BADGE_DEFS = [
  { id: "first_session", icon: "🎬", title: "Premier pas", desc: "Logger ta première séance", metric: "sessions", target: 1 },
  { id: "sessions_10", icon: "🔟", title: "Habitué", desc: "10 séances loggées", metric: "sessions", target: 10 },
  { id: "sessions_50", icon: "💯", title: "Régulier", desc: "50 séances loggées", metric: "sessions", target: 50 },
  { id: "sessions_100", icon: "🏆", title: "Vétéran", desc: "100 séances loggées", metric: "sessions", target: 100 },
  { id: "streak_7", icon: "🔥", title: "Une semaine de feu", desc: "7 jours de suite", metric: "streak", target: 7 },
  { id: "streak_30", icon: "🌋", title: "Un mois en feu", desc: "30 jours de suite", metric: "streak", target: 30 },
  { id: "streak_100", icon: "🚀", title: "Inarrêtable", desc: "100 jours de suite", metric: "streak", target: 100 },
  { id: "exercises_5", icon: "🧩", title: "Touche-à-tout", desc: "5 exercices différents pratiqués", metric: "exercises", target: 5 },
  { id: "exercises_15", icon: "🗂️", title: "Polyvalent", desc: "15 exercices différents pratiqués", metric: "exercises", target: 15 },
  { id: "heavy_100", icon: "🏋️", title: "Club des 100kg", desc: "Soulever 100kg sur un exercice", metric: "maxWeight", target: 100 },
  { id: "programs_3", icon: "📋", title: "Toujours en évolution", desc: "3 programmes générés", metric: "programs", target: 3 },
];

router.get("/", async (req, res) => {
  try {
    const uid = req.session.userId;
    const [daysR, exR, maxR, progR] = await Promise.all([
      pool.query("SELECT DISTINCT performed_at::date AS day FROM logs WHERE user_id=$1 ORDER BY day DESC", [uid]),
      pool.query("SELECT COUNT(DISTINCT exercise_name) AS n FROM logs WHERE user_id=$1", [uid]),
      pool.query("SELECT MAX(weight) AS w FROM logs WHERE user_id=$1", [uid]),
      pool.query("SELECT COUNT(*) AS n FROM programs WHERE user_id=$1", [uid]),
    ]);

    const days = daysR.rows.map(r => dayStr(r.day));
    const metrics = {
      sessions: days.length,
      streak: bestStreakFromDays(days),
      exercises: parseInt(exR.rows[0].n, 10) || 0,
      maxWeight: Number(maxR.rows[0].w) || 0,
      programs: parseInt(progR.rows[0].n, 10) || 0,
    };

    const badges = BADGE_DEFS.map(b => {
      const current = metrics[b.metric];
      return {
        ...b,
        current: Math.min(current, b.target),
        unlocked: current >= b.target,
      };
    });

    res.json({ badges, unlockedCount: badges.filter(b => b.unlocked).length, total: badges.length });
  } catch (err) {
    console.error("Erreur GET /badges :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
