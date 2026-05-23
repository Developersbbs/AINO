import { Router } from 'express';
import { createProject, getProjects, getProjectById } from '../controllers/projectController';
import { protect, authorize } from '../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', protect, authorize(UserRole.Admin, UserRole.Owner), createProject);

export default router;
