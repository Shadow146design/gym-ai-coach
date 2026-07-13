const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendSupportTicketEmail } = require("../services/email");
const router = express.Router();
router.use(requireAuth);

const TICKET_TYPES = ["bug", "program", "payment", "coach", "suggestion", "other"];

router.post("/ticket", async (req, res) => {
  try {
    const { type, description, pageUrl, includeAccountInfo } = req.body;
    if (!TICKET_TYPES.includes(type)) return res.status(400).json({ error: "Type de problème invalide." });
    if (!description || description.trim().length < 20)
      return res.status(400).json({ error: "La description doit contenir au moins 20 caractères." });

    const r = await pool.query(
      `INSERT INTO support_tickets (user_id, type, description, page_url) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.session.userId, type, description.trim(), pageUrl || null]
    );
    const ticket = r.rows[0];

    let user = null;
    if (includeAccountInfo !== false) {
      const u = await pool.query("SELECT name, email FROM users WHERE id=$1", [req.session.userId]);
      user = u.rows[0] || null;
    }
    sendSupportTicketEmail(ticket, user).catch(e => console.error("Erreur envoi email ticket support :", e));

    res.status(201).json({ ticket });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

router.get("/tickets", requireRole("admin"), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT t.*, u.name AS user_name, u.email AS user_email
      FROM support_tickets t JOIN users u ON u.id = t.user_id
      ORDER BY (t.status = 'open') DESC, t.created_at DESC`);
    res.json({ tickets: r.rows });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

router.put("/tickets/:id/resolve", requireRole("admin"), async (req, res) => {
  try {
    const r = await pool.query(
      "UPDATE support_tickets SET status='resolved', resolved_at=NOW() WHERE id=$1 RETURNING *",
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Ticket introuvable." });
    res.json({ ticket: r.rows[0] });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

module.exports = router;
