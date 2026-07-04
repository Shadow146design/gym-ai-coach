const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Fallback pour ne pas crasher le serveur si la cle n'est pas encore configuree.
// Les vrais appels Stripe echoueront proprement tant que STRIPE_SECRET_KEY n'est pas defini.
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

const PRICE_IDS = {
  premium: process.env.STRIPE_PREMIUM_PRICE_ID,
  coach: process.env.STRIPE_COACH_PRICE_ID,
};

// Cree une session Stripe Checkout pour l'abonnement choisi
router.post("/create-checkout-session", requireAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    const priceId = PRICE_IDS[plan];
    if (!priceId) return res.status(400).json({ error: "Plan invalide." });

    const userR = await pool.query("SELECT email FROM users WHERE id=$1", [req.session.userId]);
    if (!userR.rows.length) return res.status(404).json({ error: "Utilisateur introuvable." });

    const origin = `${req.protocol}://${req.get("host")}`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: userR.rows[0].email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/premium-success.html`,
      cancel_url: `${origin}/premium.html?canceled=1`,
      metadata: { userId: String(req.session.userId), plan },
      subscription_data: { metadata: { userId: String(req.session.userId), plan } },
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error("Erreur creation session Stripe :", e.message);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Annule l'abonnement actif de l'utilisateur connecte
router.post("/cancel-subscription", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT stripe_subscription_id FROM subscriptions WHERE user_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 1",
      [req.session.userId]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Aucun abonnement actif." });

    await stripe.subscriptions.cancel(r.rows[0].stripe_subscription_id);
    // Le statut et le role seront mis a jour par le webhook customer.subscription.deleted
    res.json({ ok: true });
  } catch (e) {
    console.error("Erreur annulation abonnement :", e.message);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Webhook Stripe : monte a part dans server.js avec express.raw(), body brut requis
// pour verifier la signature.
async function webhookHandler(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Signature webhook Stripe invalide :", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "customer.subscription.created") {
      await syncSubscriptionFromStripeObject(event.data.object);
    } else if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        await syncSubscriptionFromStripeObject(sub);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const r = await pool.query(
        "UPDATE subscriptions SET status='canceled' WHERE stripe_subscription_id=$1 RETURNING user_id",
        [sub.id]
      );
      if (r.rows.length) {
        await pool.query("UPDATE users SET role='user' WHERE id=$1", [r.rows[0].user_id]);
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error("Erreur traitement webhook Stripe :", e.message);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

// Met a jour le role de l'utilisateur et la table subscriptions a partir d'un
// objet Subscription Stripe, en determinant le plan via le price_id de l'item.
async function syncSubscriptionFromStripeObject(sub) {
  const priceId = sub.items?.data?.[0]?.price?.id;
  const plan = priceId === PRICE_IDS.coach ? "coach" : priceId === PRICE_IDS.premium ? "premium" : null;
  if (!plan) return;

  let userId = parseInt(sub.metadata?.userId, 10);
  if (!userId) {
    const r = await pool.query(
      "SELECT user_id FROM subscriptions WHERE stripe_customer_id=$1 ORDER BY created_at DESC LIMIT 1",
      [sub.customer]
    );
    if (!r.rows.length) return;
    userId = r.rows[0].user_id;
  }

  await pool.query("UPDATE users SET role=$1 WHERE id=$2", [plan, userId]);
  await pool.query(
    `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, status)
     VALUES ($1,$2,$3,$4,'active')
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET plan=$4, status='active', updated_at=NOW()`,
    [userId, sub.customer, sub.id, plan]
  );
}

module.exports = { router, webhookHandler };
