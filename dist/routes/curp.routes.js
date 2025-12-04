"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const curp_service_1 = require("../services/curp.service");
const apiKey_middleware_1 = require("../middlewares/apiKey.middleware");
const router = (0, express_1.Router)();
// Aplica el middleware SOLO a esta ruta (o a todas las del router)
router.post("/validate", apiKey_middleware_1.apiKeyMiddleware, curp_service_1.validateCurpController);
exports.default = router;
