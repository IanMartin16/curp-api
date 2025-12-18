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

// ✅ Listar keys (para tu /api/admin/keys)
export async function loadApiKeys(): Promise<ApiKeyRecord[]> {
  const r = await pool.query(`
    SELECT
      id,
      key,
      label,
      plan,
      active,
      created_at as "createdAt",
      revoked_at as "revokedAt"
    FROM api_keys
    ORDER BY created_at DESC
  `);

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
    RETURNING
      id, key, label, plan, active,
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
export async function revokeApiKey(id: string): Promise<boolean> {
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
