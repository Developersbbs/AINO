import { Router } from 'express';
import { protect } from '../../middlewares/auth';
import { roles } from '../../middlewares/roles';
import * as commissionController from './commissionController';

const router = Router();

// /my before / — prevent query-param route from swallowing named segment
router.get('/my', protect, roles('Agent'), commissionController.getMyCommissions);
router.get('/', protect, roles('Admin'), commissionController.getAllCommissions);
router.patch('/:id/pay', protect, roles('Admin'), commissionController.markPaid);

export default router;
