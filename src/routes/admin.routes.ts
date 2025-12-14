import { Router } from "express";
import { adminMiddleware } from "../middlewares/admin.middleware";
import {
  loadApiKeys,
  createApiKey,
  revokeApiKey,
  PlanType,
} from "../store/apiKeys.store";
import { pool } from "../db";

const router = Router();

router.get("/keys", adminMiddleware, async (req, res) => {
  try {
    const keys = await loadApiKeys();

    const safeKeys = keys.map((k) => ({
      id: k.id,
      key: k.key,
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

    return res.status(201).json({
      ok: true,
      key: newKey,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

// POST /api/admin/keys/revoke  -> revoca una key por id
router.post("/keys/revoke", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.body as { id?: string };

    if (!id) {
      return res.status(400).json({ ok: false, error: "Falta id de la key" });
    }

    const ok = await revokeApiKey(id);

    if (!ok) {
      return res.status(404).json({ ok: false, error: "Key no encontrada" });
    }

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

router.get("/stats", adminMiddleware, async (req, res) => {
  try {
    // total
    const totalR = await pool.query(`SELECT COUNT(*)::int AS total FROM api_logs`);
    const total = totalR.rows?.[0]?.total ?? 0;

    // byDay (YYYY-MM-DD)
    const byDayR = await pool.query(`
      SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS day, COUNT(*)::int AS c
      FROM api_logs
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    const byDay: Record<string, number> = {};
    for (const row of byDayR.rows) {
      byDay[row.day] = row.c;
    }

    // byKey
    const byKeyR = await pool.query(`
      SELECT COALESCE(NULLIF(api_key, ''), 'no-key') AS k, COUNT(*)::int AS c
      FROM api_logs
      GROUP BY 1
      ORDER BY c DESC
    `);

    const byKey: Record<string, number> = {};
    for (const row of byKeyR.rows) {
      byKey[row.k] = row.c;
    }

    return res.json({ ok: true, total, byDay, byKey });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

export default router;
