import { Router } from 'express';
import { protect } from '../../middlewares/auth';
import { roles } from '../../middlewares/roles';
import * as adminController from './adminController';
import * as commissionController from './commissionConfigController';

const router = Router();

// Every admin route requires a valid JWT + Admin role
router.use(protect, roles('Admin'));

router.get('/dashboard',                adminController.getDashboard);
router.get('/projects',                 adminController.getAdminProjects);
router.get('/owners',                   adminController.getOwners);
router.post('/owners',                  adminController.createOwner);
router.post('/owners/:id/approve',      adminController.approveOwner);
router.post('/owners/:id/deactivate',   adminController.deactivateOwner);
router.post('/agents',                  adminController.createAgent);
router.get('/agents',                   adminController.getAgents);
router.post('/agents/:id/approve',      adminController.approveAgent);
router.post('/agents/:id/reject',       adminController.rejectAgent);
router.post('/agents/:id/deactivate',   adminController.deactivateAgent);

// Commission config
router.get('/commission-config',                        commissionController.getConfig);
router.patch('/commission-config/global',               commissionController.patchGlobalRate);
router.patch('/commission-config/projects/:id',         commissionController.patchProjectOverride);
router.delete('/commission-config/projects/:id',        commissionController.resetProjectOverride);
router.patch('/commission-config/agents/:id',           commissionController.patchAgentOverride);
router.delete('/commission-config/agents/:id',          commissionController.resetAgentOverride);

export default router;
