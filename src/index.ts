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

app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(cors({ origin: allowedOrigins, }));
// Logs para TODAS las peticiones
app.use(logsMiddleware);

// Endpoint raíz para healthcheck
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "CURP API running" });
});

// Rutas protegidas de la CURP API (clientes y master)
app.use("/api/curp", apiKeyMiddleware, curpRouter);

// Rutas de admin (SOLO master key)
app.use("/api/admin", apiKeyMiddleware, adminRouter);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
