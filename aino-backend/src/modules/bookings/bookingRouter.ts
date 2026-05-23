import { Router } from 'express';
import { protect } from '../../middlewares/auth';
import { roles } from '../../middlewares/roles';
import * as bookingController from './bookingController';

const router = Router();

// ── Public (no auth) ──────────────────────────────────────────────────────────
router.post('/', bookingController.createBooking);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.get('/my', protect, roles('Agent'), bookingController.getMyBookings);
router.get('/:id', protect, bookingController.getBookingById);
router.post('/:id/cancel', protect, roles('Admin'), bookingController.cancelBooking);

export default router;
