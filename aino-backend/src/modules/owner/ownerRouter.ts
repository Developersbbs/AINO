import { Router } from 'express';
import { protect } from '../../middlewares/auth';
import { roles } from '../../middlewares/roles';
import * as ownerController from './ownerController';

const router = Router();

router.use(protect, roles('Owner'));

router.get('/projects', ownerController.getProjects);
router.get('/projects/:id', ownerController.getProjectById);
router.get('/bookings', ownerController.getBookings);
router.post('/bookings/:id/verify', ownerController.verifyBooking);
router.get('/reports', ownerController.getReports);

export default router;
