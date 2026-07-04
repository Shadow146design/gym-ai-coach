-- Schema Gym AI Coach v4 — idempotent

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT,
  name            TEXT NOT NULL,
  google_id       TEXT UNIQUE,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'user',
  weight_kg       NUMERIC,
  height_cm       INTEGER,
  age             INTEGER,
  gender          TEXT,
  activity_level  TEXT,
  theme           TEXT DEFAULT 'dark',
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_id')      THEN ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url')     THEN ALTER TABLE users ADD COLUMN avatar_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role')           THEN ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='weight_kg')      THEN ALTER TABLE users ADD COLUMN weight_kg NUMERIC; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='height_cm')      THEN ALTER TABLE users ADD COLUMN height_cm INTEGER; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='age')            THEN ALTER TABLE users ADD COLUMN age INTEGER; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='gender')         THEN ALTER TABLE users ADD COLUMN gender TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='activity_level') THEN ALTER TABLE users ADD COLUMN activity_level TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='theme')          THEN ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'dark'; END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(LEAST(from_id,to_id), GREATEST(from_id,to_id), created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(to_id, read_at);

CREATE TABLE IF NOT EXISTS programs (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by    INTEGER REFERENCES users(id),
  title         TEXT NOT NULL,
  questionnaire JSONB NOT NULL DEFAULT '{}',
  content       JSONB NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='programs' AND column_name='created_by')
    THEN ALTER TABLE programs ADD COLUMN created_by INTEGER REFERENCES users(id); END IF;
END $$;

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
