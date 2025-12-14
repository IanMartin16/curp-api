import { Request, Response, NextFunction } from "express";
import { isActiveClientKey } from "../store/apiKeys.store";

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerKeyRaw = req.header("x-api-key");
  const headerKey = headerKeyRaw?.trim();

  if (!headerKey) {
    return res.status(401).json({ ok: false, error: "Falta header x-api-key" });
  }

  const masterKey = process.env.MASTER_API_KEY?.trim();
  const isMaster = Boolean(masterKey && headerKey === masterKey);

  const isClientKey = isMaster ? false : await isActiveClientKey(headerKey);

  if (!isMaster && !isClientKey) {
    return res.status(403).json({ ok: false, error: "API key inválida o no autorizada" });
  }

  (req as any).apiKey = headerKey;
  (req as any).isMasterKey = isMaster;

  next();
}
