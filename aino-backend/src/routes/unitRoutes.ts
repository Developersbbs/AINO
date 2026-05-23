import { Router } from 'express';
import { createUnit, getUnitsByProject, updateUnitStatus } from '../controllers/unitController';
import { protect, authorize } from '../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/project/:projectId', getUnitsByProject);
router.post('/', protect, authorize(UserRole.Admin, UserRole.Owner), createUnit);
router.patch('/:id/status', protect, updateUnitStatus);

export default router;
