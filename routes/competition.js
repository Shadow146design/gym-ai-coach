const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Lundi 00:00 (semaine courante) -> lundi suivant 00:00.
function weekBounds() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = lundi
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

// GET /api/competition/leaderboard — classement volume total de la semaine.
// Seuls les comptes premium/coach/admin "participent" (comptent dans le
// classement) ; les gratuits peuvent consulter mais ne sont pas classés.
router.get("/leaderboard", async (req, res) => {
  try {
    const { start, end } = weekBounds();

    const rankedR = await pool.query(
      `SELECT id, name, avatar_url, volume, sessions, RANK() OVER (ORDER BY volume DESC) AS rank
       FROM (
         SELECT u.id, u.name, u.avatar_url,
           COALESCE(SUM(l.weight * l.reps), 0) AS volume,
           COUNT(DISTINCT l.performed_at::date) AS sessions
         FROM users u
         JOIN logs l ON l.user_id = u.id AND l.performed_at >= $1 AND l.performed_at < $2
         WHERE u.role IN ('premium','coach','admin')
         GROUP BY u.id
       ) sub
       ORDER BY volume DESC`,
      [start, end]
    );

    const top10 = rankedR.rows.slice(0, 10).map(r => ({
      id: r.id, name: r.name, avatar_url: r.avatar_url,
      volume: Number(r.volume), sessions: Number(r.sessions), rank: Number(r.rank),
    }));

    const meRow = rankedR.rows.find(r => r.id === req.session.userId);
    const roleR = await pool.query("SELECT role FROM users WHERE id=$1", [req.session.userId]);
    const isPremium = ["premium", "coach", "admin"].includes(roleR.rows[0]?.role);

    res.json({
      top10,
      yourRank: meRow ? Number(meRow.rank) : null,
      yourVolume: meRow ? Number(meRow.volume) : 0,
      isPremium,
      totalParticipants: rankedR.rows.length,
      resetAt: end.toISOString(),
    });
  } catch (err) {
    console.error("Erreur GET /competition/leaderboard :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
