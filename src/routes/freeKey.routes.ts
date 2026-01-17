import { Router } from "express";
import crypto from "crypto";
import { pool } from "../db"; // si tu pool está en otro path, ajusta (a veces es ../db/db o ../db/index)

const r = Router();

const id = crypto.randomUUID();

function maskKey(k: string) {
  if (k.length <= 10) return "****";
  return k.slice(0, 6) + "..." + k.slice(-4);
}

// POST /api/keys/free  -> crea API key FREE sin Stripe
r.post("/keys/free", async (_req, res) => {
  try {
    const label = "free";
    const plan = "free";

    const newKey = "curp_" + crypto.randomBytes(16).toString("hex");
    const masked = maskKey(newKey);

    const ins = await pool.query(
      `INSERT INTO api_keys (id, key, key_masked, label, plan, active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, key, key_masked, label, plan, active, created_at`,
      [ id, newKey, masked, label, plan]
    );

    // Devuelve la key completa SOLO una vez
    return res.status(200).json({ ok: true, item: ins.rows[0] });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Error" });
  }
});

export default r;
