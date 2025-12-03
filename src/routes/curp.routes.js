"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const curp_service_1 = require("../services/curp.service");
const router = (0, express_1.Router)();
// POST /api/curp/validate
router.post('/validate', curp_service_1.validateCurpController);
exports.default = router;
//# sourceMappingURL=curp.routes.js.map