const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendPushToUser, pushConfigured } = require("../services/push");

const router = express.Router();

// Cle publique VAPID, necessaire cote client pour pushManager.subscribe()
router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null, configured: pushConfigured });
});

router.use(requireAuth);

// Enregistre (ou met a jour) l'abonnement push de l'appareil courant.
router.post("/subscribe", async (req, res) => {
  try {
    const sub = req.body?.subscription;
    if (!sub?.endpoint) return res.status(400).json({ error: "Abonnement invalide." });

    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, subscription) VALUES ($1,$2,$3)
       ON CONFLICT (endpoint) DO UPDATE SET user_id=$1, subscription=$3`,
      [req.session.userId, sub.endpoint, sub]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Erreur POST /push/subscribe :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Desinscrit l'appareil courant (ex: l'utilisateur desactive les notifs).
router.post("/unsubscribe", async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    if (!endpoint) return res.status(400).json({ error: "Endpoint manquant." });
    await pool.query("DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2", [endpoint, req.session.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur POST /push/unsubscribe :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Envoi manuel/test — reserve a l'admin (diffusion a un utilisateur precis ou a tous).
router.post("/send", requireRole("admin"), async (req, res) => {
  try {
    const { userId, title, body, url, broadcast } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: "title et body requis." });

    if (broadcast) {
      const users = await pool.query("SELECT DISTINCT user_id FROM push_subscriptions");
      await Promise.all(users.rows.map(u => sendPushToUser(u.user_id, { title, body, url })));
      return res.json({ ok: true, sentTo: users.rows.length });
    }

    if (!userId) return res.status(400).json({ error: "userId requis (ou broadcast:true)." });
    await sendPushToUser(userId, { title, body, url });
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur POST /push/send :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
