const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

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

function currentStreakFromDays(days) {
  if (!days.length) return 0;
  const today = dayStr(new Date());
  const yesterday = dayStr(new Date(Date.now() - 86400000));
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i - 1]) - new Date(days[i])) / 86400000;
    if (diff === 1) streak++; else break;
  }
  return streak;
}

// GET /api/users/profile/:username — profil public en lecture seule
// (fonctionnalite 7). Ne renvoie rien si le compte n'existe pas ou si
// l'utilisateur n'a pas active "Profil public" dans ses parametres.
router.get("/profile/:username", async (req, res) => {
  try {
    const userR = await pool.query(
      "SELECT id, name, avatar_url, role, public_profile, created_at FROM users WHERE username=$1",
      [req.params.username]
    );
    const user = userR.rows[0];
    if (!user || !user.public_profile) {
      return res.status(404).json({ error: "Profil introuvable ou privé." });
    }

    const uid = user.id;
    const [daysR, recordsR, badgesR, progR, certR] = await Promise.all([
      pool.query("SELECT DISTINCT performed_at::date AS day FROM logs WHERE user_id=$1 ORDER BY day DESC", [uid]),
      pool.query(
        `SELECT exercise_name, MAX(weight) AS max_weight FROM logs WHERE user_id=$1
         GROUP BY exercise_name ORDER BY max_weight DESC LIMIT 5`,
        [uid]
      ),
      pool.query("SELECT COUNT(*) AS n FROM user_badges WHERE user_id=$1", [uid]),
      pool.query(
        "SELECT title FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
        [uid]
      ),
      pool.query("SELECT unlocked_at FROM user_badges WHERE user_id=$1 AND badge_id='certified_athlete'", [uid]),
    ]);

    const days = daysR.rows.map(r => dayStr(r.day));

    res.json({
      user: {
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role,
        memberSince: dayStr(user.created_at),
      },
      stats: {
        totalSessions: days.length,
        streak: currentStreakFromDays(days),
        bestStreak: bestStreakFromDays(days),
      },
      topRecords: recordsR.rows.map(r => ({ exercise_name: r.exercise_name, max_weight: Number(r.max_weight) })),
      badgeCount: parseInt(badgesR.rows[0]?.n, 10) || 0,
      activeProgramTitle: progR.rows[0]?.title || null,
      certifiedAt: certR.rows[0]?.unlocked_at ? dayStr(certR.rows[0].unlocked_at) : null,
    });
  } catch (err) {
    console.error("Erreur GET /users/profile/:username :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
