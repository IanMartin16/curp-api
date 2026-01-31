import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { pool } from "../db";

const isLite = () => (process.env.CURPIFY_MODE ?? "full") === "lite";

const LITE_ALLOWED = new Set([
  "/api/curp/validate",
  "/api/meta",
]);

function getClientIp(req: Request) {
  // Railway/Proxies suelen mandar esto
  const xff = req.header("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0] : req.ip) ?? "unknown";
  return ip.trim();
}

function hashIp(ip: string) {
  const salt = process.env.LITE_IP_SALT ?? "";
  return crypto.createHash("sha256").update(ip + "|" + salt).digest("hex");
}

export function liteGuard(req: Request, res: Response, next: NextFunction) {
  if (!isLite()) return next();

  if (!LITE_ALLOWED.has(req.path)) {
    return res.status(404).json({ ok: false, error: "Not found" });
  }
  next();
}

export async function liteDailyLimit(req: Request, res: Response, next: NextFunction) {
  if (!isLite()) return next();

  const limit = Number(process.env.LITE_DAILY_LIMIT ?? "10");
  const ipHash = hashIp(getClientIp(req));

  const sql = `
    INSERT INTO lite_usage (day, ip_hash, count)
    VALUES (CURRENT_DATE, $1, 1)
    ON CONFLICT (day, ip_hash)
    DO UPDATE SET count = lite_usage.count + 1
    RETURNING count;
  `;

  const { rows } = await pool.query(sql, [ipHash]);
  const count = rows?.[0]?.count ?? 1;

  if (count > limit) {
    return res.status(429).json({
      ok: false,
      error: "Daily limit reached",
      daily_limit: limit,
      upgrade_url: "https://evi_link.dev/pricing",
    });
  }

  res.setHeader("X-Lite-Remaining", String(Math.max(0, limit - count)));
  next();
}
