const express = require("express");
const pool = require("../db/pool");
const router = express.Router();

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI
  || "https://gym-ai-coach-1wls.onrender.com/auth/google/callback";

router.get("/google", (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.redirect("/?error=google_not_configured");
  }
  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "online",
    prompt:        "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/google/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect("/?error=google_denied");

  try {
    // Échange code → access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      console.error("Google token error:", tokenData);
      return res.redirect("/?error=google_token");
    }

    // Récupère les infos utilisateur Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json();
    if (!googleUser.id || !googleUser.email) {
      console.error("Google user error:", googleUser);
      return res.redirect("/?error=google_user");
    }

    // Trouve ou crée l'utilisateur
    let userId;
    const byGoogle = await pool.query("SELECT id, banned FROM users WHERE google_id=$1", [googleUser.id]);

    if (byGoogle.rows.length) {
      if (byGoogle.rows[0].banned) return res.redirect("/?error=account_banned");
      userId = byGoogle.rows[0].id;
      // Met à jour l'avatar si changé
      await pool.query("UPDATE users SET avatar_url=$1 WHERE id=$2", [googleUser.picture, userId]);
    } else {
      const byEmail = await pool.query("SELECT id, banned FROM users WHERE email=$1", [googleUser.email.toLowerCase()]);
      if (byEmail.rows.length) {
        if (byEmail.rows[0].banned) return res.redirect("/?error=account_banned");
        // Lie le compte Google au compte email existant
        userId = byEmail.rows[0].id;
        await pool.query("UPDATE users SET google_id=$1, avatar_url=$2 WHERE id=$3",
          [googleUser.id, googleUser.picture, userId]);
      } else {
        // Nouveau compte
        const r = await pool.query(
          "INSERT INTO users (email, name, google_id, avatar_url, role) VALUES ($1,$2,$3,$4,'user') RETURNING id",
          [googleUser.email.toLowerCase(), googleUser.given_name || googleUser.name, googleUser.id, googleUser.picture]
        );
        userId = r.rows[0].id;
      }
    }

    req.session.userId = userId;
    // Redirige vers questionnaire si nouveau, sinon home
    const prog = await pool.query("SELECT id FROM programs WHERE user_id=$1 LIMIT 1", [userId]);
    res.redirect(prog.rows.length ? "/home.html" : "/questionnaire.html");

  } catch (err) {
    console.error("Erreur Google OAuth:", err);
    res.redirect("/?error=google_server");
  }
});

module.exports = router;
