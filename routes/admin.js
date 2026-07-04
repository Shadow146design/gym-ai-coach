const express = require("express");
const pool = require("../db/pool");
const { requireRole } = require("../middleware/auth");
const router = express.Router();
router.use(requireRole("admin"));

router.get("/users", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.banned, u.created_at,
        (SELECT COUNT(*) FROM logs WHERE user_id=u.id) AS logs_count,
        (SELECT MAX(performed_at) FROM logs WHERE user_id=u.id) AS last_session
      FROM users u ORDER BY u.created_at DESC`);
    res.json({ users: r.rows });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user","premium","coach","admin"].includes(role))
      return res.status(400).json({ error: "Rôle invalide." });
    await pool.query("UPDATE users SET role=$1 WHERE id=$2", [role, req.params.id]);
    if (role === "coach") {
      await pool.query(`INSERT INTO coach_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [req.params.id]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

router.get("/subscriptions", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.id, s.plan, s.status, s.stripe_subscription_id, s.created_at,
        u.id AS user_id, u.name, u.email
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC`);
    res.json({ subscriptions: r.rows });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

router.post("/users/:id/ban", async (req, res) => {
  try {
    const r = await pool.query(
      "UPDATE users SET banned = NOT banned WHERE id=$1 RETURNING banned",
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Utilisateur introuvable." });
    res.json({ ok: true, banned: r.rows[0].banned });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const r = await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: "Utilisateur introuvable." });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

router.post("/assign", async (req, res) => {
  try {
    const { coach_id, client_id } = req.body;
    await pool.query("UPDATE coach_assignments SET status='ended' WHERE client_id=$1", [client_id]);
    await pool.query("INSERT INTO coach_assignments (coach_id,client_id,status) VALUES ($1,$2,'active')", [coach_id, client_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

router.get("/stats", async (req, res) => {
  try {
    const [usersR, sessR, coachR, msgR] = await Promise.all([
      pool.query("SELECT role, COUNT(*) FROM users GROUP BY role"),
      pool.query("SELECT COUNT(DISTINCT (user_id, performed_at::date)) AS total FROM logs"),
      pool.query("SELECT COUNT(*) FROM coach_assignments WHERE status='active'"),
      pool.query("SELECT COUNT(*) FROM messages WHERE created_at > NOW()-INTERVAL '7 days'"),
    ]);
    res.json({ roles: usersR.rows, sessions: sessR.rows[0].total, assignments: coachR.rows[0].count, messages7d: msgR.rows[0].count });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

module.exports = router;
