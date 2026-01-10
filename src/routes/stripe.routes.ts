//stripe.routes.ts
import { Router } from "express";
import { pool } from "../db";
import crypto from "crypto";

const router = Router();

const INTERNAL_SECRET = process.env.INTERNAL_WEBHOOK_SECRET || "";

// helper
function genKey() {
  return "curp_" + crypto.randomBytes(16).toString("hex");
}

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

    if (!plan || !subscriptionId) {
      return res.status(400).json({ ok: false, error: "Falta plan o subscriptionId" });
    }

    // 1) si ya existe una key activa para esa subscription, no crees otra
    const existing = await pool.query(
      `SELECT id, key, plan, active
       FROM api_keys
       WHERE stripe_subscription_id = $1
       LIMIT 1`,
      [subscriptionId]
    );

    if (existing.rowCount) {
      return res.json({ ok: true, key: existing.rows[0], existing: true });
    }

    // 2) crear nueva key
    const id = `key_${crypto.randomBytes(6).toString("hex")}`;
    const newKey = genKey();
    const label = email ? `stripe:${email}` : "stripe";

    const ins = await pool.query(
      `INSERT INTO api_keys (id, key, label, plan, active, stripe_customer_id, stripe_subscription_id, stripe_session_id)
       VALUES ($1, $2, $3, $4, true, $5, $6, $7)
       RETURNING id, key, label, plan, active, created_at, revoked_at`,
      [id, newKey, label, plan, customerId, subscriptionId, sessionId]
    );
    console.log("FULFILL:", { id, newKey, label, plan, customerId, subscriptionId, sessionId });

    return res.status(201).json({ ok: true, key: ins.rows[0], existing: false });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

export default router;

