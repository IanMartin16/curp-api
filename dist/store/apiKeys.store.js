"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadApiKeys = loadApiKeys;
exports.saveApiKeys = saveApiKeys;
exports.generateRandomKey = generateRandomKey;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.join(process.cwd(), "data");
const FILE_PATH = path_1.default.join(DATA_DIR, "api-keys.json");
function ensureFile() {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs_1.default.existsSync(FILE_PATH)) {
        const initial = [];
        fs_1.default.writeFileSync(FILE_PATH, JSON.stringify(initial, null, 2), "utf8");
    }
}
function loadApiKeys() {
    ensureFile();
    const raw = fs_1.default.readFileSync(FILE_PATH, "utf8");
    return JSON.parse(raw);
}
function saveApiKeys(list) {
    ensureFile();
    fs_1.default.writeFileSync(FILE_PATH, JSON.stringify(list, null, 2), "utf8");
}
function generateRandomKey() {
    // key tipo: curp_xxx...
    return ("curp_" +
        Math.random().toString(36).substring(2, 10) +
        Math.random().toString(36).substring(2, 10));
}
