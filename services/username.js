const pool = require("../db/pool");

// Genere un identifiant d'URL unique a partir du nom (fonctionnalite 7,
// profils publics) : minuscules, sans accents, alphanumerique, suffixe
// numerique en cas de collision.
async function generateUsername(name) {
  const base = (name || "user")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20) || "user";

  let candidate = base;
  let suffix = 0;
  while (true) {
    const r = await pool.query("SELECT 1 FROM users WHERE username=$1", [candidate]);
    if (!r.rows.length) return candidate;
    suffix++;
    candidate = `${base}${suffix}`;
  }
}

// Retourne le username existant, ou en genere et persiste un nouveau.
async function ensureUsername(userId) {
  const r = await pool.query("SELECT username, name FROM users WHERE id=$1", [userId]);
  const row = r.rows[0];
  if (!row) return null;
  if (row.username) return row.username;

  const username = await generateUsername(row.name);
  await pool.query("UPDATE users SET username=$1 WHERE id=$2", [username, userId]);
  return username;
}

module.exports = { generateUsername, ensureUsername };
