import { Router } from 'express';
import { protect } from '../../middlewares/auth';
import { roles } from '../../middlewares/roles';
import * as leadController from './leadController';

const router = Router();

// ── Public routes (no auth) — MUST come before protect middleware ──────────────
// Order matters: /my and /track/:token must not be swallowed by /:id
router.post('/track/:shareToken',   leadController.trackLink);
router.get('/public/:shareToken',   leadController.getPublicProject);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.post('/generate', protect, roles('Agent'),              leadController.generateLink);
router.get('/my',        protect, roles('Agent'),              leadController.getMyLeads);
router.get('/:id',       protect,                              leadController.getLeadById);

export default router;
