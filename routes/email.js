const express = require("express");
const pool = require("../db/pool");
const { requireRole } = require("../middleware/auth");
const { sendWelcomeEmail } = require("../services/email");

const router = express.Router();

// POST /api/email/test — admin seulement : envoie un email de test a
// l'admin connecte, pour verifier que RESEND_API_KEY est bien configuree.
router.post("/test", requireRole("admin"), async (req, res) => {
  try {
    const r = await pool.query("SELECT email, name FROM users WHERE id=$1", [req.session.userId]);
    const user = r.rows[0];
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    console.log("RESEND_API_KEY present:", !!process.env.RESEND_API_KEY);
    console.log("Sending to:", user.email);

    const result = await sendWelcomeEmail(user.email, user.name);
    console.log("Resend response:", JSON.stringify(result));

    if (result.skipped) return res.json({ ok: true, skipped: true, message: "RESEND_API_KEY non configurée : email non envoyé (voir logs serveur)." });
    if (result.error) return res.status(500).json({ error: result.error.message || result.error });
    res.json({ ok: true, sentTo: user.email });
  } catch (err) {
    console.error("Erreur POST /email/test :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
