require("dotenv").config();
const express   = require("express");
const path      = require("path");
const session   = require("express-session");
const pgSession = require("connect-pg-simple")(session);

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

const app  = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

// Webhook Stripe : body brut (Buffer) requis pour verifier la signature,
// donc monte AVANT express.json() qui parserait/consommerait le stream.
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeRoutes.webhookHandler);

app.use(express.json());

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
app.use("/auth",         oauthRoutes);

app.use(express.static(path.join(__dirname, "public")));
app.get("/healthz", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Gym AI Coach v4 — port ${PORT}`));
