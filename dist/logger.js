"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRequest = logRequest;
// src/logger.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_DIR = process.env.LOG_DIR || path_1.default.join(process.cwd(), "logs");
// Nos aseguramos de que exista la carpeta
if (!fs_1.default.existsSync(LOG_DIR)) {
    fs_1.default.mkdirSync(LOG_DIR, { recursive: true });
}
function logRequest(entry) {
    const date = entry.timestamp.slice(0, 10); // "YYYY-MM-DD"
    const filePath = path_1.default.join(LOG_DIR, `requests-${date}.jsonl`);
    const line = JSON.stringify(entry) + "\n";
    fs_1.default.appendFile(filePath, line, (err) => {
        if (err) {
            console.error("[LOG ERROR] No se pudo escribir el log:", err);
        }
    });
}
