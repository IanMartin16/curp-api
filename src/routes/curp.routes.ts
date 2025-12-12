import { Router } from "express";
import { validateCurpController } from "../services/curp.service";

const router = Router();

// Aplica el middleware SOLO a esta ruta (o a todas las del router)
router.post("/validate", validateCurpController);

export default router;
