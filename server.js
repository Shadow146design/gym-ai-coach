require("dotenv").config();
const express   = require("express");
const path      = require("path");
const session   = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const helmet    = require("helmet");
const morgan    = require("morgan");

const pool           = require("./db/pool");
const authRoutes     = require("./routes/auth");
const programRoutes  = require("./routes/program");
const sessionsRoutes = require("./routes/sessions");
const chatRoutes     = require("./routes/chat");
const profileRoutes  = require("./routes/profile");
const oauthRoutes    = require("./routes/oauth");
const coachRoutes    = require("./routes/coach");
const messagesRoutes = require("./routes/messages");
const adminRoutes    = require("./routes/admin");
const stripeRoutes   = require("./routes/stripe");
const notificationsRoutes = require("./routes/notifications");
const weightRoutes   = require("./routes/weight");
const badgesRoutes   = require("./routes/badges");
const wellnessRoutes = require("./routes/wellness");
const competitionRoutes = require("./routes/competition");
const publicProfileRoutes = require("./routes/publicProfile");
const referralRoutes = require("./routes/referral");
const photosRoutes = require("./routes/photos");
const emailRoutes = require("./routes/email");
const nutritionRoutes = require("./routes/nutrition");
const exercisesRoutes = require("./routes/exercises");
const { sendReminderEmail, sendWeeklyRecapEmail } = require("./services/email");

const app  = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

// CSP desactivee : les pages s'appuient sur des attributs onclick inline et
// sur le CDN Chart.js, incompatibles avec la CSP stricte par defaut de Helmet.
// Les autres en-tetes (HSTS, X-Frame-Options, X-Content-Type-Options...) restent actifs.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Webhook Stripe : body brut (Buffer) requis pour verifier la signature,
// donc monte AVANT express.json() qui parserait/consommerait le stream.
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeRoutes.webhookHandler);

app.use(express.json({ limit: "1mb" }));

app.use(session({
  store: new pgSession({ pool, tableName: "session" }),
  secret: process.env.SESSION_SECRET || "dev_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
}));

app.use("/api/auth",     authRoutes);
app.use("/api/program",  programRoutes);
app.use("/api/logs",     sessionsRoutes);
app.use("/api/chat",     chatRoutes);
app.use("/api/profile",  profileRoutes);
app.use("/api/coaches",  coachRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/stripe",   stripeRoutes.router);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/weight",  weightRoutes);
app.use("/api/badges",  badgesRoutes);
app.use("/api/wellness", wellnessRoutes);
app.use("/api/competition", competitionRoutes);
app.use("/api/users",    publicProfileRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/photos",   photosRoutes);
app.use("/api/email",    emailRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/exercises", exercisesRoutes);
app.use("/auth",         oauthRoutes);

// Profil public a URL courte (fonctionnalite 7) : sert la meme page HTML
// pour tout /u/:username, u.js lit le username depuis le chemin et appelle
// GET /api/users/profile/:username en client.
app.get("/u/:username", (req, res) => res.sendFile(path.join(__dirname, "public", "u.html")));

app.use(express.static(path.join(__dirname, "public")));
app.get("/healthz", (req, res) => res.json({ ok: true }));

// Filet de securite : capture toute erreur non geree par une route (les routes
// gerent deja leurs propres try/catch, ceci couvre le reste : middleware, JSON
// invalide, etc.) pour ne jamais renvoyer une stack trace au client.
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Erreur non geree sur ${req.method} ${req.originalUrl} :`, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Erreur serveur." });
});

// Retrograde les comptes dont le Premium offert par parrainage (fonctionnalite 5)
// a expire. premium_until IS NULL = Premium payant ou permanent (coach/admin) :
// jamais touche ici.
async function expireReferralPremium() {
  try {
    await pool.query(
      "UPDATE users SET role='user', premium_until=NULL WHERE role='premium' AND premium_until IS NOT NULL AND premium_until < NOW()"
    );
  } catch (e) { console.error("Erreur expiration premium parrainage :", e); }
}
setInterval(expireReferralPremium, 60 * 60 * 1000);
expireReferralPremium();

// Emails automatiques (fonctionnalite 4) : rappel d'inactivite (5+ jours
// sans seance) et recap hebdomadaire (chaque lundi, Premium uniquement).
// La table rate_limits sert de marqueur "deja envoye" pour ne pas spammer
// a chaque execution horaire du cron (action='inactivity_reminder'/'weekly_recap').
async function runEmailAutomations() {
  try {
    const now = new Date();

    const inactiveR = await pool.query(`
      SELECT u.id, u.email, u.name, MAX(l.performed_at) AS last_session
      FROM users u JOIN logs l ON l.user_id = u.id
      GROUP BY u.id
      HAVING MAX(l.performed_at) < NOW() - INTERVAL '5 days'
    `);
    for (const u of inactiveR.rows) {
      const rl = await pool.query("SELECT reset_at FROM rate_limits WHERE user_id=$1 AND action='inactivity_reminder'", [u.id]);
      if (rl.rows[0] && new Date(rl.rows[0].reset_at) > now) continue;

      const daysSince = Math.floor((now - new Date(u.last_session)) / 86400000);
      await sendReminderEmail(u.email, u.name, daysSince);
      await pool.query(
        `INSERT INTO rate_limits (user_id, action, count, reset_at) VALUES ($1,'inactivity_reminder',1,$2)
         ON CONFLICT (user_id, action) DO UPDATE SET count=1, reset_at=$2`,
        [u.id, new Date(now.getTime() + 3 * 86400000)]
      );
    }

    if (now.getDay() === 1) { // Lundi
      const premiumR = await pool.query("SELECT id, email, name FROM users WHERE role IN ('premium','coach')");
      for (const u of premiumR.rows) {
        const rl = await pool.query("SELECT reset_at FROM rate_limits WHERE user_id=$1 AND action='weekly_recap'", [u.id]);
        if (rl.rows[0] && new Date(rl.rows[0].reset_at) > now) continue;

        const statsR = await pool.query(
          `SELECT COUNT(DISTINCT performed_at::date) AS sessions, COALESCE(SUM(weight*reps*sets),0) AS volume
           FROM logs WHERE user_id=$1 AND performed_at >= NOW() - INTERVAL '7 days'`,
          [u.id]
        );
        const stats = statsR.rows[0];
        const sessions = parseInt(stats.sessions, 10) || 0;
        const nextMonday = new Date(now.getTime() + 7 * 86400000);

        if (sessions > 0) {
          await sendWeeklyRecapEmail(u.email, u.name, { sessions, volume: Number(stats.volume), prs: 0 });
        }
        await pool.query(
          `INSERT INTO rate_limits (user_id, action, count, reset_at) VALUES ($1,'weekly_recap',1,$2)
           ON CONFLICT (user_id, action) DO UPDATE SET count=1, reset_at=$2`,
          [u.id, nextMonday]
        );
      }
    }
  } catch (e) { console.error("Erreur automatisations email :", e); }
}
setInterval(runEmailAutomations, 60 * 60 * 1000);
runEmailAutomations();

app.listen(PORT, () => console.log(`Gym AI Coach v4 — port ${PORT}`));
