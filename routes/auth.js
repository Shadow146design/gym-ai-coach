const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

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
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email.toLowerCase().trim(), passwordHash, name.trim()]
    );

    const user = result.rows[0];
    req.session.userId = user.id;
    res.status(201).json({ user });
  } catch (err) {
    console.error("Erreur /register :", err);
    res.status(500).json({ error: "Erreur serveur lors de l'inscription." });
  }
});

router.post("/login", async (req, res) => {
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

router.post("/change-password", requireAuth, async (req, res) => {
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
