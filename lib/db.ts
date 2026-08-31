import { Pool } from 'pg';

const connectionString = process.env.PG_URL;

if (!connectionString) {
  throw new Error('PG_URL is not defined');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

let schemaPromise: Promise<void> | undefined;

export function ensureSchema() {
  schemaPromise ??= pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password'
        ) THEN
          ALTER TABLE public.users RENAME TO legacy_users_foodtracker;
        END IF;
      END IF;
    END $$;

    DROP TABLE IF EXISTS public.users CASCADE;

    CREATE TABLE users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO users (email, display_name)
    VALUES ('default@local.user', 'Default User'), ('user_2@local', 'User 2'), ('user_3@local', 'User 3')
    ON CONFLICT (email) DO NOTHING;

    CREATE TABLE IF NOT EXISTS food_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      meal_name TEXT NOT NULL,
      meal_type TEXT NOT NULL DEFAULT 'Meal',
      raw_input TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      ai_model_used TEXT,
      nutrients JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS goals (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      nutrient_key TEXT NOT NULL,
      target_amount NUMERIC NOT NULL,
      unit TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, nutrient_key)
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
      amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
      logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS nutrient_cache (
      input_hash TEXT PRIMARY KEY,
      raw_input TEXT NOT NULL,
      result JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS openrouter_requests (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      request_id TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS food_catalog (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      portion TEXT NOT NULL DEFAULT '1 serving',
      category TEXT NOT NULL DEFAULT 'Custom',
      nutrients JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS user_id BIGINT;
    UPDATE food_logs SET user_id = 1 WHERE user_id IS NULL;
    ALTER TABLE food_logs ALTER COLUMN user_id SET DEFAULT 1;
    ALTER TABLE food_logs ALTER COLUMN user_id SET NOT NULL;

    ALTER TABLE water_logs ADD COLUMN IF NOT EXISTS user_id BIGINT;
    UPDATE water_logs SET user_id = 1 WHERE user_id IS NULL;
    ALTER TABLE water_logs ALTER COLUMN user_id SET DEFAULT 1;
    ALTER TABLE water_logs ALTER COLUMN user_id SET NOT NULL;

    ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id BIGINT;
    UPDATE goals SET user_id = 1 WHERE user_id IS NULL;
    ALTER TABLE goals ALTER COLUMN user_id SET DEFAULT 1;
    ALTER TABLE goals ALTER COLUMN user_id SET NOT NULL;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'goals_user_id_nutrient_key_key'
      ) THEN
        ALTER TABLE goals
          ADD CONSTRAINT goals_user_id_nutrient_key_key UNIQUE (user_id, nutrient_key);
      END IF;
    END $$;
  `).then(() => undefined).catch((error) => {
    schemaPromise = undefined;
    throw error;
  });
  return schemaPromise;
}

export async function testDatabaseConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() as now');
    return result.rows[0];
  } finally {
    client.release();
  }
}
