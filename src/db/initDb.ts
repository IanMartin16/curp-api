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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_usage (
      api_key TEXT NOT NULL,
      month TEXT NOT NULL,
      used INT NOT NULL DEFAULT 0,
      PRIMARY KEY (api_key, month)
    );
  `);

  // índices opcionales (mejor rendimiento en dashboard)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_ts ON api_logs(ts);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_api_logs_key ON api_logs(api_key);`);
}
