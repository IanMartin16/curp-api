import { Router } from "express";
import { pool } from "../db";
import { apiKeyMiddleware } from "../middlewares/apikey.middleware";
import { validateIdentity } from "../services/identity/identity.service";
import { validateCurp } from "../services/identity/curp.validator";
import { validateRfc } from "../services/identity/rfc.validator";
import { normalizeIdentityValue } from "../services/identity/normalizer";

const router = Router();

function monthKeyUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function maskIdentity(value: string) {
  if (!value) return "";
  if (value.length <= 8) return "**";
  return `${value.slice(0, 4)}******${value.slice(-2)}`;
}

async function recordIdentityUsage(params: {
  apiKey: string;
  identityValue: string;
  success: boolean;
  statusCode: number;
  durationMs: number;
  endpoint: string;
  method: string;
}) {
  const month = monthKeyUTC();

  await pool.query("BEGIN");

  try {
    await pool.query(
      `
      INSERT INTO api_usage (api_key, month, used)
      VALUES ($1, $2, 1)
      ON CONFLICT (api_key, month)
      DO UPDATE SET used = api_usage.used + 1
      `,
      [params.apiKey, month]
    );

    await pool.query(
      `
      INSERT INTO api_usage_daily (api_key, day, used)
      VALUES ($1, (NOW() AT TIME ZONE 'America/Mexico_city')::date, 1)
      ON CONFLICT (api_key, day)
      DO UPDATE SET used = api_usage_daily.used + 1
      `,
      [params.apiKey]
    );

    await pool.query(
      `
      INSERT INTO api_logs (
        api_key,
        curp,
        success,
        status_code,
        duration_ms,
        endpoint,
        method
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        params.apiKey,
        params.identityValue,
        params.success,
        params.statusCode,
        params.durationMs,
        params.endpoint,
        params.method,
      ]
    );

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

router.post("/validate/identity", apiKeyMiddleware, async (req, res) => {
  const startedAt = Date.now();

  try {
    const apiKey = (req as any).__apiKey as string | undefined;

    if (!apiKey) {
      return res.status(401).json({
        ok: false,
        error: "API key requerida para validar identidad.",
      });
    }

    const result = validateIdentity(req.body?.value);

    const statusCode = 200;
    const durationMs = Date.now() - startedAt;

    await recordIdentityUsage({
      apiKey,
      identityValue: result.normalized,
      success: result.valid,
      statusCode,
      durationMs,
      endpoint: "/api/v1/validate/identity",
      method: "POST",
    });

    return res.status(statusCode).json(result);
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e?.message || "Error validating identity",
    });
  }
});

router.post("/validate/curp", (req, res) => {
  const normalized = normalizeIdentityValue(req.body?.value);
  const result = validateCurp(normalized);
  return res.json(result);
});

router.post("/validate/rfc", (req, res) => {
  const normalized = normalizeIdentityValue(req.body?.value);
  const result = validateRfc(normalized);
  return res.json(result);
});

export default router;