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

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(requestLogger);
app.use(logsMiddleware);

// Healthcheck
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "CURP API running" });
});

// 🔐 Rutas de admin (solo ADMIN_API_KEY, NO apiKeyMiddleware aquí)
app.use("/api/admin", adminRouter);

// 🔑 Rutas públicas de CURP (aquí sí aplicamos apiKeyMiddleware)
app.use("/api/curp", apiKeyMiddleware, curpRouter);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
