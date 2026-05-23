import prisma from '../../config/database';
import { Prisma } from '@prisma/client';

export const createNotification = async (
  userId: string,
  title: string,
  body: string,
  type: string,
  data?: Record<string, unknown>,
) => {
  try {
    return await prisma.notification.create({
      data: { user_id: userId, title, body, type, data: data as Prisma.InputJsonValue | undefined },
    });
  } catch {
    // Notifications are non-critical — never let them break the main flow
  }
};

export const getNotifications = (userId: string) =>
  prisma.notification.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    take: 30,
  });

export const getUnreadCount = (userId: string) =>
  prisma.notification.count({
    where: { user_id: userId, is_read: false },
  });

export const markAllRead = (userId: string) =>
  prisma.notification.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });

export const markOneRead = (id: string, userId: string) =>
  prisma.notification.updateMany({
    where: { id, user_id: userId },
    data: { is_read: true },
  });
