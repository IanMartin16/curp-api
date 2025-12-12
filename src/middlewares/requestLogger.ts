// src/middlewares/requestLogger.ts
import type { Request, Response, NextFunction } from "express";
import { logRequest } from "../logger";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  // guardamos info por si la necesitamos luego
  const apiKey =
    (req.headers["x-api-key"] as string | undefined) ||
    (req.query["api_key"] as string | undefined);

  res.on("finish", () => {
    const duration = Date.now() - startedAt;

    logRequest({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      apiKey,
      errorMessage: res.statusCode >= 400 ? res.statusMessage || null : null,
    });
  });

  next();
}