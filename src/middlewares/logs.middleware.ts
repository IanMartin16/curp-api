import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";

const logsDir = path.join(__dirname, "../../logs");
const logFilePath = path.join(logsDir, "api.log");

export function logsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    const logEntry = {
      ts: new Date().toISOString(),
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      key: (req as any).apiKey || "no-key",
      endpoint: req.originalUrl,
      method: req.method,
      duration,
      statusCode: res.statusCode,
      success: res.statusCode < 400,
      curp: req.body?.curp || null,
    };

    try {
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + "\n");
    } catch (err) {
      console.error("Error escribiendo log:", err);
    }
  });

  next();
}
