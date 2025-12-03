import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

router.get("/stats", (req, res) => {
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
    .map((l) => {
      try {
        return JSON.parse(l);
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
    const k = l.key || "unknown";

    byDay[day] = (byDay[day] || 0) + 1;
    byKey[k] = (byKey[k] || 0) + 1;
  });

  res.json({ ok: true, total, byDay, byKey });
});

export default router;
