import { Router } from 'express';
import { protect } from '../../middlewares/auth';
import { roles } from '../../middlewares/roles';
import * as adminController from './adminController';

const router = Router();

// Every admin route requires a valid JWT + Admin role
router.use(protect, roles('Admin'));

router.get('/dashboard',                adminController.getDashboard);
router.get('/projects',                 adminController.getAdminProjects);
router.get('/owners',                   adminController.getOwners);
router.post('/owners/:id/approve',      adminController.approveOwner);
router.post('/owners/:id/deactivate',   adminController.deactivateOwner);
router.get('/agents',                   adminController.getAgents);
router.post('/agents/:id/approve',      adminController.approveAgent);
router.post('/agents/:id/reject',       adminController.rejectAgent);
router.post('/agents/:id/deactivate',   adminController.deactivateAgent);

export default router;
