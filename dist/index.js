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
const requestLogger_1 = require("./middlewares/requestLogger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const allowedOrigins = [
    "http://localhost:3000",
    "https://curp-web.vercel.app",
];
app.use((0, cors_1.default)({ origin: allowedOrigins }));
app.use(express_1.default.json());
app.use(requestLogger_1.requestLogger);
app.use(logs_middleware_1.logsMiddleware);
// Healthcheck
app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "CURP API running" });
});
// 🔐 Rutas de admin (solo ADMIN_API_KEY, NO apiKeyMiddleware aquí)
app.use("/api/admin", admin_routes_1.default);
// 🔑 Rutas públicas de CURP (aquí sí aplicamos apiKeyMiddleware)
app.use("/api/curp", apiKey_middleware_1.apiKeyMiddleware, curp_routes_1.default);
app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});
