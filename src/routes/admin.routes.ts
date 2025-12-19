// src/routes/admin.routes.ts
import { Router } from "express";
import { adminMiddleware } from "../middlewares/admin.middleware";
import { loadApiKeys, createApiKey, revokeApiKey, PlanType } from "../store/apiKeys.store";
import { pool } from "../db";

const router = Router();

router.get("/keys", adminMiddleware, async (_req, res) => {
  try {
    const keys = await loadApiKeys();

    // ✅ NO regreses la key secreta aquí
    const safeKeys = keys.map((k) => ({
      id: k.id,
      label: k.label,
      plan: k.plan,
      active: k.active,
      createdAt: k.createdAt,
      revokedAt: k.revokedAt ?? null,
    }));

    return res.json({ ok: true, keys: safeKeys });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

router.post("/keys", adminMiddleware, async (req, res) => {
  try {
    const { label, plan } = req.body as { label?: string; plan?: PlanType };

    const cleanPlan: PlanType =
      plan && ["free", "developer", "business"].includes(plan) ? plan : "free";

    const newKey = await createApiKey({
      label: label?.trim() || undefined,
      plan: cleanPlan,
    });

    // ✅ Aquí sí regresas la key (solo una vez)
    return res.status(201).json({
      ok: true,
      key: newKey,
      warning: "Copia esta key ahora. No se mostrará de nuevo en el dashboard.",
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

router.post("/keys/revoke", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.body as { id?: string };

    if (!id) return res.status(400).json({ ok: false, error: "Falta id de la key" });

    const ok = await revokeApiKey(id);
    if (!ok) return res.status(404).json({ ok: false, error: "Key no encontrada" });

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

router.get("/stats", adminMiddleware, async (_req, res) => {
  try {
    // total
    const totalR = await pool.query(`SELECT COUNT(*)::int AS total FROM api_logs`);
    const total = totalR.rows?.[0]?.total ?? 0;

    // byDay
    const byDayR = await pool.query(`
      SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS day, COUNT(*)::int AS c
      FROM api_logs
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    const byDay: Record<string, number> = {};
    for (const row of byDayR.rows) byDay[row.day] = row.c;

    /**
     * ✅ byKey SIN exponer la key:
     * - api_logs.api_key guarda el headerKey (o "no-key")
     * - hacemos LEFT JOIN contra api_keys.key
     * - mostramos label + plan si existe, si no: DEMO / UNKNOWN
     */
    const byKeyR = await pool.query(`
      SELECT
        CASE
          WHEN COALESCE(NULLIF(l.api_key, ''), 'no-key') = 'no-key' THEN 'DEMO'
          WHEN k.id IS NULL THEN 'UNKNOWN'
          ELSE (k.label || ' (' || k.plan || ')')
        END AS k,
        COUNT(*)::int AS c
      FROM api_logs l
      LEFT JOIN api_keys k
        ON k.key = l.api_key
      GROUP BY 1
      ORDER BY c DESC
    `);

    const byKey: Record<string, number> = {};
    for (const row of byKeyR.rows) byKey[row.k] = row.c;

    // ✅ DEMO stats (hoy) usando demo_usage
    let demoUsedToday = 0;
    let demoUniqueToday = 0;

    try {
      const demoR = await pool.query(`
        SELECT
          COALESCE(SUM(used),0)::int AS used_today,
          COUNT(*)::int AS unique_today
        FROM demo_usage
        WHERE day = CURRENT_DATE
      `);

      demoUsedToday = demoR.rows?.[0]?.used_today ?? 0;
      demoUniqueToday = demoR.rows?.[0]?.unique_today ?? 0;
    } catch {
      demoUsedToday = 0;
      demoUniqueToday = 0;
    }

    return res.json({ ok: true, total, byDay, byKey, demoUsedToday, demoUniqueToday });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

export default router;
