const express = require("express");
const pool = require("../db/pool");
const { requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireRole("coach", "admin"));

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genAffiliateCode() {
  let code = "";
  for (let i = 0; i < 8; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

// Cree la ligne d'affiliation du coach a la volee si elle n'existe pas encore
// (premiere visite du dashboard ou du lien d'affiliation).
async function ensureAffiliation(coachId) {
  const existing = await pool.query("SELECT * FROM coach_affiliations WHERE coach_id=$1", [coachId]);
  if (existing.rows.length) return existing.rows[0];

  let code;
  for (let i = 0; i < 10; i++) {
    code = genAffiliateCode();
    const dup = await pool.query("SELECT id FROM coach_affiliations WHERE affiliate_code=$1", [code]);
    if (!dup.rows.length) break;
  }
  const r = await pool.query(
    "INSERT INTO coach_affiliations (coach_id, affiliate_code) VALUES ($1,$2) RETURNING *",
    [coachId, code]
  );
  return r.rows[0];
}

router.get("/my-link", async (req, res) => {
  try {
    const aff = await ensureAffiliation(req.session.userId);
    res.json({
      link: `${req.protocol}://${req.get("host")}/?aff=${aff.affiliate_code}`,
      code: aff.affiliate_code,
    });
  } catch (err) {
    console.error("Erreur GET /affiliations/my-link :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const aff = await ensureAffiliation(req.session.userId);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [monthR, historyR] = await Promise.all([
      pool.query(
        "SELECT COALESCE(SUM(commission),0) AS n FROM affiliate_conversions WHERE coach_id=$1 AND created_at >= $2",
        [req.session.userId, monthStart]
      ),
      pool.query(
        `SELECT ac.id, ac.amount, ac.commission, ac.created_at, u.name AS referred_name
         FROM affiliate_conversions ac JOIN users u ON u.id=ac.referred_user_id
         WHERE ac.coach_id=$1 ORDER BY ac.created_at DESC LIMIT 50`,
        [req.session.userId]
      ),
    ]);

    res.json({
      affiliateCode: aff.affiliate_code,
      link: `${req.protocol}://${req.get("host")}/?aff=${aff.affiliate_code}`,
      totalReferrals: aff.total_referrals,
      totalEarnings: Number(aff.total_earnings),
      earningsThisMonth: Number(monthR.rows[0].n),
      conversions: historyR.rows,
    });
  } catch (err) {
    console.error("Erreur GET /affiliations/stats :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Credite la commission du coach affilie apres un paiement Premium reussi
// (fonctionnalite 8). Appelee depuis le webhook Stripe sur chaque paiement
// mensuel — commission=20% de chaque paiement, total_referrals n'est
// incremente qu'a la toute premiere conversion de ce filleul (les paiements
// suivants du meme mois/utilisateur alimentent uniquement total_earnings).
async function creditCoachAffiliateCommission(userId, amountEur) {
  try {
    if (!userId || !amountEur || amountEur <= 0) return;

    const userR = await pool.query("SELECT referred_by_coach_id FROM users WHERE id=$1", [userId]);
    const coachId = userR.rows[0]?.referred_by_coach_id;
    if (!coachId) return;

    const commission = Math.round(amountEur * 0.20 * 100) / 100;

    const priorR = await pool.query(
      "SELECT id FROM affiliate_conversions WHERE coach_id=$1 AND referred_user_id=$2",
      [coachId, userId]
    );
    const isFirstConversion = !priorR.rows.length;

    await pool.query(
      "INSERT INTO affiliate_conversions (coach_id, referred_user_id, amount, commission) VALUES ($1,$2,$3,$4)",
      [coachId, userId, amountEur, commission]
    );

    await pool.query(
      `UPDATE coach_affiliations SET total_earnings = total_earnings + $2${isFirstConversion ? ", total_referrals = total_referrals + 1" : ""}
       WHERE coach_id=$1`,
      [coachId, commission]
    );

    if (isFirstConversion) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, link) VALUES ($1,'affiliate_conversion',$2,'/coach-dashboard.html')`,
        [coachId, "💰 Un nouveau filleul vient de passer Premium via ton lien d'affiliation !"]
      ).catch(() => {});
    }
  } catch (e) {
    console.error("Erreur creditCoachAffiliateCommission :", e);
  }
}

module.exports = router;
module.exports.creditCoachAffiliateCommission = creditCoachAffiliateCommission;
