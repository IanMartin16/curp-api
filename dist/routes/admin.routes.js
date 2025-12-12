"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const admin_middleware_1 = require("../middlewares/admin.middleware"); // el que valida ADMIN_API_KEY
const apiKeys_store_1 = require("../store/apiKeys.store");
const router = (0, express_1.Router)();
router.get("/keys", admin_middleware_1.adminMiddleware, (req, res) => {
    const keys = (0, apiKeys_store_1.loadApiKeys)();
    // podrías ocultar parte de la key si quieres
    const safeKeys = keys.map((k) => ({
        id: k.id,
        key: k.key,
        label: k.label,
        plan: k.plan,
        active: k.active,
        createdAt: k.createdAt,
        revokedAt: k.revokedAt ?? null,
    }));
    return res.json({ ok: true, keys: safeKeys });
});
router.post("/keys", admin_middleware_1.adminMiddleware, (req, res) => {
    const { label, plan } = req.body;
    const all = (0, apiKeys_store_1.loadApiKeys)();
    const newKey = {
        id: `key_${all.length + 1}`,
        key: (0, apiKeys_store_1.generateRandomKey)(),
        label: label || `API key #${all.length + 1}`,
        plan: plan && ["free", "developer", "business"].includes(plan)
            ? plan
            : "free",
        active: true,
        createdAt: new Date().toISOString(),
    };
    all.push(newKey);
    (0, apiKeys_store_1.saveApiKeys)(all);
    return res.status(201).json({
        ok: true,
        key: newKey,
    });
});
// POST /api/admin/keys/revoke  -> revoca una key por id
router.post("/keys/revoke", admin_middleware_1.adminMiddleware, (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ ok: false, error: "Falta id de la key" });
    }
    const all = (0, apiKeys_store_1.loadApiKeys)();
    const idx = all.findIndex((k) => k.id === id);
    if (idx === -1) {
        return res.status(404).json({ ok: false, error: "Key no encontrada" });
    }
    all[idx].active = false;
    all[idx].revokedAt = new Date().toISOString();
    (0, apiKeys_store_1.saveApiKeys)(all);
    return res.json({ ok: true, key: all[idx] });
});
router.get("/stats", (req, res) => {
    const master = req.isMasterKey;
    if (!master) {
        return res.status(403).json({ ok: false, error: "Solo master key" });
    }
    const filePath = path_1.default.join(__dirname, "../../logs/api.log");
    if (!fs_1.default.existsSync(filePath)) {
        return res.json({ ok: true, total: 0, byDay: {}, byKey: {} });
    }
    const raw = fs_1.default.readFileSync(filePath, "utf8").trim();
    if (!raw) {
        return res.json({ ok: true, total: 0, byDay: {}, byKey: {} });
    }
    const lines = raw.split("\n");
    const logs = lines
        .map((line) => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    })
        .filter(Boolean);
    const total = logs.length;
    const byDay = {};
    const byKey = {};
    logs.forEach((l) => {
        const day = String(l.ts).substring(0, 10);
        const key = l.key || "unknown";
        byDay[day] = (byDay[day] || 0) + 1;
        byKey[key] = (byKey[key] || 0) + 1;
    });
    res.json({ ok: true, total, byDay, byKey });
});
exports.default = router;
