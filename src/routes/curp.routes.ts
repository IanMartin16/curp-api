import { Router } from "express";
import { validateCurpController } from "../services/curp.service";
import { apiKeyMiddleware } from "../middlewares/apikey.middleware";

const router = Router();

// Aplica el middleware SOLO a esta ruta (o a todas las del router)
router.post("/validate", apiKeyMiddleware, validateCurpController);

export default router;
