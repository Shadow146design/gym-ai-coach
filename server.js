require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const pool = require("./db/pool");
const authRoutes = require("./routes/auth");
const programRoutes = require("./routes/program");
const sessionsRoutes = require("./routes/sessions");
const chatRoutes = require("./routes/chat");
const coachRoutes = require("./routes/coach");

const app = express();
const PORT = process.env.PORT || 3000;

// Necessaire derriere le proxy de Render (et la plupart des hebergeurs) pour
// qu'Express sache que la connexion d'origine est en HTTPS. Sans ca, les
// cookies de session "secure" ne sont jamais envoyes et la connexion ne
// "tient" jamais (l'utilisateur est redirige en boucle vers la page de login).
app.set("trust proxy", 1);

app.use(express.json());

app.use(
  session({
    store: new pgSession({ pool, tableName: "session" }),
    secret: process.env.SESSION_SECRET || "dev_secret_a_changer",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/program", programRoutes);
app.use("/api/logs", sessionsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/coach", coachRoutes);

app.use(express.static(path.join(__dirname, "public")));

app.get("/healthz", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Gym AI Coach lance sur le port ${PORT}`);
});
