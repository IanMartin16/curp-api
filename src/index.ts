import "./env";
import express from "express";
import cors from "cors";
//import dotenv from "dotenv";

import curpRouter from "./routes/curp.routes";
import adminRouter from "./routes/admin.routes";

import { apiKeyMiddleware } from "./middlewares/apikey.middleware";
import { logsMiddleware } from "./middlewares/logs.middleware";
import { requestLogger } from "./middlewares/requestLogger";
import { rateLimitMiddleware } from "./middlewares/rateLimit.middleware";
import stripeRoutes from "./routes/stripe.routes";
import dashboardSessionRoutes from "./routes/dashboardSession.routes";

import { initDb } from "./db/initDb";


//dotenv.config();


async function bootstrap() {
  // ✅ Una sola migración (initDb ya crea api_keys, api_logs, api_usage)
  await initDb();

  const app = express();
  app.set("trust proxy", 1);
  const PORT = process.env.PORT || 4000;

  const allowedOrigins = [
    "http://localhost:3000",
    "https://curp-web.vercel.app",
    "https://curpify.com",
    "https://www.curpify.com",
  ];

  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json());
  app.use("/api", dashboardSessionRoutes);

  app.use("/api", stripeRoutes);

  // (Opcional) requestLogger para debug
  app.use(requestLogger);

  // Healthcheck
  app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "CURP API running" });
  });

  // 🔐 ADMIN primero (sin logs ni rate limit)
  app.use("/api/admin", adminRouter);

  // 🧾 Logs solo para lo demás (principalmente /api/curp)
  app.use(logsMiddleware);

  // 🔑 CURP protegido + rate limit
  app.use("/api/curp", apiKeyMiddleware, rateLimitMiddleware, curpRouter);

  app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
  });
}

bootstrap().catch((e) => {
  console.error("Boot error:", e);
  process.exit(1);
});
