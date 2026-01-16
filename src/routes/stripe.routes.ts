import { Router } from "express";
import { pool } from "../db";
import crypto from "crypto";

const id = crypto.randomUUID();
const router = Router();
const INTERNAL_SECRET = process.env.INTERNAL_WEBHOOK_SECRET || "";

function genKey() {
  return "curp_" + crypto.randomBytes(16).toString("hex");
}

function maskKey(k: string) {
  if (!k) return "";
  const last4 = k.slice(-4);
  return `curp_****${last4}`;
}

// ✅ fulfill (OJO: sin "/api" aquí adentro)
router.post("/stripe/fulfill", async (req, res) => {
  try {
    const secret = req.header("x-internal-secret") || "";
    if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const { plan, email, customerId, subscriptionId, sessionId } = req.body as {
      plan?: "developer" | "business";
      email?: string | null;
      customerId?: string | null;
      subscriptionId?: string | null;
      sessionId?: string | null;
    };

    if (!plan || !subscriptionId || !sessionId) {
      return res.status(400).json({ ok: false, error: "Missing plan, subscriptionId or sessionId" });
    }

    const existing = await pool.query(
      `SELECT id, key, plan, active, shown_at, key_masked
       FROM api_keys
       WHERE stripe_subscription_id = $1
       LIMIT 1`,
      [subscriptionId]
    );

    if (existing.rowCount) {
      return res.json({ ok: true, key: existing.rows[0], existing: true });
    }

    const newKey = genKey();
    const label = email ? `stripe:${email}` : "stripe";
    const masked = maskKey(newKey);

    const ins = await pool.query(
      `INSERT INTO api_keys (id, key, key_masked, label, plan, active, stripe_customer_id, stripe_subscription_id, stripe_session_id)
       VALUES ($1, $2, $3, $4, true, $5, $6, $7)
       RETURNING id, key_masked, label, plan, active, created_at, revoked_at`,
      [newKey, masked, label, plan, customerId, subscriptionId, sessionId]
    );

    return res.status(201).json({ ok: true, key: ins.rows[0], existing: false });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

// ✅ revelar SOLO UNA VEZ (ATÓMICO)
router.get("/stripe/reveal-once", async (req, res) => {
  try {
    const secret = req.header("x-internal-secret") || "";
    if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const sessionId = String(req.query.session_id || "");
    if (!sessionId) return res.status(400).json({ ok: false, error: "Missing session_id" });

    // 1) primera vez: marca shown_at y regresa key completa
    const upd = await pool.query(
      `UPDATE api_keys
         SET shown_at = NOW()
       WHERE stripe_session_id = $1
         AND shown_at IS NULL
       RETURNING key, key_masked`,
      [sessionId]
    );

    if (upd.rowCount) {
      const row = upd.rows[0];
      return res.json({
        ok: true,
        firstTime: true,
        apiKey: row.key,
        masked: row.key_masked,
      });
    }

    // 2) ya se mostró: regresa solo masked
    const row = await pool.query(
      `SELECT key_masked
       FROM api_keys
       WHERE stripe_session_id = $1
       LIMIT 1`,
      [sessionId]
    );

    if (!row.rowCount) {
      return res.status(404).json({ ok: false, error: "No api_key for session_id" });
    }

    return res.json({
      ok: true,
      firstTime: false,
      apiKey: null,
      masked: row.rows[0].key_masked,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

// ✅ customer-by-key (para portal)
router.get("/stripe/customer-by-key", async (req, res) => {
  try {
    const secret = req.header("x-internal-secret") || "";
    if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const apiKey = String(req.query.api_key || "");
    if (!apiKey) return res.status(400).json({ ok: false, error: "Missing api_key" });

    const q = await pool.query(
      `SELECT stripe_customer_id
       FROM api_keys
       WHERE key = $1
       LIMIT 1`,
      [apiKey]
    );

    if (!q.rowCount || !q.rows[0].stripe_customer_id) {
      return res.status(404).json({ ok: false, error: "No customer for key" });
    }

    return res.json({ ok: true, customerId: q.rows[0].stripe_customer_id });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

export default router;
