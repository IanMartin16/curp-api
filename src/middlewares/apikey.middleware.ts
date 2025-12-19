// apikey.middleware.ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getActiveClientKeyMeta } from "../store/apiKeys.store";

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerKey = req.header("x-api-key");

  // ✅ Solo permitir DEMO sin key en: POST /api/curp/validate
  const isValidate = req.method === "POST" && req.path === "/validate";

  // ------- DEMO SIN KEY -------
  if (!headerKey) {
    if (!isValidate) {
      return res.status(401).json({ ok: false, error: "Falta header x-api-key" });
    }

    const ipRaw =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    const demoId = crypto.createHash("sha256").update(ipRaw).digest("hex").slice(0, 24);

    (req as any).apiKeyId = "no-key";   // para logs/dashboard
    (req as any).plan = "free";
    (req as any).label = "demo";
    (req as any).isMasterKey = false;
    (req as any).isDemo = true;
    (req as any).demoId = demoId;

    return next();
  }

  // ------- MASTER KEY -------
  const masterKey = process.env.MASTER_API_KEY;
  const isMaster = !!masterKey && headerKey === masterKey;

  if (isMaster) {
    (req as any).apiKeyId = "master";
    (req as any).plan = "business";     // o el plan que quieras asignar a master
    (req as any).label = "master";
    (req as any).isMasterKey = true;
    (req as any).isDemo = false;
    return next();
  }

  // ------- CLIENT KEY (DB) -------
  const meta = await getActiveClientKeyMeta(headerKey);

  if (!meta) {
    return res.status(403).json({ ok: false, error: "API key inválida o no autorizada" });
  }

  // 🔥 OJO: NO guardes headerKey en req para que jamás se loguee
  (req as any).apiKeyId = meta.id;
  (req as any).plan = meta.plan;
  (req as any).label = meta.label;
  (req as any).isMasterKey = false;
  (req as any).isDemo = false;

  next();
}
