const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { ensureUsername } = require("../services/username");

const router = express.Router();
router.use(requireAuth);

// Applique la recompense de parrainage : 30 jours Premium offerts au
// parrain quand son filleul passe Premium (fonctionnalite 5). Compte
// gratuit -> devient premium avec expiration ; deja premium via parrainage
// (premium_until deja pose) -> +30 jours ; coach/admin/premium payant
// (premium_until NULL) -> deja acces complet, rien a faire cote role.
async function grantReferralReward(referrerId, referralId) {
  const r = await pool.query("SELECT role, premium_until FROM users WHERE id=$1", [referrerId]);
  const u = r.rows[0];
  if (!u) return;

  if (u.role === "user") {
    await pool.query("UPDATE users SET role='premium', premium_until=NOW() + INTERVAL '30 days' WHERE id=$1", [referrerId]);
  } else if (u.role === "premium" && u.premium_until) {
    await pool.query("UPDATE users SET premium_until = premium_until + INTERVAL '30 days' WHERE id=$1", [referrerId]);
  }

  await pool.query("UPDATE referrals SET rewarded_at=NOW() WHERE id=$1", [referralId]);
  await pool.query(
    `INSERT INTO notifications (user_id, type, message, link) VALUES ($1,'referral_reward',$2,'/referral.html')`,
    [referrerId, "🎁 Un filleul est passé Premium : tu gagnes 30 jours Premium offerts !"]
  ).catch(e => console.error("Erreur notif parrainage :", e));
}

// GET /api/referral/stats
router.get("/stats", async (req, res) => {
  try {
    const uid = req.session.userId;
    const username = await ensureUsername(uid);
    const [countR, rewardedR, userR] = await Promise.all([
      pool.query("SELECT COUNT(*) AS n FROM referrals WHERE referrer_id=$1", [uid]),
      pool.query("SELECT COUNT(*) AS n FROM referrals WHERE referrer_id=$1 AND rewarded_at IS NOT NULL", [uid]),
      pool.query("SELECT role, premium_until FROM users WHERE id=$1", [uid]),
    ]);

    res.json({
      referralLink: `${req.protocol}://${req.get("host")}/?ref=${username}`,
      totalReferred: parseInt(countR.rows[0].n, 10) || 0,
      totalRewarded: parseInt(rewardedR.rows[0].n, 10) || 0,
      role: userR.rows[0]?.role,
      premiumUntil: userR.rows[0]?.premium_until,
    });
  } catch (err) {
    console.error("Erreur GET /referral/stats :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/referral/claim — filet de securite : applique les recompenses
// en attente pour les filleuls deja premium (le webhook Stripe le fait deja
// automatiquement, cette route rattrape le cas ou il aurait ete manque).
router.post("/claim", async (req, res) => {
  try {
    const uid = req.session.userId;
    const pendingR = await pool.query(
      `SELECT r.id, r.referrer_id FROM referrals r
       JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id=$1 AND r.rewarded_at IS NULL AND u.role IN ('premium','coach','admin')`,
      [uid]
    );
    for (const row of pendingR.rows) {
      await grantReferralReward(row.referrer_id, row.id);
    }
    res.json({ ok: true, rewarded: pendingR.rows.length });
  } catch (err) {
    console.error("Erreur POST /referral/claim :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
module.exports.grantReferralReward = grantReferralReward;
