import { Router } from "express";
import fs from "fs";
import path from "path";
import { adminMiddleware } from "../middlewares/admin.middleware"; // el que valida ADMIN_API_KEY
import { apiKeyMiddleware } from "../middlewares/apikey.middleware";
import {
  loadApiKeys,
  saveApiKeys,
  generateRandomKey,
  ApiKeyRecord,
  PlanType,
} from "../store/apiKeys.store";

const router = Router();

router.get("/keys", adminMiddleware, (req, res) => {
  const keys = loadApiKeys();

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

router.post("/keys", adminMiddleware, (req, res) => {
  const { label, plan } = req.body as {
    label?: string;
    plan?: PlanType;
  };

  const all = loadApiKeys();
  const newKey: ApiKeyRecord = {
    id: `key_${all.length + 1}`,
    key: generateRandomKey(),
    label: label || `API key #${all.length + 1}`,
    plan: plan && ["free", "developer", "business"].includes(plan)
      ? plan
      : "free",
    active: true,
    createdAt: new Date().toISOString(),
  };

  all.push(newKey);
  saveApiKeys(all);

  return res.status(201).json({
    ok: true,
    key: newKey,
  });
});

// POST /api/admin/keys/revoke  -> revoca una key por id
router.post("/keys/revoke", adminMiddleware, (req, res) => {
  const { id } = req.body as { id?: string };

  if (!id) {
    return res.status(400).json({ ok: false, error: "Falta id de la key" });
  }

  const all = loadApiKeys();
  const idx = all.findIndex((k) => k.id === id);

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: "Key no encontrada" });
  }

  all[idx].active = false;
  all[idx].revokedAt = new Date().toISOString();
  saveApiKeys(all);

  return res.json({ ok: true, key: all[idx] });
});

router.get("/stats", apiKeyMiddleware, (req, res) => {
  const master = (req as any).isMasterKey;
  if (!master) {
    return res.status(403).json({ ok: false, error: "Solo master key" });
  }

  const filePath = path.join(__dirname, "../../logs/api.log");

  if (!fs.existsSync(filePath)) {
    return res.json({ ok: true, total: 0, byDay: {}, byKey: {} });
  }

  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) {
    return res.json({ ok: true, total: 0, byDay: {}, byKey: {} });
  }

  const lines = raw.split("\n");
  const logs = lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as any[];

  const total = logs.length;

  const byDay: Record<string, number> = {};
  const byKey: Record<string, number> = {};

  logs.forEach((l) => {
    const day = String(l.ts).substring(0, 10);
    const key = l.key || "unknown";

    byDay[day] = (byDay[day] || 0) + 1;
    byKey[key] = (byKey[key] || 0) + 1;
  });

  res.json({ ok: true, total, byDay, byKey });
});

export default router;
