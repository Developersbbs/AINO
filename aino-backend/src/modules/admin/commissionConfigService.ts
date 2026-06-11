import prisma from '../../config/database';
import { UserRole } from '@prisma/client';

export type CommissionType = 'percentage' | 'fixed_amount';

const GLOBAL_RATE_KEY = 'commission_global_rate';
const GLOBAL_TYPE_KEY = 'commission_global_type';
const DEFAULT_RATE = 3;
const DEFAULT_TYPE: CommissionType = 'percentage';

export const getGlobalRate = async (): Promise<number> => {
  const setting = await prisma.settings.findUnique({ where: { key: GLOBAL_RATE_KEY } });
  return setting ? Number.parseFloat(setting.value) : DEFAULT_RATE;
};

export const setGlobalRate = async (rate: number): Promise<number> => {
  await prisma.settings.upsert({
    where: { key: GLOBAL_RATE_KEY },
    update: { value: rate.toString() },
    create: { key: GLOBAL_RATE_KEY, value: rate.toString() },
  });
  return rate;
};

export const getGlobalType = async (): Promise<CommissionType> => {
  const setting = await prisma.settings.findUnique({ where: { key: GLOBAL_TYPE_KEY } });
  return (setting?.value as CommissionType) ?? DEFAULT_TYPE;
};

export const setGlobalType = async (type: CommissionType): Promise<CommissionType> => {
  await prisma.settings.upsert({
    where: { key: GLOBAL_TYPE_KEY },
    update: { value: type },
    create: { key: GLOBAL_TYPE_KEY, value: type },
  });
  return type;
};

export const getCommissionConfig = async () => {
  const [globalRate, globalType, projects, agents] = await Promise.all([
    getGlobalRate(),
    getGlobalType(),
    prisma.project.findMany({
      select: {
        id: true,
        project_name: true,
        project_type: true,
        is_published: true,
        commission_rate: true,
        commission_type: true,
        booking_amount: true,
        _count: { select: { units: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
    prisma.user.findMany({
      where: { role: UserRole.Agent, is_approved: true },
      select: {
        id: true,
        name: true,
        commission_rate: true,
        commission_type: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return {
    globalRate,
    globalType,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.project_name,
      type: p.project_type,
      isPublished: p.is_published,
      unitCount: p._count.units,
      commissionRate: p.commission_rate,
      commissionType: (p.commission_type as CommissionType | null) ?? null,
      bookingAmount: p.booking_amount,
    })),
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      sales: a._count.bookings,
      commissionRate: a.commission_rate,
      commissionType: (a.commission_type as CommissionType | null) ?? null,
    })),
  };
};

export const updateProjectOverride = async (
  projectId: string,
  commissionRate?: number,
  commissionType?: CommissionType,
  bookingAmount?: number,
) => {
  return prisma.project.update({
    where: { id: projectId },
    data: {
      ...(commissionRate !== undefined && { commission_rate: commissionRate }),
      ...(commissionType !== undefined && { commission_type: commissionType }),
      ...(bookingAmount !== undefined && { booking_amount: bookingAmount }),
    },
    select: { id: true, project_name: true, commission_rate: true, commission_type: true, booking_amount: true },
  });
};

export const resetProjectOverride = async (projectId: string) => {
  return prisma.project.update({
    where: { id: projectId },
    data: { commission_rate: null, commission_type: null, booking_amount: null },
    select: { id: true, project_name: true, commission_rate: true, commission_type: true, booking_amount: true },
  });
};

export const updateAgentOverride = async (agentId: string, commissionRate: number, commissionType?: CommissionType) => {
  return prisma.user.update({
    where: { id: agentId },
    data: {
      commission_rate: commissionRate,
      ...(commissionType !== undefined && { commission_type: commissionType }),
    },
    select: { id: true, name: true, commission_rate: true, commission_type: true },
  });
};

export const resetAgentOverride = async (agentId: string) => {
  return prisma.user.update({
    where: { id: agentId },
    data: { commission_rate: null, commission_type: null },
    select: { id: true, name: true, commission_rate: true, commission_type: true },
  });
};

export const getProjectOverrideValues = (projectId: string) => {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { project_name: true, commission_rate: true, commission_type: true, booking_amount: true },
  });
};

export const getAgentOverrideValue = (agentId: string) => {
  return prisma.user.findUnique({
    where: { id: agentId },
    select: { name: true, commission_rate: true, commission_type: true },
  });
};
