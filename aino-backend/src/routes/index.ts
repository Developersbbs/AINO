import { Router } from 'express';

const router = Router();

// Define routes here, e.g.,
import authRoutes from '../modules/auth/authRouter';
import adminRoutes from '../modules/admin/adminRouter';
import projectRoutes from '../modules/projects/projectRouter';
import unitRoutes from '../modules/units/unitRouter';
import leadRoutes from '../modules/leads/leadRouter';
import bookingRoutes from '../modules/bookings/bookingRouter';
import commissionRoutes from '../modules/commissions/commissionRouter';
import ownerRoutes from '../modules/owner/ownerRouter';
import bulkRoutes from '../modules/bulk/bulkRouter';
import notificationRoutes from '../modules/notifications/notificationRouter';
import searchRoutes from '../modules/search/searchRouter';

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/projects', projectRoutes);
router.use('/units', unitRoutes);
router.use('/leads', leadRoutes);
router.use('/bookings', bookingRoutes);
router.use('/commissions', commissionRoutes);
router.use('/owner', ownerRoutes);
router.use('/bulk', bulkRoutes);
router.use('/notifications', notificationRoutes);
router.use('/search', searchRoutes);

export default router;
