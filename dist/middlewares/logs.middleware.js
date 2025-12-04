"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logsMiddleware = logsMiddleware;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logsDir = path_1.default.join(__dirname, "../../logs");
const logFilePath = path_1.default.join(logsDir, "api.log");
function logsMiddleware(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        const logEntry = {
            ts: new Date().toISOString(),
            ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
            key: req.apiKey || "no-key",
            endpoint: req.originalUrl,
            method: req.method,
            duration,
            statusCode: res.statusCode,
            success: res.statusCode < 400,
            curp: req.body?.curp || null,
        };
        try {
            if (!fs_1.default.existsSync(logsDir)) {
                fs_1.default.mkdirSync(logsDir, { recursive: true });
            }
            fs_1.default.appendFileSync(logFilePath, JSON.stringify(logEntry) + "\n");
        }
        catch (err) {
            console.error("Error escribiendo log:", err);
        }
    });
    next();
}
