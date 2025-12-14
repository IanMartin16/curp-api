// apikey.middleware.ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { isActiveClientKey } from "../store/apiKeys.store";

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerKey = req.header("x-api-key");

  // ✅ Solo permitir DEMO sin key en: POST /api/curp/validate
  const isValidate = req.method === "POST" && req.path === "/validate";

  if (!headerKey) {
    if (!isValidate) {
      return res.status(401).json({ ok: false, error: "Falta header x-api-key" });
    }

    // DEMO MODE
    const ipRaw =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    const demoId = crypto.createHash("sha256").update(ipRaw).digest("hex").slice(0, 24);

    (req as any).apiKey = undefined;     // para logs quede como no-key
    (req as any).isMasterKey = false;
    (req as any).isDemo = true;
    (req as any).demoId = demoId;
    return next();
  }

  const masterKey = process.env.MASTER_API_KEY;
  const isMaster = masterKey && headerKey === masterKey;

  const isClientKey = isMaster ? false : await isActiveClientKey(headerKey);

  if (!isMaster && !isClientKey) {
    return res.status(403).json({ ok: false, error: "API key inválida o no autorizada" });
  }

  (req as any).apiKey = headerKey;
  (req as any).isMasterKey = isMaster;
  (req as any).isDemo = false;

  next();
}
