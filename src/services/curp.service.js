"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCurpController = void 0;
const express_1 = require("express");
const curp_validator_1 = require("../utils/curp-validator");
const validateCurpController = (req, res) => {
    const { curp } = req.body;
    if (!curp || typeof curp !== 'string') {
        return res.status(400).json({
            ok: false,
            error: 'El campo "curp" es requerido y debe ser texto.'
        });
    }
    const result = (0, curp_validator_1.validateCurp)(curp);
    if (!result.isValid) {
        return res.status(200).json({
            ok: true,
            curp: curp.toUpperCase(),
            isValid: false,
            reasons: result.reasons
        });
    }
    return res.status(200).json({
        ok: true,
        curp: result.normalized,
        isValid: true,
        data: result.data
    });
};
exports.validateCurpController = validateCurpController;
//# sourceMappingURL=curp.service.js.map