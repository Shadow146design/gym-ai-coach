const pool = require("../db/pool");

// Bloque l'acces aux routes si l'utilisateur n'est pas connecte
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Tu dois etre connecte pour faire ca." });
  }
  next();
}

// Bloque l'acces aux routes si l'utilisateur n'a pas l'un des roles autorises
function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Tu dois etre connecte pour faire ca." });
    }
    try {
      const r = await pool.query("SELECT role FROM users WHERE id=$1", [req.session.userId]);
      if (!r.rows.length || !roles.includes(r.rows[0].role)) {
        return res.status(403).json({ error: "Acces refuse." });
      }
      next();
    } catch (e) {
      res.status(500).json({ error: "Erreur serveur." });
    }
  };
}

module.exports = { requireAuth, requireRole };
