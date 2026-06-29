const { Pool } = require("pg");

// DATABASE_URL peut pointer vers Render Postgres, Neon, Supabase, ou toute
// base Postgres distante. Toutes ces bases exigent une connexion SSL, sauf
// si tu te connectes a une base en localhost (dev local sans SSL).
const url = process.env.DATABASE_URL || "";
const isLocal = url.includes("localhost") || url.includes("127.0.0.1");

const pool = new Pool({
  connectionString: url,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Erreur inattendue du pool Postgres :", err);
});

module.exports = pool;

