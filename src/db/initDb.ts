//initDb.ts
import { pool } from "../db";

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    );
  `);

await pool.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;`);
await pool.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;`);
await pool.query(`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;`);

// Índice único opcional para evitar duplicados por subscription
await pool.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS ux_api_keys_stripe_subscription_id
  ON api_keys(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
`);


  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_logs (
      id BIGSERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip TEXT,
      api_key TEXT,
      endpoint TEXT,
      method TEXT,
      duration_ms INT,
      status_code INT,
      success BOOLEAN,
      curp TEXT
    );
  `);

  await pool.query(`ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS ip TEXT;`);
  await pool.query(`ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS endpoint TEXT;`);
  await pool.query(`ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS duration_ms INT;`);
  await pool.query(`ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS status_code INT;`);
  await pool.query(`ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS success BOOLEAN;`);
  await pool.query(`ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS curp TEXT;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_usage (
      api_key TEXT NOT NULL,
      month TEXT NOT NULL,
      used INT NOT NULL DEFAULT 0,
      PRIMARY KEY (api_key, month)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_usage_daily (
     id BIGSERIAL PRIMARY KEY,
     api_key TEXT NOT NULL,
     day DATE NOT NULL DEFAULT CURRENT_DATE,
     used INT NOT NULL DEFAULT 0,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (api_key, day)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS demo_usage (
     demo_id TEXT NOT NULL,
     day DATE NOT NULL,
     used INT NOT NULL DEFAULT 0,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (demo_id, day)
    );
  `)
  

  // índices opcionales (mejor rendimiento en dashboard)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_ts ON api_logs(ts);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_key ON api_logs(api_key);`);
}
