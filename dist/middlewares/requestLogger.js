"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const logger_1 = require("../logger");
function requestLogger(req, res, next) {
    const startedAt = Date.now();
    // guardamos info por si la necesitamos luego
    const apiKey = req.headers["x-api-key"] ||
        req.query["api_key"];
    res.on("finish", () => {
        const duration = Date.now() - startedAt;
        (0, logger_1.logRequest)({
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
