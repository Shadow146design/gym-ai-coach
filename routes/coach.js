const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireRole } = require("../middleware/auth");
const { generateProgram } = require("../services/aiCoach");
const router = express.Router();

// ── Coaches publics ────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT u.id, u.name, u.avatar_url, cp.bio, cp.specialties, cp.price_monthly, cp.available,
        (SELECT COUNT(*) FROM coach_assignments ca WHERE ca.coach_id=u.id AND ca.status='active') AS client_count
      FROM users u JOIN coach_profiles cp ON cp.user_id=u.id
      WHERE u.role IN ('coach','admin') AND cp.available=TRUE
      ORDER BY u.name`);
    res.json({ coaches: r.rows });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Demande de coach ───────────────────────────────────────
router.post("/:id/request", requireAuth, async (req, res) => {
  try {
    const coachId = parseInt(req.params.id);
    const clientId = req.session.userId;
    if (coachId === clientId) return res.status(400).json({ error: "Tu ne peux pas être ton propre coach." });
    const existing = await pool.query(
      "SELECT id FROM coach_assignments WHERE client_id=$1 AND status IN ('pending','active')", [clientId]);
    if (existing.rows.length) return res.status(409).json({ error: "Demande déjà envoyée ou coach déjà actif." });
    await pool.query("INSERT INTO coach_assignments (coach_id, client_id) VALUES ($1,$2)", [coachId, clientId]);
    res.status(201).json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Mon coach actif ────────────────────────────────────────
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT ca.id, ca.status, u.id AS coach_id, u.name, u.avatar_url, cp.bio, cp.specialties
      FROM coach_assignments ca
      JOIN users u ON u.id=ca.coach_id
      JOIN coach_profiles cp ON cp.user_id=u.id
      WHERE ca.client_id=$1 AND ca.status IN ('pending','active')
      ORDER BY ca.created_at DESC LIMIT 1`, [req.session.userId]);
    res.json({ assignment: r.rows[0] || null });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ═══ DASHBOARD COACH ══════════════════════════════════════
// Mes clients
router.get("/dashboard/clients", requireRole("coach","admin"), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT u.id, u.name, u.email, u.avatar_url, ca.id AS assignment_id, ca.status, ca.created_at,
        (SELECT COUNT(*) FROM logs WHERE user_id=u.id) AS total_logs,
        (SELECT MAX(performed_at) FROM logs WHERE user_id=u.id) AS last_session
      FROM coach_assignments ca JOIN users u ON u.id=ca.client_id
      WHERE ca.coach_id=$1 ORDER BY ca.status, u.name`, [req.session.userId]);
    res.json({ clients: r.rows });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Accepter / refuser
router.post("/dashboard/assignments/:id/:action", requireRole("coach","admin"), async (req, res) => {
  try {
    const status = req.params.action === "accept" ? "active" : "ended";
    await pool.query("UPDATE coach_assignments SET status=$1 WHERE id=$2 AND coach_id=$3",
      [status, req.params.id, req.session.userId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Stats d'un client
router.get("/dashboard/clients/:clientId/stats", requireRole("coach","admin"), async (req, res) => {
  try {
    const { clientId } = req.params;
    const [userR, progR, logsR, recsR] = await Promise.all([
      pool.query("SELECT id,name,email,avatar_url,weight_kg,height_cm,age,gender,activity_level FROM users WHERE id=$1", [clientId]),
      pool.query("SELECT title,content,created_at FROM programs WHERE user_id=$1 AND is_active=TRUE LIMIT 1", [clientId]),
      pool.query("SELECT COUNT(DISTINCT performed_at::date) AS sessions, SUM(weight*reps*sets) AS volume FROM logs WHERE user_id=$1", [clientId]),
      pool.query("SELECT exercise_name, MAX(weight) AS max_weight FROM logs WHERE user_id=$1 GROUP BY exercise_name ORDER BY max_weight DESC LIMIT 6", [clientId]),
    ]);
    res.json({ client: userR.rows[0], program: progR.rows[0]||null, stats: logsR.rows[0], records: recsR.rows });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Logs d'un client
router.get("/dashboard/clients/:clientId/logs", requireRole("coach","admin"), async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM logs WHERE user_id=$1 ORDER BY performed_at DESC LIMIT 50", [req.params.clientId]);
    res.json({ logs: r.rows });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Coach génère un programme pour un client
router.post("/dashboard/clients/:clientId/program", requireRole("coach","admin"), async (req, res) => {
  try {
    const { clientId } = req.params;
    const answers = { ...req.body };
    const prof = await pool.query("SELECT weight_kg,height_cm,age,gender,activity_level FROM users WHERE id=$1", [clientId]);
    if (prof.rows[0]?.weight_kg) Object.assign(answers, prof.rows[0]);
    const program = await generateProgram(answers);
    await pool.query("UPDATE programs SET is_active=FALSE WHERE user_id=$1", [clientId]);
    const r = await pool.query(
      "INSERT INTO programs (user_id,created_by,title,questionnaire,content,is_active) VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING id,title",
      [clientId, req.session.userId, program.title, JSON.stringify(answers), JSON.stringify(program)]);
    res.status(201).json({ program: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Profil coach
router.put("/profile", requireRole("coach","admin"), async (req, res) => {
  try {
    const { bio, specialties, price_monthly, available } = req.body;
    await pool.query(`
      INSERT INTO coach_profiles (user_id,bio,specialties,price_monthly,available) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (user_id) DO UPDATE SET bio=$2,specialties=$3,price_monthly=$4,available=$5`,
      [req.session.userId, bio, specialties||[], price_monthly||0, available!==false]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

router.get("/profile", requireRole("coach","admin"), async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM coach_profiles WHERE user_id=$1", [req.session.userId]);
    res.json({ profile: r.rows[0] || null });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

module.exports = router;
