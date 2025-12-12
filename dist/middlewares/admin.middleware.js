"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = adminMiddleware;
function adminMiddleware(req, res, next) {
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
