import { Router } from 'express';
import { validateCurpController } from '../services/curp.service';

const router = Router();

// POST /api/curp/validate
router.post('/validate', validateCurpController);

export default router;
