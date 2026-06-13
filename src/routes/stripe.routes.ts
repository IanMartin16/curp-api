import { Router } from "express";
import { pool } from "../db";
import crypto from "crypto";

type SyncSubscriptionBody = {
  subscriptionId?: string | null;
  status?: string | null;
  cancelAtPeriodEnd?: boolean;
  scheduledCancellation?: boolean | null;
  cancelAt?: number | null;
  currentPeriodEnd?: number | null;
  accessEndsAt?: number | null;
  priceId?: string | null;
  productId?: string | null;
};

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
      return res.status(401).json({
        ok: false,
        error: "Unauthorized",
      });
    }

    const {
      plan,
      email,
      customerId,
      subscriptionId,
      sessionId,
    } = req.body as {
      plan?: string;
      email?: string | null;
      customerId?: string | null;
      subscriptionId?: string | null;
      sessionId?: string | null;
    };

    const validPlans = new Set(["developer", "business"]);

    if (!plan || !validPlans.has(plan)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid or missing plan",
      });
    }

    if (!subscriptionId || !sessionId) {
      return res.status(400).json({
        ok: false,
        error: "Missing subscriptionId or sessionId",
      });
    }

    const newKey = genKey();
    const newId = crypto.randomUUID();
    const masked = maskKey(newKey);
    const label = email ? `stripe:${email}` : "stripe";

    /*
     * Inserción atómica:
     * si webhook y success page llegan juntos,
     * solo una llamada crea la key.
     */
    const inserted = await pool.query(
      `
        INSERT INTO api_keys (
          id,
          key,
          key_masked,
          label,
          plan,
          active,
          stripe_customer_id,
          stripe_subscription_id,
          stripe_session_id
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          true,
          $6,
          $7,
          $8
        )
        ON CONFLICT (stripe_subscription_id)
        WHERE stripe_subscription_id IS NOT NULL
        DO NOTHING
        RETURNING
          id,
          key_masked,
          label,
          plan,
          active,
          shown_at,
          revoked_at,
          stripe_subscription_id,
          stripe_session_id
      `,
      [
        newId,
        newKey,
        masked,
        label,
        plan,
        customerId ?? null,
        subscriptionId,
        sessionId,
      ]
    );

    const createdRow = inserted.rows?.[0] ?? null;

    if (createdRow) {
      console.info("stripe_fulfill_key_created", {
        apiKeyId: createdRow.id,
        subscriptionId,
        sessionId,
        plan,
      });

      return res.status(201).json({
        ok: true,
        key: createdRow,
        existing: false,
      });
    }

    /*
     * Si no insertó, la suscripción ya tiene una key.
     */
    const existing = await pool.query(
      `
        SELECT
          id,
          key_masked,
          label,
          plan,
          active,
          shown_at,
          revoked_at,
          stripe_subscription_id,
          stripe_session_id
        FROM api_keys
        WHERE stripe_subscription_id = $1
        LIMIT 1
      `,
      [subscriptionId]
    );

    const existingKey = existing.rows?.[0] ?? null;

    if (!existingKey) {
      console.error("stripe_fulfill_existing_key_missing", {
        subscriptionId,
        sessionId,
        insertedRowCount: inserted.rowCount,
      });

      return res.status(409).json({
        ok: false,
        error:
          "Subscription already exists but its API key could not be retrieved",
      });
    }

    if (!existingKey.active || existingKey.revoked_at) {
      return res.status(409).json({
        ok: false,
        error: "API key for this subscription is revoked",
        existing: true,
        key: existingKey,
      });
    }

    console.info("stripe_fulfill_existing_key_found", {
      apiKeyId: existingKey.id,
      subscriptionId,
      sessionId,
      plan: existingKey.plan,
    });

    return res.status(200).json({
      ok: true,
      key: existingKey,
      existing: true,
    });
  } catch (error: any) {
    console.error("stripe_fulfill_failed", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      constraint: error?.constraint,
      stack: error?.stack,
    });

    return res.status(500).json({
      ok: false,
      error: error?.message || "Error",
    });
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

