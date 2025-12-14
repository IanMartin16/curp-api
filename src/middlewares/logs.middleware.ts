import { Request, Response, NextFunction } from "express";
import { pool } from "../db"; // ajusta la ruta si tu pool está en otro lado

export function logsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    const logEntry = {
      ts: new Date().toISOString(),
      ip: String(req.ip || req.headers["x-forwarded-for"] || "unknown"),
      api_key: String((req as any).apiKey || "no-key"),
      endpoint: String(req.originalUrl || ""),
      method: String(req.method || ""),
      duration_ms: duration,
      status_code: res.statusCode,
      success: res.statusCode < 400,
      curp: req.body?.curp ? String(req.body.curp) : null,
    };

    // Fire-and-forget (no bloquea la respuesta)
    void pool
      .query(
        `
        INSERT INTO api_logs
          (ts, ip, api_key, endpoint, method, duration_ms, status_code, success, curp)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          logEntry.ts,
          logEntry.ip,
          logEntry.api_key,
          logEntry.endpoint,
          logEntry.method,
          logEntry.duration_ms,
          logEntry.status_code,
          logEntry.success,
          logEntry.curp,
        ]
      )
      .catch((err) => {
        console.error("Error insertando log en Postgres:", err?.message || err);
      });
  });

  next();
}

