import { Request, Response, NextFunction } from "express";
import { loadApiKeys } from "../store/apiKeys.store";
import { loadUsage, saveUsage, monthKey } from "../store/usage.store";

const LIMITS = {
  free: 500,
  developer: 50_000,
  business: 500_000,
} as const;

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = (req as any).apiKey as string | undefined;
  const isMaster = Boolean((req as any).isMasterKey);

  // master no limita
  if (isMaster) return next();
  if (!key) return res.status(401).json({ ok: false, error: "Falta apiKey en request" });

  // obtener plan desde apiKeys.store
  const record = loadApiKeys().find(k => k.active && k.key === key);
  const plan = (record?.plan || "free") as "free" | "developer" | "business";
  const limit = LIMITS[plan] ?? LIMITS.free;

  const db = loadUsage();
  const m = monthKey();

  db[key] = db[key] || {};
  db[key][m] = db[key][m] || 0;

  if (db[key][m] >= limit) {
    return res.status(429).json({
      ok: false,
      error: "Rate limit excedido",
      plan,
      limit,
      used: db[key][m],
      month: m,
    });
  }

  db[key][m] += 1;
  saveUsage(db);

  next();
}
