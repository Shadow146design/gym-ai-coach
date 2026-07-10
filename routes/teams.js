const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Alphabet sans caracteres ambigus (0/O, 1/I) pour un code facile a partager
// et retaper a l'oral ou depuis une photo d'ecran.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genTeamCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

// Lundi 00:00 de la semaine courante, pour agreger le volume/défi hebdomadaire.
function currentWeekStart() {
  const d = new Date();
  const day = d.getDay(); // 0=dimanche
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Crée une équipe (l'utilisateur ne peut appartenir qu'à une seule équipe à la fois)
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Nom d'équipe requis." });

    const existing = await pool.query("SELECT team_id FROM team_members WHERE user_id=$1", [req.session.userId]);
    if (existing.rows.length) return res.status(400).json({ error: "Tu fais déjà partie d'une équipe." });

    let code;
    for (let i = 0; i < 10; i++) {
      code = genTeamCode();
      const dup = await pool.query("SELECT id FROM teams WHERE code=$1", [code]);
      if (!dup.rows.length) break;
    }

    const teamR = await pool.query(
      "INSERT INTO teams (name, code, creator_id) VALUES ($1,$2,$3) RETURNING *",
      [name.trim().slice(0, 60), code, req.session.userId]
    );
    const team = teamR.rows[0];
    await pool.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES ($1,$2,'creator')",
      [team.id, req.session.userId]
    );

    res.status(201).json({ team });
  } catch (err) {
    console.error("Erreur POST /teams :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Rejoint une équipe avec son code
router.post("/join", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: "Code requis." });

    const existing = await pool.query("SELECT team_id FROM team_members WHERE user_id=$1", [req.session.userId]);
    if (existing.rows.length) return res.status(400).json({ error: "Tu fais déjà partie d'une équipe." });

    const teamR = await pool.query("SELECT * FROM teams WHERE code=$1", [code.trim().toUpperCase()]);
    if (!teamR.rows.length) return res.status(404).json({ error: "Code d'équipe invalide." });
    const team = teamR.rows[0];

    await pool.query(
      "INSERT INTO team_members (team_id, user_id, role) VALUES ($1,$2,'member')",
      [team.id, req.session.userId]
    );
    res.status(201).json({ team });
  } catch (err) {
    console.error("Erreur POST /teams/join :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Équipe de l'utilisateur connecté (ou null)
router.get("/mine", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT t.* FROM teams t JOIN team_members tm ON tm.team_id=t.id WHERE tm.user_id=$1`,
      [req.session.userId]
    );
    res.json({ team: r.rows[0] || null });
  } catch (err) {
    console.error("Erreur GET /teams/mine :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Classement hebdomadaire + défi d'équipe (créé à la volée, 10 tonnes par défaut)
router.get("/:id/leaderboard", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const membership = await pool.query(
      "SELECT id FROM team_members WHERE team_id=$1 AND user_id=$2", [teamId, req.session.userId]
    );
    if (!membership.rows.length) return res.status(403).json({ error: "Tu ne fais pas partie de cette équipe." });

    const ws = currentWeekStart();

    const membersR = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, tm.role,
              COALESCE((SELECT SUM(l.weight*l.reps*l.sets) FROM logs l WHERE l.user_id=u.id AND l.performed_at >= $2), 0) AS week_volume
       FROM team_members tm JOIN users u ON u.id=tm.user_id
       WHERE tm.team_id=$1
       ORDER BY week_volume DESC`,
      [teamId, ws]
    );
    const members = membersR.rows.map(m => ({ ...m, week_volume: Number(m.week_volume) }));
    const totalVolume = members.reduce((a, m) => a + m.week_volume, 0);

    let challengeR = await pool.query(
      "SELECT * FROM team_challenges WHERE team_id=$1 AND week_start=$2", [teamId, ws]
    );
    if (!challengeR.rows.length) {
      challengeR = await pool.query(
        `INSERT INTO team_challenges (team_id, goal_kg, week_start) VALUES ($1,10000,$2)
         ON CONFLICT (team_id, week_start) DO UPDATE SET goal_kg=team_challenges.goal_kg
         RETURNING *`,
        [teamId, ws]
      );
    }
    const challenge = challengeR.rows[0];

    res.json({
      members,
      totalVolume,
      challenge: { goalKg: Number(challenge.goal_kg), progressKg: totalVolume, weekStart: ws },
    });
  } catch (err) {
    console.error("Erreur GET /teams/:id/leaderboard :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Chat d'équipe (visible par tous les membres)
router.get("/:id/messages", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const membership = await pool.query(
      "SELECT id FROM team_members WHERE team_id=$1 AND user_id=$2", [teamId, req.session.userId]
    );
    if (!membership.rows.length) return res.status(403).json({ error: "Tu ne fais pas partie de cette équipe." });

    const r = await pool.query(
      `SELECT tm.id, tm.content, tm.created_at, tm.user_id, u.name AS from_name, u.avatar_url AS from_avatar
       FROM team_messages tm JOIN users u ON u.id=tm.user_id
       WHERE tm.team_id=$1 ORDER BY tm.created_at ASC LIMIT 200`,
      [teamId]
    );
    res.json({ messages: r.rows });
  } catch (err) {
    console.error("Erreur GET /teams/:id/messages :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/:id/messages", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Message vide." });

    const membership = await pool.query(
      "SELECT id FROM team_members WHERE team_id=$1 AND user_id=$2", [teamId, req.session.userId]
    );
    if (!membership.rows.length) return res.status(403).json({ error: "Tu ne fais pas partie de cette équipe." });

    const r = await pool.query(
      "INSERT INTO team_messages (team_id, user_id, content) VALUES ($1,$2,$3) RETURNING *",
      [teamId, req.session.userId, content.trim().slice(0, 1000)]
    );
    res.status(201).json({ message: r.rows[0] });
  } catch (err) {
    console.error("Erreur POST /teams/:id/messages :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
