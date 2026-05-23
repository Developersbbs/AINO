import prisma from '../../config/database';
import { CommissionStatus } from '@prisma/client';

const unitSelect = {
  id: true,
  unit_number: true,
  price: true,
  project: { select: { id: true, project_name: true } },
};

export const getAgentCommissions = (agentId: string) => {
  return prisma.commission.findMany({
    where: { agent_id: agentId },
    include: { unit: { select: unitSelect } },
    orderBy: { id: 'desc' },
  });
};

export const getAllCommissions = (status?: CommissionStatus, agentId?: string) => {
  return prisma.commission.findMany({
    where: {
      ...(status && { status }),
      ...(agentId && { agent_id: agentId }),
    },
    include: {
      unit: { select: unitSelect },
      agent: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { id: 'desc' },
  });
};

export const markPaid = (id: string) => {
  return prisma.commission.update({
    where: { id },
    data: { status: CommissionStatus.Paid, settled_at: new Date() },
  });
};
