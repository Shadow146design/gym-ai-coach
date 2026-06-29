// Bloque l'acces aux routes si l'utilisateur n'est pas connecte
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Tu dois etre connecte pour faire ca." });
  }
  next();
}

module.exports = { requireAuth };
