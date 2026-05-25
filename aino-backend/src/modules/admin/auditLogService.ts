import prisma from '../../config/database';

export interface CreateLogData {
  actorId?: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  oldValue?: string;
  newValue?: string;
}

export const getActorName = async (actorId: string): Promise<string> => {
  const user = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
  return user?.name ?? 'Admin';
};

export const createLog = (data: CreateLogData) => {
  return prisma.auditLog.create({
    data: {
      actor_id: data.actorId,
      actor_name: data.actorName,
      action: data.action,
      target_type: data.targetType,
      target_id: data.targetId,
      target_name: data.targetName,
      old_value: data.oldValue,
      new_value: data.newValue,
    },
  });
};

export const getAuditLogs = () => {
  return prisma.auditLog.findMany({
    orderBy: { created_at: 'desc' },
    take: 200,
  });
};
