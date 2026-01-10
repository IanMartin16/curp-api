import { Router } from "express";
import crypto from "crypto";
import { pool } from "../db";

const router = Router();
const INTERNAL_SECRET = process.env.INTERNAL_WEBHOOK_SECRET || "";

function genToken() {
  return crypto.randomBytes(24).toString("hex");
}

function maskKey(k: string) {
  if (!k) return "";
  if (k.length <= 8) return "****";
  return `${k.slice(0, 6)}****${k.slice(-4)}`;
}

// Crea cookie-session para dashboard a partir del stripe session_id
router.post("/stripe/dashboard-session", async (req, res) => {
  try {
    const secret = req.header("x-internal-secret") || "";
    if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "Falta sessionId" });
    }

    // 1) busca la api_key que ya se creó en fulfill (por stripe_session_id)
    const kR = await pool.query(
      `
      SELECT id, key, plan
      FROM api_keys
      WHERE stripe_session_id = $1
      LIMIT 1
      `,
      [sessionId]
    );

    if (!kR.rowCount) {
      return res.status(404).json({ ok: false, error: "No existe api_key para ese sessionId (¿faltó fulfill?)" });
    }

    const apiKey = String(kR.rows[0].key);
    const plan = String(kR.rows[0].plan || "free");

    // 2) si ya existe session, reúsala (y NO reveles key de nuevo)
    const existing = await pool.query(
      `
      SELECT token, revealed_at
      FROM dashboard_sessions
      WHERE stripe_session_id = $1
      LIMIT 1
      `,
      [sessionId]
    );

    if (existing.rowCount) {
      return res.json({
        ok: true,
        token: existing.rows[0].token,
        plan,
        revealKey: false,
        apiKeyMasked: maskKey(apiKey),
      });
    }

    // 3) crea session nueva
    const token = genToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 días

    await pool.query(
      `
      INSERT INTO dashboard_sessions (token, api_key, stripe_session_id, expires_at, revealed_at)
      VALUES ($1, $2, $3, $4, now())
      `,
      [token, apiKey, sessionId, expiresAt.toISOString()]
    );

    // ✅ aquí SÍ revelamos la key una sola vez
    return res.status(201).json({
      ok: true,
      token,
      plan,
      revealKey: true,
      apiKey,             // full (solo 1 vez)
      apiKeyMasked: maskKey(apiKey),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});