// ✅ sync subscription status from Stripe webhook
router.post("/stripe/sync-subscription", async (req, res) => {
  try {
    const secret = req.header("x-internal-secret") || "";

    if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized",
      });
    }

    const { subscriptionId, status, 
      cancelAtPeriodEnd = false,
      scheduledCancellation = null,
      cancelAt = null,
      currentPeriodEnd = null,
      accessEndsAt = null,
      priceId = null,
      productId = null,
     } = req.body as SyncSubscriptionBody;


    if (!subscriptionId || !status) {
      return res.status(400).json({
        ok: false,
        error: "Missing subscriptionId or status",
      });
    }

    const activeStatuses = new Set(["active", "trialing"]);
    const inactiveStatuses = new Set([
      "canceled",
      "unpaid",
      "incomplete_expired",
      "past_due",
      "paused",
    ]);

    if (
      !activeStatuses.has(status) &&
      !inactiveStatuses.has(status)
    ) {
      return res.status(400).json({
        ok: false,
        error: `Unsupported subscription status: ${status}`,
      });
    }

    const shouldBeActive = activeStatuses.has(status);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const updated = await client.query(
        `
          UPDATE api_keys
          SET active = $2,
              revoked_at = CASE
                WHEN $2 = false
                  THEN COALESCE(revoked_at, NOW())
                ELSE revoked_at
              END,
              subscription_status = $3,

              cancel_at_period_end =
                COALESCE($4::BOOLEAN, cancel_at_period_end),

              cancellation_scheduled = 
                COALESCE($5::BOOLEAN, cancellation_scheduled),
                
              stripe_cancel_at = CASE
                WHEN $6::BIGINT IS NOT NULL
                  THEN to_timestamp($6::BIGINT)
                ELSE stripe_cancel_at
              END,
              
              current_period_end = CASE
                WHEN $7::BIGINT IS NOT NULL
                  THEN to_timestamp($7::BIGINT)
                ELSE current_period_end
              END,    

              access_ends_at = CASE
                WHEN $8::BIGINT IS NOT NULL
                  THEN to_timestamp($8::BIGINT)
                WHEN $5::BOOLEAN = false
                  THEN NULL  
                ELSE access_ends_at
              END,

              stripe_price_id =
                COALESCE($9::TEXT, stripe_price_id),

              stripe_product_id =
                COALESCE($10::TEXT, stripe_product_id),

              updated_at = NOW()
          WHERE stripe_subscription_id = $1
          RETURNING
            id,
            key,
            key_masked,
            label,
            plan,
            active,
            revoked_at,
            subscription_status,
            cancel_at_period_end,
            cancellation_scheduled,
            stripe_cancel_at,
            current_period_end,
            access_ends_at,
            stripe_price_id,
            stripe_product_id,
            updated_at
          `,
        [
          subscriptionId,
          shouldBeActive,
          status,
          cancelAtPeriodEnd,
          scheduledCancellation,
          cancelAt,
          currentPeriodEnd,
          accessEndsAt,
          priceId,
          productId,
        ]
      );

      if (!updated.rowCount) {
        await client.query("ROLLBACK");

        console.error("stripe_subscription_sync_key_not_found", {
          subscriptionId,
          status,
        });

        return res.status(404).json({
          ok: false,
          error: "No api_key found for subscriptionId",
        });
      }

      if (!shouldBeActive) {
        for (const row of updated.rows) {
          await client.query(
            `
              UPDATE dashboard_sessions
              SET revoked_at = COALESCE(revoked_at, NOW())
              WHERE api_key = $1
                AND revoked_at IS NULL
            `,
            [row.key]
          );
        }
      }

      await client.query("COMMIT");

      const key = updated.rows[0];

      console.info("stripe_subscription_sync_completed", {
        subscriptionId,
        status,
        active: shouldBeActive,
        apiKeyId: key.id,
      });

      return res.json({
        ok: true,
        subscriptionId,
        status,
        active: shouldBeActive,
        key: {
          id: key.id,
          key_masked: key.key_masked,
          label: key.label,
          plan: key.plan,
          active: key.active,
          revoked_at: key.revoked_at,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("stripe_subscription_sync_failed", {
      error: error?.message || "Unknown error",
    });

    return res.status(500).json({
      ok: false,
      error: error?.message || "Error",
    });
  }
});