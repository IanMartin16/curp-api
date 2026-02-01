import type { Request, Response, NextFunction } from "express";

function isLite() {
  return (process.env.CURPIFY_MODE ?? "full") === "lite";
}

export function rapidApiGate(req: Request, res: Response, next: NextFunction) {
  if (!isLite()) return next();

  // ✅ Allow health check without auth (RapidAPI requires it)
  if (req.path === "/api/health") return next();

  const enforceOnly = (process.env.RAPIDAPI_ENFORCE_ONLY ?? "false") === "true";
  const secret = process.env.RAPIDAPI_SECRET ?? "";

  // Headers típicos de RapidAPI
  const rapidKey = req.header("x-rapidapi-key");
  const rapidHost = req.header("x-rapidapi-host");

  // Tu “puerta” privada (para pruebas / acceso directo controlado)
  const proxySecret = req.header("x-rapidapi-proxy-secret");

  const isRapid = !!rapidKey || !!rapidHost;
  const isAllowedDirect = secret && proxySecret === secret;

  if (enforceOnly && !(isRapid || isAllowedDirect)) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized",
      hint: "This Lite endpoint is accessible only via RapidAPI."
    });
  }

  // marca el request como Rapid si viene de RapidAPI
  (req as any).__isRapid = isRapid;
  next();
}

export function rapidApiBypassLimit(req: Request, _res: Response, next: NextFunction) {
  if (!isLite()) return next();

  const bypass = (process.env.RAPIDAPI_BYPASS_DAILY_LIMIT ?? "false") === "true";
  const isRapid = (req as any).__isRapid === true;

  if (bypass && isRapid) {
    (req as any).__bypassLiteLimit = true;
  }

  next();
}
