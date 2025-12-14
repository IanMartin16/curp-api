import { Request, Response, NextFunction } from "express";
import { pool } from "../db";

const LIMITS = {
  free: 500,
  developer: 50_000,
  business: 500_000,
} as const;

type Plan = keyof typeof LIMITS;

function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // ej: 2025-12
}

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const key = (req as any).apiKey as string | undefined;
    const isMaster = Boolean((req as any).isMasterKey);

    // master no limita
    if (isMaster) return next();
    if (!key) return res.status(401).json({ ok: false, error: "Falta apiKey en request" });

    // 1) obtener plan desde api_keys
    const planR = await pool.query(
      `SELECT plan
       FROM api_keys
       WHERE active = true AND key = $1
       LIMIT 1`,
      [key]
    );

    if (planR.rowCount === 0) {
      return res.status(403).json({ ok: false, error: "API key inválida o revocada" });
    }

    const plan = (String(planR.rows[0].plan || "free") as Plan) || "free";
    const limit = LIMITS[plan] ?? LIMITS.free;

    const m = monthKey();

    // 2) incrementar uso (si ya llegó al límite, NO incrementa)
    //    - si regresa row, se incrementó y te da el used nuevo
    //    - si no regresa row, ya está en límite
    const incR = await pool.query(
      `
      WITH upsert AS (
        INSERT INTO api_usage (api_key, month, used)
        VALUES ($1, $2, 1)
        ON CONFLICT (api_key, month) DO UPDATE
          SET used = api_usage.used + 1
        WHERE api_usage.used < $3
        RETURNING used
      )
      SELECT used FROM upsert
      `,
      [key, m, limit]
    );

    if (incR.rowCount === 0) {
      // obtener used actual para responder bonito
      const curR = await pool.query(
        `SELECT used FROM api_usage WHERE api_key = $1 AND month = $2 LIMIT 1`,
        [key, m]
      );
      const usedNow = curR.rowCount ? Number(curR.rows[0].used) : limit;

      return res.status(429).json({
        ok: false,
        error: "Rate limit excedido",
        plan,
        limit,
        used: usedNow,
        month: m,
      });
    }

    // ok, incrementado
    return next();
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
}
