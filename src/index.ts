// src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import curpRouter from "./routes/curp.routes";
import adminRouter from "./routes/admin.routes";
import { apiKeyMiddleware } from "./middlewares/apiKey.middleware";
import { logsMiddleware } from "./middlewares/logs.middleware";
import { requestLogger } from "./middlewares/requestLogger";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  "http://localhost:3000",
  "https://curp-web.vercel.app",
];

// Middleware base
app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json());
app.use(requestLogger);
app.use(logsMiddleware);

// Healthcheck
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "CURP API running" });
});

// 👇 RUTAS CURP (con apiKeyMiddleware)
app.use("/api/curp", apiKeyMiddleware, curpRouter);

// 👇 RUTAS ADMIN (SOLO adminMiddleware dentro de admin.routes.ts)
app.use("/api/admin", adminRouter);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
