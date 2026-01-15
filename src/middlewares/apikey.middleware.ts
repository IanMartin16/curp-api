// apikey.middleware.ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getActiveClientKeyMeta } from "../store/apiKeys.store";

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  // ✅ Endpoint donde permitimos DEMO sin key
  const isValidate = req.method === "POST" && req.path === "/validate";

  // 1) Tomar key desde headers (x-api-key o Authorization: Bearer ...)
  const raw =
    (req.get("x-api-key") ||
      (req.headers["x-api-key"] as string) ||
      req.get("apiKey") ||
      req.get("apikey") ||
      req.get("authorization") ||
      "") as string;

  const headerKey = raw.replace(/^Bearer\s+/i, "").trim();

  // 2) --- DEMO MODE (sin api key) ---
  // ✅ Solo permitir DEMO si es POST /validate
  if (!headerKey) {
    if (!isValidate) {
      return res.status(401).json({ ok: false, error: "Falta header x-api-key" });
    }

    // Generar demoId por IP (estable por día con tu demo_usage)
    const ipRaw =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    const demoId = crypto.createHash("sha256").update(ipRaw).digest("hex").slice(0, 24);

    // Flags para que rateLimitMiddleware lo detecte
    (req as any).apiKeyId = "demo";
    (req as any).plan = "free";
    (req as any).label = "demo";
    (req as any).isMasterKey = false;
    (req as any).isDemo = true;
    (req as any).demoId = demoId;

    // Importante: NO setear __apiKey porque no hay key real
    return next();
  }

  // 3) --- MASTER KEY ---
  const masterKey = process.env.MASTER_API_KEY;
  const isMaster = !!masterKey && headerKey === masterKey;

  if (isMaster) {
    (req as any).apiKeyId = "master";
    (req as any).plan = "business"; // o lo que quieras
    (req as any).label = "master";
    (req as any).isMasterKey = true;
    (req as any).isDemo = false;

    // Para rateLimit (si lo usas) y logs
    (req as any).__apiKey = headerKey;
    return next();
  }

  // 4) --- CLIENT KEY (DB) ---
  const meta = await getActiveClientKeyMeta(headerKey);

  if (!meta) {
    return res.status(403).json({ ok: false, error: "API key inválida o no autorizada" });
  }

  // ✅ Guardar la apiKey SOLO para rateLimit/usage (no la imprimas en logs)
  (req as any).__apiKey = headerKey;

  (req as any).apiKeyId = meta.id;
  (req as any).plan = meta.plan;
  (req as any).label = meta.label;
  (req as any).isMasterKey = false;
  (req as any).isDemo = false;

  return next();
}
