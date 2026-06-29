// Migration : ajoute les colonnes de profil physique si elles n'existent pas encore.
// Lance avec : node scripts/migrate-profile.js

require("dotenv").config();
const pool = require("../db/pool");

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL manquante dans .env");
    process.exit(1);
  }
  console.log("Migration du profil physique...");
  try {
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='weight_kg')
          THEN ALTER TABLE users ADD COLUMN weight_kg NUMERIC; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='height_cm')
          THEN ALTER TABLE users ADD COLUMN height_cm INTEGER; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='age')
          THEN ALTER TABLE users ADD COLUMN age INTEGER; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='gender')
          THEN ALTER TABLE users ADD COLUMN gender TEXT; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='activity_level')
          THEN ALTER TABLE users ADD COLUMN activity_level TEXT; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logs' AND column_name='muscle_group')
          THEN ALTER TABLE logs ADD COLUMN muscle_group TEXT; END IF;
      END $$;
    `);
    console.log("Migration reussie — colonnes profil ajoutees.");
  } catch (err) {
    console.error("Erreur migration :", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
