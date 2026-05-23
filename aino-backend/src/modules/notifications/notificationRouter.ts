import { Router } from 'express';
import { protect } from '../../middlewares/auth';
import * as ctrl from './notificationController';

const router = Router();

router.use(protect);

router.get('/',               ctrl.getMyNotifications);
router.get('/unread-count',   ctrl.getUnreadCount);
router.put('/read-all',       ctrl.markAllRead);
router.put('/:id/read',       ctrl.markOneRead);

export default router;
