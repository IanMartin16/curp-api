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
import dashboardRoutes from "./routes/dashboard.routes";
import dashboardRouter from "./routes/dashboard.routes";
import dashboardSessionRouter from "./routes/dashboardSession.routes";
import freeKeyRoutes from "./routes/freeKey.routes";
import { liteGuard, liteDailyLimit } from "./middlewares/lite.middleware";
import metaRouter from "./routes/meta.routes";
import { rapidApiGate, rapidApiBypassLimit } from "./middlewares/rapidapi.middleware";
import healthRouter from "./routes/health.routes";

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

  app.use(cors({ origin: allowedOrigins, allowedHeaders: ["Content-Type", "x-api-key", "x-internal-secret", "authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], }));
  app.use(express.json());
  app.use("/api", dashboardSessionRouter);

  app.use("/api/health", healthRouter);

  app.use(rapidApiGate);
  app.use(rapidApiBypassLimit);
  
   // ✅ 1) LITE: primero guard y limit
  app.use(liteGuard);
  app.use(liteDailyLimit);

  // ✅ 2) Meta (queda: GET /api/meta)
  app.use("/api", metaRouter);

  // ✅ 3) Rutas reales
  app.use("/api", dashboardSessionRouter);
  app.use("/api", stripeRoutes);
  app.use("/api", dashboardRoutes);
  app.use("/api", dashboardRouter);
  app.use("/api", freeKeyRoutes);


  // (Opcional) requestLogger para debug
  app.use(requestLogger);

  // Healthcheck
  app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "CURP API running" });
  });

  // 🔐 ADMIN primero (sin logs ni rate limit)
  app.use("/api/admin", adminRouter);

  app.get("/api/_debug/headers", (req, res) => {
  res.json({
    ok: true,
    received: Object.keys(req.headers),
    xApiKey: req.headers["x-api-key"] ?? null,
    auth: req.headers["authorization"] ?? null,
  });
});


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
