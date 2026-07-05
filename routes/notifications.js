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

// Calcule les notifications "virtuelles" (non stockees) comme le streak en danger
async function computeVirtualNotifications(uid) {
  const virtual = [];
  const r = await pool.query(
    "SELECT DISTINCT performed_at::date AS day FROM logs WHERE user_id=$1 ORDER BY day DESC LIMIT 3",
    [uid]
  );
  const days = r.rows.map(x => dayStr(x.day));
  const today = dayStr(new Date());
  const yesterday = dayStr(new Date(Date.now() - 86400000));

  if (days.length && days[0] === yesterday && days[0] !== today) {
    virtual.push({
      id: "streak-danger",
      type: "streak_danger",
      message: "⚠️ Ton streak est en danger ! Entraîne-toi aujourd'hui pour le garder.",
      link: "/session.html",
      read_at: null,
      created_at: new Date().toISOString(),
    });
  }
  return virtual;
}

router.get("/", async (req, res) => {
  try {
    const uid = req.session.userId;
    const [stored, virtual] = await Promise.all([
      pool.query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20", [uid]),
      computeVirtualNotifications(uid),
    ]);
    res.json({ notifications: [...virtual, ...stored.rows] });
  } catch (err) {
    console.error("Erreur GET /notifications :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/unread/count", async (req, res) => {
  try {
    const uid = req.session.userId;
    const [stored, virtual] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS n FROM notifications WHERE user_id=$1 AND read_at IS NULL", [uid]),
      computeVirtualNotifications(uid),
    ]);
    res.json({ unread: stored.rows[0].n + virtual.length });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/:id/read", async (req, res) => {
  // Les notifications virtuelles (ex: "streak-danger") ne sont pas stockees en base.
  if (!/^\d+$/.test(req.params.id)) return res.json({ ok: true });
  try {
    await pool.query(
      "UPDATE notifications SET read_at=NOW() WHERE id=$1 AND user_id=$2",
      [req.params.id, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/read-all", async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL",
      [req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
