"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyMiddleware = apiKeyMiddleware;
const CLIENT_KEYS = [
    "cliente_demo_001",
    "cliente_demo_002",
];
function apiKeyMiddleware(req, res, next) {
    const headerKey = req.header("x-api-key");
    if (!headerKey) {
        return res.status(401).json({
            ok: false,
            error: "Falta header x-api-key",
        });
    }
    const masterKey = process.env.MASTER_API_KEY;
    const isMaster = masterKey && headerKey === masterKey;
    const isClientKey = CLIENT_KEYS.includes(headerKey);
    if (!isMaster && !isClientKey) {
        return res.status(403).json({
            ok: false,
            error: "API key inválida o no autorizada",
        });
    }
    req.apiKey = headerKey;
    req.isMasterKey = isMaster;
    next();
}
