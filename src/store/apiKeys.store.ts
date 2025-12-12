import fs from "fs";
import path from "path";

export type PlanType = "free" | "developer" | "business";

export interface ApiKeyRecord {
  id: string;
  key: string;
  label: string;
  plan: PlanType;
  active: boolean;
  createdAt: string;
  revokedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "api-keys.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILE_PATH)) {
    const initial: ApiKeyRecord[] = [];
    fs.writeFileSync(FILE_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

export function loadApiKeys(): ApiKeyRecord[] {
  ensureFile();
  const raw = fs.readFileSync(FILE_PATH, "utf8");
  return JSON.parse(raw);
}

export function saveApiKeys(list: ApiKeyRecord[]) {
  ensureFile();
  fs.writeFileSync(FILE_PATH, JSON.stringify(list, null, 2), "utf8");
}

export function generateRandomKey(): string {
  // key tipo: curp_xxx...
  return (
    "curp_" +
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 10)
  );
}
