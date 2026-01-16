import { Request, Response, NextFunction } from "express";
import { pool } from "../db";

const LIMITS = {
  free: 50,
  developer: 5_000,
  business: 50_000,
} as const;

type Plan = keyof typeof LIMITS;

function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const isMaster = Boolean((req as any).isMasterKey);
    if (isMaster) return next();

    // ✅ DEMO MODE (sin api key)
    const isDemo = Boolean((req as any).isDemo);
    if (isDemo) {
      const demoId = String((req as any).demoId || "");
      if (!demoId) return res.status(500).json({ ok: false, error: "demoId faltante" });

      const limit = 5;
      const day = dayKey();

      const incR = await pool.query(
        `
        WITH upsert AS (
          INSERT INTO demo_usage (demo_id, day, used)
          VALUES ($1, $2::date, 1)
          ON CONFLICT (demo_id, day) DO UPDATE
            SET used = demo_usage.used + 1,
                updated_at = now()
          WHERE demo_usage.used < $3
          RETURNING used
        )
        SELECT used FROM upsert
        `,
        [demoId, day, limit]
      );

      if (incR.rowCount === 0) {
        const curR = await pool.query(
          `SELECT used FROM demo_usage WHERE demo_id = $1 AND day = $2::date LIMIT 1`,
          [demoId, day]
        );
        const usedNow = curR.rowCount ? Number(curR.rows[0].used) : limit;

        return res.status(429).json({
          ok: false,
          error: "Límite demo excedido (5 por día)",
          limit,
          used: usedNow,
          day,
        });
      }

      return next();
    }

    // 🔑 NORMAL (con api key)
    const key = (req as any).__apiKey as string | undefined;
    if (!key) return res.status(401).json({ ok: false, error: "Falta apiKey en request" });

    // usa el plan que ya resolvió apiKeyMiddleware
    const plan = (String((req as any).plan || "free") as Plan) || "free";
    const limit = LIMITS[plan] ?? LIMITS.free;
    const m = monthKey();


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

    await pool.query(
      `
      INSERT INTO api_usage_daily (api_key, day, used)
      VALUES ($1, CURRENT_DATE, 1)
      ON CONFLICT (api_key, day) DO UPDATE
        SET used = api_usage_daily.used + 1,
            updated_at = NOW()
      `,
        [key]
      );


    if (incR.rowCount === 0) {
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

    return next();
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
}
