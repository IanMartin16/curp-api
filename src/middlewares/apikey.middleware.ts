// apikey.middleware.ts
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getActiveClientKeyMeta } from "../store/apiKeys.store";

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  // DEBUG TEMPORAL (quítalo después)
  const debugHeader = {
    xApiKey: req.headers["x-api-key"],
    xApiKey2: req.get("x-api-key"),
    auth: req.headers["authorization"],
    all: Object.keys(req.headers),
  };
  // console.log("HEADERS DEBUG", debugHeader);

  const raw =
    (req.get("x-api-key") ||
      (req.headers["x-api-key"] as string) ||
      req.get("apiKey") ||
      req.get("apikey") ||
      req.get("authorization") ||
      "") as string;

  const headerKey = raw.replace(/^Bearer\s+/i, "").trim();

  const isValidate = req.method === "POST" && req.path === "/validate";

  if (!headerKey) {
    // 👇 deja este error por ahora
    return res.status(401).json({
      ok: false,
      error: "Falta apiKey en request",
      debug: {
        receivedKeys: Object.keys(req.headers),
        hasXApiKey: !!req.headers["x-api-key"],
        hasAuth: !!req.headers["authorization"],
      },
    });
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

  return next();
}
