import { Router } from 'express';
import { protect } from '../middlewares/auth';
import { roles } from '../middlewares/roles';
import {
  createShareLink,
  getPublicLead,
  trackLead,
  getLeadByToken,
} from '../controllers/leadController';

const router = Router();

// ── Public (no auth) ──────────────────────────────────────────────────────────
router.post('/track/:token',  trackLead);
router.get('/public/:token',  getPublicLead);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.post('/create-share-link', protect, roles('Agent', 'Admin'), createShareLink);
router.get('/:token',             protect,                           getLeadByToken);

export default router;
