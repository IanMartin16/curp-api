// src/logger.ts
import fs from "fs";
import path from "path";

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");

// Nos aseguramos de que exista la carpeta
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export interface ApiLogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip?: string;
  userAgent?: string;
  apiKey?: string;
  errorMessage?: string | null;
}

export function logRequest(entry: ApiLogEntry) {
  const date = entry.timestamp.slice(0, 10); // "YYYY-MM-DD"
  const filePath = path.join(LOG_DIR, `requests-${date}.jsonl`);

  const line = JSON.stringify(entry) + "\n";

  fs.appendFile(filePath, line, (err) => {
    if (err) {
      console.error("[LOG ERROR] No se pudo escribir el log:", err);
    }
  });
}
