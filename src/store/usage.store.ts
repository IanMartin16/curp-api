import fs from "fs";
import path from "path";

type UsageDB = Record<string, Record<string, number>>;
// usage[key][YYYY-MM] = count

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "usage.json");

function ensure() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}), "utf8");
}

export function loadUsage(): UsageDB {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8") || "{}");
  } catch {
    return {};
  }
}

export function saveUsage(db: UsageDB) {
  ensure();
  fs.writeFileSync(filePath, JSON.stringify(db, null, 2), "utf8");
}

export function monthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
