const express = require("express");
const rateLimit = require("express-rate-limit");
const { stripHtml } = require("../middleware/sanitize");
const { sendContactFormEmail } = require("../services/email");

const router = express.Router();

// Formulaire public (pas de compte requis) : rate limit dedie contre le spam.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de messages envoyés. Réessaie plus tard." },
});

router.post("/", contactLimiter, async (req, res) => {
  try {
    const name = stripHtml((req.body.name || "").toString()).slice(0, 100);
    const email = (req.body.email || "").toString().trim().slice(0, 200);
    const subject = stripHtml((req.body.subject || "").toString()).slice(0, 150);
    const message = stripHtml((req.body.message || "").toString()).slice(0, 2000);

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Adresse email invalide." });
    }

    await sendContactFormEmail({ name, email, subject, message });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Erreur POST /contact :", err);
    res.status(500).json({ error: "Erreur serveur, réessaie plus tard." });
  }
});

module.exports = router;
