const webpush = require("web-push");
const pool = require("../db/pool");

const configured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contact@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("⚠️  VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY manquants — les notifications push sont désactivées.");
}

// Envoie une notif push a tous les appareils abonnes d'un utilisateur.
// Nettoie automatiquement les abonnements expires/invalides (410/404) rencontres.
async function sendPushToUser(userId, { title, body, url }) {
  if (!configured) return;
  try {
    const r = await pool.query("SELECT id, endpoint, subscription FROM push_subscriptions WHERE user_id=$1", [userId]);
    if (!r.rows.length) return;

    const payload = JSON.stringify({ title, body, url: url || "/" });

    await Promise.all(r.rows.map(async row => {
      try {
        await webpush.sendNotification(row.subscription, payload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await pool.query("DELETE FROM push_subscriptions WHERE id=$1", [row.id]).catch(() => {});
        } else {
          console.error("Erreur envoi push :", err.message);
        }
      }
    }));
  } catch (err) {
    console.error("Erreur sendPushToUser :", err);
  }
}

module.exports = { sendPushToUser, pushConfigured: configured };
