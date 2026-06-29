-- Schema Gym AI Coach v2.1
-- Execution idempotente

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Colonnes profil physique (ajout doux si elles n'existent pas)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='weight_kg')   THEN ALTER TABLE users ADD COLUMN weight_kg NUMERIC; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='height_cm')  THEN ALTER TABLE users ADD COLUMN height_cm INTEGER; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='age')        THEN ALTER TABLE users ADD COLUMN age INTEGER; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='gender')     THEN ALTER TABLE users ADD COLUMN gender TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='activity_level') THEN ALTER TABLE users ADD COLUMN activity_level TEXT; END IF;
END $$;

CREATE TABLE IF NOT EXISTS programs (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  questionnaire JSONB NOT NULL,
  content       JSONB NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  muscle_group  TEXT,
  weight        NUMERIC NOT NULL,
  reps          INTEGER NOT NULL,
  sets          INTEGER NOT NULL DEFAULT 1,
  note          TEXT,
  performed_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logs' AND column_name='muscle_group')
    THEN ALTER TABLE logs ADD COLUMN muscle_group TEXT; END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_programs_user ON programs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_user     ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_exercise ON logs(user_id, exercise_name);
CREATE INDEX IF NOT EXISTS idx_logs_day      ON logs(user_id, (performed_at::date));

CREATE TABLE IF NOT EXISTS "session" (
  "sid"    varchar NOT NULL COLLATE "default" PRIMARY KEY,
  "sess"   json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
