import { Router } from 'express';
import { createBooking } from '../controllers/bookingController';
import { protect } from '../middlewares/auth';

const router = Router();

router.post('/', protect, createBooking);

export default router;
