import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import curpRouter from "./routes/curp.routes";
import adminRouter from "./routes/admin.routes";
import { apiKeyMiddleware } from "./middlewares/apiKey.middleware";
import { logsMiddleware } from "./middlewares/logs.middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Logs para todas las rutas
app.use(logsMiddleware);

// Ruta raíz
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "CURP API running" });
});

// Rutas protegidas por API key de cliente/master
app.use("/api/curp", apiKeyMiddleware, curpRouter);

// Rutas de admin SOLO con master key
app.use("/api/admin", apiKeyMiddleware, adminRouter);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
