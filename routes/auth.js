const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { stripHtml } = require("../middleware/sanitize");
const { generateUsername } = require("../services/username");
const { sendWelcomeEmail } = require("../services/email");

const router = express.Router();

// Limite les tentatives par IP sur les routes sensibles a la force brute
// (connexion, inscription, changement de mot de passe).
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessaie dans une minute." },
});

// Limite plus stricte specifiquement sur la connexion (brute force sur mot
// de passe) : 5 tentatives/minute par IP au lieu des 10 partagees avec
// inscription/autres routes sensibles.
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives de connexion. Réessaie dans une minute." },
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { email, password, name, ref, aff } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, mot de passe et nom sont requis." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit faire au moins 6 caracteres." });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Un compte existe deja avec cet email." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const cleanName = stripHtml(name);
    const username = await generateUsername(cleanName);

    // Affiliation coach (fonctionnalite 8) : lie le compte au coach dont le
    // lien d'affiliation (?aff=CODE) a ete utilise, pour credit de commission
    // au premier passage Premium (et chaque renouvellement mensuel ensuite).
    let referredByCoachId = null;
    if (aff) {
      const affR = await pool.query(
        "SELECT coach_id FROM coach_affiliations WHERE affiliate_code=$1", [String(aff).toUpperCase()]
      );
      referredByCoachId = affR.rows[0]?.coach_id || null;
    }

    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name, username, referred_by_coach_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name",
      [email.toLowerCase().trim(), passwordHash, cleanName, username, referredByCoachId]
    );

    const user = result.rows[0];
    req.session.userId = user.id;

    sendWelcomeEmail(user.email, user.name).catch(e => console.error("Erreur email bienvenue :", e));

    // Parrainage (fonctionnalité 5) : lie le nouveau compte à son parrain si
    // ?ref=USERNAME était présent. Echec silencieux (referrer inconnu) : ce
    // n'est pas bloquant pour l'inscription.
    if (ref) {
      pool.query(
        `INSERT INTO referrals (referrer_id, referred_id)
         SELECT id, $2 FROM users WHERE username=$1 AND id != $2
         ON CONFLICT (referred_id) DO NOTHING`,
        [ref, user.id]
      ).catch(e => console.error("Erreur creation referral :", e));
    }

    res.status(201).json({ user });
  } catch (err) {
    console.error("Erreur /register :", err);
    res.status(500).json({ error: "Erreur serveur lors de l'inscription." });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis." });
    }

    const result = await pool.query(
      "SELECT id, email, name, password_hash, banned FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }
    if (user.banned) {
      return res.status(403).json({ error: "Ce compte a ete banni." });
    }

    req.session.userId = user.id;
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error("Erreur /login :", err);
    res.status(500).json({ error: "Erreur serveur lors de la connexion." });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non connecte." });
  }
  const result = await pool.query("SELECT id, email, name, role, avatar_url FROM users WHERE id = $1", [
    req.session.userId,
  ]);
  if (!result.rows[0]) {
    return res.status(401).json({ error: "Non connecte." });
  }
  res.json({ user: result.rows[0] });
});

router.post("/change-password", requireAuth, authLimiter, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Ancien et nouveau mot de passe requis." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit faire au moins 6 caracteres." });
    }

    const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.session.userId]);
    const user = result.rows[0];
    if (!user || !user.password_hash || !(await bcrypt.compare(oldPassword, user.password_hash))) {
      return res.status(401).json({ error: "Ancien mot de passe incorrect." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, req.session.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur /change-password :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.delete("/account", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.session.userId]);
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  } catch (err) {
    console.error("Erreur DELETE /account :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
