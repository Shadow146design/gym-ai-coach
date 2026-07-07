const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { requirePremium } = require("../middleware/premium");

const router = express.Router();
router.use(requireAuth);
router.use(requirePremium);

const MAX_PHOTOS = 50;

router.get("/", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id, photo_data, caption, created_at FROM progress_photos WHERE user_id=$1 ORDER BY created_at DESC",
      [req.session.userId]
    );
    res.json({ photos: r.rows });
  } catch (err) {
    console.error("Erreur GET /photos :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { photo_data, caption } = req.body;
    if (!photo_data || !/^data:image\/(png|jpe?g|webp);base64,/.test(photo_data)) {
      return res.status(400).json({ error: "Image invalide." });
    }

    const countR = await pool.query("SELECT COUNT(*) AS n FROM progress_photos WHERE user_id=$1", [req.session.userId]);
    if (parseInt(countR.rows[0].n, 10) >= MAX_PHOTOS) {
      return res.status(400).json({ error: `Limite de ${MAX_PHOTOS} photos atteinte. Supprime une ancienne photo pour en ajouter une nouvelle.` });
    }

    const r = await pool.query(
      "INSERT INTO progress_photos (user_id, photo_data, caption) VALUES ($1,$2,$3) RETURNING id, photo_data, caption, created_at",
      [req.session.userId, photo_data, (caption || "").toString().trim().slice(0, 200) || null]
    );
    res.status(201).json({ photo: r.rows[0] });
  } catch (err) {
    console.error("Erreur POST /photos :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const r = await pool.query(
      "DELETE FROM progress_photos WHERE id=$1 AND user_id=$2 RETURNING id",
      [req.params.id, req.session.userId]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Photo introuvable." });
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur DELETE /photos/:id :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
