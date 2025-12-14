import { Router } from "express";
import { validateCurpController } from "../services/curp.service";
import { rateLimitMiddleware } from "../middlewares/rateLimit.middleware";
import { apiKeyMiddleware } from "../middlewares/apikey.middleware";

const router = Router();

// Aplica el middleware SOLO a esta ruta (o a todas las del router)
router.post("/validate", rateLimitMiddleware, apiKeyMiddleware, validateCurpController);

export default router;
