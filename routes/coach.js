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
        (SELECT COUNT(*) FROM coach_assignments ca WHERE ca.coach_id=u.id AND ca.status='active') AS client_count,
        (SELECT ROUND(AVG(rating),1) FROM coach_reviews WHERE coach_id=u.id) AS avg_rating,
        (SELECT COUNT(*) FROM coach_reviews WHERE coach_id=u.id) AS review_count
      FROM users u JOIN coach_profiles cp ON cp.user_id=u.id
      WHERE u.role IN ('coach','admin') AND cp.available=TRUE
      ORDER BY u.name`);
    res.json({ coaches: r.rows.map(c => ({ ...c, avg_rating: c.avg_rating ? Number(c.avg_rating) : null, review_count: parseInt(c.review_count, 10) })) });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Notation des coaches (fonctionnalite 6) ───────────────
// Liste publique des avis + moyenne.
router.get("/:id/reviews", async (req, res) => {
  try {
    const coachId = parseInt(req.params.id);
    const [reviewsR, aggR] = await Promise.all([
      pool.query(
        `SELECT cr.id, cr.rating, cr.comment, cr.created_at, u.name AS client_name
         FROM coach_reviews cr JOIN users u ON u.id=cr.client_id
         WHERE cr.coach_id=$1 ORDER BY cr.created_at DESC`,
        [coachId]
      ),
      pool.query("SELECT ROUND(AVG(rating),1) AS avg, COUNT(*) AS n FROM coach_reviews WHERE coach_id=$1", [coachId]),
    ]);
    res.json({
      reviews: reviewsR.rows,
      avgRating: aggR.rows[0].avg ? Number(aggR.rows[0].avg) : null,
      count: parseInt(aggR.rows[0].n, 10) || 0,
    });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// L'avis (eventuel) du client connecte pour ce coach, pour savoir s'il a
// deja note (et pre-remplir le formulaire d'edition).
router.get("/:id/my-review", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT rating, comment FROM coach_reviews WHERE coach_id=$1 AND client_id=$2",
      [req.params.id, req.session.userId]
    );
    res.json({ review: r.rows[0] || null });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Poser / mettre a jour son avis. Reserve aux clients ayant (ou ayant eu)
// une relation avec ce coach.
router.post("/:id/review", requireAuth, async (req, res) => {
  try {
    const coachId = parseInt(req.params.id);
    const clientId = req.session.userId;
    const rating = parseInt(req.body.rating, 10);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "La note doit être un entier entre 1 et 5." });
    }
    const comment = (req.body.comment || "").toString().trim().slice(0, 500) || null;

    const assignR = await pool.query(
      "SELECT id FROM coach_assignments WHERE coach_id=$1 AND client_id=$2 AND status IN ('active','ended')",
      [coachId, clientId]
    );
    if (!assignR.rows.length) return res.status(403).json({ error: "Tu dois avoir été suivi par ce coach pour le noter." });

    await pool.query(
      `INSERT INTO coach_reviews (coach_id, client_id, rating, comment) VALUES ($1,$2,$3,$4)
       ON CONFLICT (coach_id, client_id) DO UPDATE SET rating=$3, comment=$4`,
      [coachId, clientId, rating, comment]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Suppression par un admin (moderation)
router.delete("/reviews/:reviewId", requireRole("admin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM coach_reviews WHERE id=$1", [req.params.reviewId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Demande de coach ───────────────────────────────────────
router.post("/:id/request", requireAuth, async (req, res) => {
  try {
    const coachId = parseInt(req.params.id);
    const clientId = req.session.userId;
    if (coachId === clientId) return res.status(400).json({ error: "Tu ne peux pas être ton propre coach." });

    // Les coaches payants (price_monthly > 0) sont reserves aux abonnes Premium.
    // La plateforme prendra 20% de commission sur ces tarifs coach (via Stripe
    // Connect, a implementer plus tard) ; Premium reste un abonnement plateforme
    // classique, distinct du paiement du coach lui-meme.
    const coachR = await pool.query("SELECT price_monthly FROM coach_profiles WHERE user_id=$1", [coachId]);
    if (!coachR.rows.length) return res.status(404).json({ error: "Coach introuvable." });
    if (Number(coachR.rows[0].price_monthly) > 0) {
      const userR = await pool.query("SELECT role FROM users WHERE id=$1", [clientId]);
      if (!["premium", "admin"].includes(userR.rows[0]?.role)) {
        return res.status(403).json({ error: "Abonnement Premium requis pour accéder aux coaches payants." });
      }
    }

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
      SELECT ca.id, ca.status, ca.created_at AS since, u.id AS coach_id, u.name, u.avatar_url, cp.bio, cp.specialties
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
    const userR = await pool.query(
      "SELECT id,name,email,avatar_url,weight_kg,height_cm,age,gender,activity_level,profile_visible_to_coaches,stats_visible_to_coaches FROM users WHERE id=$1",
      [clientId]
    );
    const client = userR.rows[0];
    if (!client) return res.status(404).json({ error: "Client introuvable." });

    if (!client.profile_visible_to_coaches) {
      return res.json({ client: { id: client.id, name: client.name }, hidden: true, program: null, stats: null, records: [] });
    }

    const [progR, logsR, recsR] = await Promise.all([
      pool.query("SELECT title,content,created_at FROM programs WHERE user_id=$1 AND is_active=TRUE LIMIT 1", [clientId]),
      client.stats_visible_to_coaches
        ? pool.query("SELECT COUNT(DISTINCT performed_at::date) AS sessions, SUM(weight*reps*sets) AS volume FROM logs WHERE user_id=$1", [clientId])
        : Promise.resolve({ rows: [null] }),
      client.stats_visible_to_coaches
        ? pool.query("SELECT exercise_name, MAX(weight) AS max_weight FROM logs WHERE user_id=$1 GROUP BY exercise_name ORDER BY max_weight DESC LIMIT 6", [clientId])
        : Promise.resolve({ rows: [] }),
    ]);
    res.json({
      client, program: progR.rows[0]||null,
      stats: client.stats_visible_to_coaches ? logsR.rows[0] : null,
      records: recsR.rows,
      statsHidden: !client.stats_visible_to_coaches,
    });
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

// Photos de progression d'un client (fonctionnalite 9) : visibles par son
// coach, sauf si le client a desactive la visibilite de son profil.
router.get("/dashboard/clients/:clientId/photos", requireRole("coach","admin"), async (req, res) => {
  try {
    const visR = await pool.query("SELECT profile_visible_to_coaches FROM users WHERE id=$1", [req.params.clientId]);
    if (!visR.rows[0]?.profile_visible_to_coaches) return res.json({ photos: [], hidden: true });

    const r = await pool.query(
      "SELECT id, photo_data, caption, created_at FROM progress_photos WHERE user_id=$1 ORDER BY created_at DESC",
      [req.params.clientId]
    );
    res.json({ photos: r.rows, hidden: false });
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
