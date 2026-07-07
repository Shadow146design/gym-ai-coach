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

app.listen(PORT, () => console.log(`Gym AI Coach v4 — port ${PORT}`));
