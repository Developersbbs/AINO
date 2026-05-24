import { Router } from 'express';
import { protect } from '../../middlewares/auth';
import * as searchController from './searchController';

const router = Router();

router.get('/', protect, searchController.search);

export default router;
