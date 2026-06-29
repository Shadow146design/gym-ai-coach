// Cree les tables en base a partir de db/schema.sql.
// Utilise ca a la place de psql (pas toujours installe sur Render) :
//
//   node scripts/init-db.js
//
// Lit DATABASE_URL depuis .env (en local) ou depuis les variables
// d'environnement deja injectees (sur Render).

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL n'est pas defini. Verifie ton .env (local) ou tes variables d'environnement Render.");
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  console.log("Connexion a la base...");
  try {
    await pool.query(schema);
    console.log("Tables creees avec succes (users, programs, logs, session).");
  } catch (err) {
    console.error("Erreur lors de la creation des tables :", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
