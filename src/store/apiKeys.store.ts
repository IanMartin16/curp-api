// src/store/apiKeys.store.ts
import crypto from "crypto";
import { pool } from "../db";

export type PlanType = "free" | "developer" | "business";

export interface ApiKeyRecord {
  id: string;
  key: string;
  label: string;
  plan: PlanType;
  active: boolean;
  createdAt: string;
  revokedAt?: string | null;
}

// ✅ Migra/crea tablas e índices al arrancar
export async function migrateApiSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      plan TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      revoked_at TIMESTAMPTZ NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_logs (
      id BIGSERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT now(),
      path TEXT,
      method TEXT,
      status INTEGER,
      api_key TEXT
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_api_logs_ts ON api_logs(ts);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_api_logs_api_key ON api_logs(api_key);
  `);
}

// ✅ Listar keys (para tu /api/admin/keys)
export async function loadApiKeys(): Promise<ApiKeyRecord[]> {
  const r = await pool.query(`
    SELECT id, key, label, plan, active,
           created_at as "createdAt",
           revoked_at as "revokedAt"
    FROM api_keys
    ORDER BY created_at DESC
  `);

  // Convertimos fechas a string ISO para que tu front siga igual
  return r.rows.map((x) => ({
    ...x,
    createdAt: new Date(x.createdAt).toISOString(),
    revokedAt: x.revokedAt ? new Date(x.revokedAt).toISOString() : null,
  }));
}

// ✅ Crear key
export async function createApiKey(input: {
  label?: string;
  plan: PlanType;
}): Promise<ApiKeyRecord> {
  const id = `key_${crypto.randomBytes(6).toString("hex")}`;
  const key = generateRandomKey();

  const label = (input.label?.trim() || "Sin label").slice(0, 80);
  const plan = input.plan;

  const r = await pool.query(
    `
    INSERT INTO api_keys (id, key, label, plan, active)
    VALUES ($1, $2, $3, $4, true)
    RETURNING id, key, label, plan, active,
              created_at as "createdAt",
              revoked_at as "revokedAt"
  `,
    [id, key, label, plan]
  );

  const row = r.rows[0];
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    revokedAt: row.revokedAt ? new Date(row.revokedAt).toISOString() : null,
  };
}

// ✅ Revocar key (soft delete)
export async function revokeApiKey(id: string) {
  const r = await pool.query(
    `
    UPDATE api_keys
    SET active = false, revoked_at = now()
    WHERE id = $1
    RETURNING id
  `,
    [id]
  );

  return r.rowCount > 0;
}

// ✅ Validación rápida (para tu middleware)
export async function isActiveClientKey(key: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM api_keys WHERE key = $1 AND active = true LIMIT 1`,
    [key]
  );
  return r.rowCount > 0;
}

// ✅ Mejor random (más seguro que Math.random)
export function generateRandomKey(): string {
  return "curp_" + crypto.randomBytes(12).toString("hex");
}
