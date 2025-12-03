import { Request, Response } from 'express';
import { validateCurp } from '../utils/curp-validator';

export const validateCurpController = (req: Request, res: Response) => {
  const { curp } = req.body;

  if (!curp || typeof curp !== 'string') {
    return res.status(400).json({
      ok: false,
      error: 'El campo "curp" es requerido y debe ser texto.'
    });
  }

  const result = validateCurp(curp);

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
