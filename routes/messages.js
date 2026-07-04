const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();
router.use(requireAuth);

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
