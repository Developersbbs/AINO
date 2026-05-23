import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as svc from './notificationService';

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await svc.getNotifications(req.user!.id);
    return apiResponse(res, 200, notifications, 'Notifications retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const count = await svc.getUnreadCount(req.user!.id);
    return apiResponse(res, 200, { count }, 'Unread count retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
  try {
    await svc.markAllRead(req.user!.id);
    return apiResponse(res, 200, null, 'All notifications marked as read');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const markOneRead = async (req: AuthRequest, res: Response) => {
  try {
    await svc.markOneRead(req.params['id'] as string, req.user!.id);
    return apiResponse(res, 200, null, 'Notification marked as read');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};
