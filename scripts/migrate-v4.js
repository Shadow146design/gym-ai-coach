require("dotenv").config();
const pool = require("../db/pool");

async function migrate() {
  console.log("Migration v4 : ajout des tables coach/messages...");
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coach_profiles (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        bio           TEXT,
        specialties   TEXT[],
        price_monthly NUMERIC DEFAULT 0,
        available     BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS coach_assignments (
        id         SERIAL PRIMARY KEY,
        coach_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id  INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        status     TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id         SERIAL PRIMARY KEY,
        from_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content    TEXT NOT NULL,
        read_at    TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role')
          THEN ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_id')
          THEN ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url')
          THEN ALTER TABLE users ADD COLUMN avatar_url TEXT; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programs' AND column_name='created_by')
          THEN ALTER TABLE programs ADD COLUMN created_by INTEGER REFERENCES users(id); END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(LEAST(from_id,to_id), GREATEST(from_id,to_id), created_at);
    `);
    console.log("Migration v4 reussie !");
  } catch(e) {
    console.error("Erreur migration v4 :", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
migrate();
