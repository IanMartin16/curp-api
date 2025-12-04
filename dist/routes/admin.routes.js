"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
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
