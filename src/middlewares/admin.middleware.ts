import { Request, Response, NextFunction } from "express";

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerKey = req.header("x-admin-key");

  if (!headerKey) {
    return res.status(401).json({
      ok: false,
      error: "Falta header x-admin-key",
    });
  }

  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey || headerKey !== adminKey) {
    return res.status(403).json({
      ok: false,
      error: "Admin key inválida o no autorizada",
    });
  }

  next();
}
