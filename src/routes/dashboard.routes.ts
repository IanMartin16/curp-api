import { Router } from "express";
import { pool } from "../db";

const router = Router();

function monthKeyUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // 2026-01
}

function planLimit(plan: string) {
  if (plan === "business") return 50000;
  if (plan === "developer") return 5000;
  return 0;
}

router.get("/dashboard/summary", async (req, res) => {
  try {
    const apiKey = req.header("x-api-key") || "";
    if (!apiKey) return res.status(401).json({ ok: false, error: "Missing API key" });

    const k = await pool.query(
      `SELECT plan, active, key_masked
       FROM api_keys
       WHERE key = $1
       LIMIT 1`,
      [apiKey]
    );

    if (!k.rowCount) return res.status(401).json({ ok: false, error: "Invalid API key" });
    const keyRow = k.rows[0];
    if (!keyRow.active) return res.status(403).json({ ok: false, error: "API key revoked" });

    const month = monthKeyUTC();

    const u = await pool.query(
      `SELECT COALESCE(used, 0) AS used
       FROM api_usage
       WHERE api_key = $1 AND month = $2
       LIMIT 1`,
      [apiKey, month]
    );

    const used = Number(u.rows[0]?.used || 0);
    const limit = planLimit(keyRow.plan);
    const remaining = Math.max(limit - used, 0);

    return res.json({
      ok: true,
      plan: keyRow.plan,
      limit,
      used,
      remaining,
      masked: keyRow.key_masked,
      month,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

router.get("/dashboard/daily", async (req, res) => {
  try {
    const apiKey = req.header("x-api-key") || "";
    if (!apiKey) return res.status(401).json({ ok: false, error: "Missing API key" });

    const days = Math.min(Number(req.query.days || 14), 60);

    // valida key (y opcionalmente active)
    const k = await pool.query(
      `SELECT active
       FROM api_keys
       WHERE key = $1
       LIMIT 1`,
      [apiKey]
    );
    if (!k.rowCount) return res.status(401).json({ ok: false, error: "Invalid API key" });
    if (!k.rows[0].active) return res.status(403).json({ ok: false, error: "API key revoked" });

    const rows = await pool.query(
      `SELECT day, used
       FROM api_usage_daily
       WHERE api_key = $1
       ORDER BY day DESC
       LIMIT $2`,
      [apiKey, days]
    );

    return res.json({ ok: true, items: rows.rows });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

export default router;
