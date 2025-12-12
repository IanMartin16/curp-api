import { Request, Response, NextFunction } from "express";

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.header("x-admin-key");
  const adminKey = process.env.ADMIN_API_KEY;

  if (!header || header !== adminKey) {
    return res.status(401).json({
      ok: false,
      error: "No autorizado (x-admin-key inválida)"
    });
  }

  next();
}
