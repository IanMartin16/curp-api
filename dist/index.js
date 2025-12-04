"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const curp_routes_1 = __importDefault(require("./routes/curp.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const apiKey_middleware_1 = require("./middlewares/apiKey.middleware");
const logs_middleware_1 = require("./middlewares/logs.middleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Logs para TODAS las peticiones
app.use(logs_middleware_1.logsMiddleware);
// Endpoint raíz para healthcheck
app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "CURP API running" });
});
// Rutas protegidas de la CURP API (clientes y master)
app.use("/api/curp", apiKey_middleware_1.apiKeyMiddleware, curp_routes_1.default);
// Rutas de admin (SOLO master key)
app.use("/api/admin", apiKey_middleware_1.apiKeyMiddleware, admin_routes_1.default);
app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});
