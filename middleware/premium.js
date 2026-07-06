const pool = require("../db/pool");

const CHAT_DAILY_LIMIT = 10;

// Bloque l'acces aux routes reservees Premium/Coach/Admin.
async function requirePremium(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Tu dois être connecté pour faire ça." });
  }
  try {
    const r = await pool.query("SELECT role FROM users WHERE id=$1", [req.session.userId]);
    const role = r.rows[0]?.role;
    if (!["premium", "coach", "admin"].includes(role)) {
      return res.status(403).json({ error: "Fonctionnalité réservée aux membres Premium.", upgrade_url: "/premium.html" });
    }
    next();
  } catch (err) {
    console.error("Erreur requirePremium :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
}

// Renvoie l'usage courant (sans l'incrementer) pour affichage frontend
// ("X/10 messages utilises aujourd'hui"). isPremium=true => illimite.
async function getChatUsage(uid) {
  const roleR = await pool.query("SELECT role FROM users WHERE id=$1", [uid]);
  const isPremium = roleR.rows[0]?.role !== "user";
  if (isPremium) return { used: 0, max: CHAT_DAILY_LIMIT, isPremium: true };

  const now = new Date();
  const r = await pool.query("SELECT count, reset_at FROM rate_limits WHERE user_id=$1 AND action='chat_message'", [uid]);
  const row = r.rows[0];
  const used = (!row || new Date(row.reset_at) <= now) ? 0 : row.count;
  return { used, max: CHAT_DAILY_LIMIT, isPremium: false };
}

// Limite les gratuits a CHAT_DAILY_LIMIT messages par jour (reset a minuit).
// Premium/coach/admin : illimite.
async function checkChatLimit(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Tu dois être connecté pour faire ça." });
  }
  const uid = req.session.userId;
  try {
    const roleR = await pool.query("SELECT role FROM users WHERE id=$1", [uid]);
    if (roleR.rows[0]?.role !== "user") return next();

    const now = new Date();
    const r = await pool.query("SELECT count, reset_at FROM rate_limits WHERE user_id=$1 AND action='chat_message'", [uid]);
    const row = r.rows[0];

    if (!row || new Date(row.reset_at) <= now) {
      const resetAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      await pool.query(
        `INSERT INTO rate_limits (user_id, action, count, reset_at) VALUES ($1,'chat_message',1,$2)
         ON CONFLICT (user_id, action) DO UPDATE SET count=1, reset_at=$2`,
        [uid, resetAt]
      );
      return next();
    }

    if (row.count >= CHAT_DAILY_LIMIT) {
      return res.status(429).json({
        error: `Tu as utilisé tes ${CHAT_DAILY_LIMIT} messages gratuits aujourd'hui. Passe en Premium pour un chat illimité.`,
        upgrade_url: "/premium.html",
        limitReached: true,
      });
    }

    await pool.query("UPDATE rate_limits SET count=count+1 WHERE user_id=$1 AND action='chat_message'", [uid]);
    next();
  } catch (err) {
    console.error("Erreur checkChatLimit :", err);
    next();
  }
}

module.exports = { requirePremium, checkChatLimit, getChatUsage, CHAT_DAILY_LIMIT };
