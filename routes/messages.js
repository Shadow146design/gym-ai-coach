const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { sendMessageNotification } = require("../services/email");
const router = express.Router();
router.use(requireAuth);

const MESSAGE_EMAIL_COOLDOWN_MS = 15 * 60 * 1000;

// Notifie le destinataire par email (fonctionnalite : notification email
// nouveau message), sauf s'il a desactive ces notifications ou si un email
// a deja ete envoye pour ce couple expediteur/destinataire il y a -15min
// (evite le spam sur une conversation active). La table rate_limits sert de
// marqueur "deja envoye", meme pattern que les rappels d'inactivite (server.js).
async function notifyNewMessageByEmail(fromId, toId) {
  try {
    const recipientR = await pool.query(
      "SELECT email, name, role, notify_email_messages FROM users WHERE id=$1", [toId]
    );
    const recipient = recipientR.rows[0];
    console.log("Destinataire role:", recipient?.role, "email:", recipient?.email);
    if (!recipient) {
      console.log(`Notification email annulée : destinataire ${toId} introuvable en base.`);
      return;
    }
    if (!recipient.email) {
      console.log(`Notification email annulée : destinataire ${toId} (${recipient.role}) n'a pas d'email en base.`);
      return;
    }
    if (recipient.notify_email_messages === false) {
      console.log(`Notification email annulée : ${recipient.email} a désactivé ces notifications.`);
      return;
    }

    const action = `msg_email_${fromId}`;
    const rl = await pool.query(
      "SELECT reset_at FROM rate_limits WHERE user_id=$1 AND action=$2", [toId, action]
    );
    if (rl.rows[0] && new Date(rl.rows[0].reset_at) > new Date()) {
      console.log(`Notification email annulée : cooldown actif pour ${recipient.email} (expéditeur ${fromId}) jusqu'à ${rl.rows[0].reset_at}.`);
      return;
    }

    const senderR = await pool.query("SELECT name FROM users WHERE id=$1", [fromId]);
    const senderName = senderR.rows[0]?.name || "Quelqu'un";

    const contentR = await pool.query(
      "SELECT content FROM messages WHERE from_id=$1 AND to_id=$2 ORDER BY created_at DESC LIMIT 1",
      [fromId, toId]
    );
    const preview = contentR.rows[0]?.content || "";

    console.log("Envoi email notification...");
    const result = await sendMessageNotification(
      recipient.email, recipient.name, senderName, preview,
      `${process.env.APP_URL || "https://gym-ai-coach-1wls.onrender.com"}/messages.html`
    );
    console.log("Résultat:", JSON.stringify(result));
    if (result?.error) {
      console.error(`Échec envoi notification email à ${recipient.email} :`, result.error);
    }

    await pool.query(
      `INSERT INTO rate_limits (user_id, action, count, reset_at) VALUES ($1,$2,1,$3)
       ON CONFLICT (user_id, action) DO UPDATE SET count=1, reset_at=$3`,
      [toId, action, new Date(Date.now() + MESSAGE_EMAIL_COOLDOWN_MS)]
    );
  } catch (e) { console.error("Erreur notification email message :", e); }
}

// Conversations (liste)
router.get("/conversations", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT DISTINCT ON (other_id) other_id, other_name, other_avatar, last_msg, last_at, unread FROM (
        SELECT
          CASE WHEN from_id=$1 THEN to_id ELSE from_id END AS other_id,
          CASE WHEN from_id=$1 THEN u2.name ELSE u1.name END AS other_name,
          CASE WHEN from_id=$1 THEN u2.avatar_url ELSE u1.avatar_url END AS other_avatar,
          m.content AS last_msg, m.created_at AS last_at,
          (SELECT COUNT(*) FROM messages WHERE to_id=$1 AND from_id=CASE WHEN m.from_id=$1 THEN m.to_id ELSE m.from_id END AND read_at IS NULL) AS unread
        FROM messages m
        JOIN users u1 ON u1.id=m.from_id
        JOIN users u2 ON u2.id=m.to_id
        WHERE from_id=$1 OR to_id=$1
        ORDER BY m.created_at DESC
      ) sub ORDER BY other_id, last_at DESC`,
      [req.session.userId]);
    res.json({ conversations: r.rows });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Messages avec une personne
router.get("/:withId", async (req, res) => {
  try {
    const uid = req.session.userId;
    const wid = parseInt(req.params.withId);
    const r = await pool.query(`
      SELECT m.*, u.name AS from_name, u.avatar_url AS from_avatar
      FROM messages m JOIN users u ON u.id=m.from_id
      WHERE (from_id=$1 AND to_id=$2) OR (from_id=$2 AND to_id=$1)
      ORDER BY created_at ASC LIMIT 200`, [uid, wid]);
    await pool.query("UPDATE messages SET read_at=NOW() WHERE to_id=$1 AND from_id=$2 AND read_at IS NULL", [uid, wid]);
    const other = await pool.query("SELECT id,name,avatar_url,role FROM users WHERE id=$1", [wid]);
    res.json({ messages: r.rows, other: other.rows[0] });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Envoyer
router.post("/:toId", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Message vide." });
    const r = await pool.query(
      "INSERT INTO messages (from_id,to_id,content) VALUES ($1,$2,$3) RETURNING *",
      [req.session.userId, req.params.toId, content.trim()]);

    pool.query("SELECT name, role FROM users WHERE id=$1", [req.session.userId]).then(senderRes => {
      const sender = senderRes.rows[0];
      const label = sender?.role === "coach" ? "Ton coach" : sender?.name || "Quelqu'un";
      return pool.query(
        `INSERT INTO notifications (user_id, type, message, link) VALUES ($1,'new_message',$2,'/messages.html')`,
        [req.params.toId, `💬 ${label} t'a envoyé un message.`]
      );
    }).catch(e => console.error("Erreur notif message :", e));

    notifyNewMessageByEmail(req.session.userId, parseInt(req.params.toId, 10));

    res.status(201).json({ message: r.rows[0] });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Non lus (badge)
router.get("/unread/count", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT COUNT(*) AS count FROM messages WHERE to_id=$1 AND read_at IS NULL", [req.session.userId]);
    res.json({ unread: parseInt(r.rows[0].count) });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

module.exports = router;
