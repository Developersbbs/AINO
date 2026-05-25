import prisma from '../../config/database';
import { UserRole } from '@prisma/client';

const GLOBAL_RATE_KEY = 'commission_global_rate';
const DEFAULT_RATE = 3;

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

export const getCommissionConfig = async () => {
  const [globalRate, projects, agents] = await Promise.all([
    getGlobalRate(),
    prisma.project.findMany({
      select: {
        id: true,
        project_name: true,
        project_type: true,
        is_published: true,
        commission_rate: true,
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
        _count: { select: { bookings: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return {
    globalRate,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.project_name,
      type: p.project_type,
      isPublished: p.is_published,
      unitCount: p._count.units,
      commissionRate: p.commission_rate,
      bookingAmount: p.booking_amount,
    })),
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      sales: a._count.bookings,
      commissionRate: a.commission_rate,
    })),
  };
};

export const updateProjectOverride = async (
  projectId: string,
  commissionRate?: number,
  bookingAmount?: number,
) => {
  return prisma.project.update({
    where: { id: projectId },
    data: {
      ...(commissionRate !== undefined && { commission_rate: commissionRate }),
      ...(bookingAmount !== undefined && { booking_amount: bookingAmount }),
    },
    select: { id: true, project_name: true, commission_rate: true, booking_amount: true },
  });
};

export const resetProjectOverride = async (projectId: string) => {
  return prisma.project.update({
    where: { id: projectId },
    data: { commission_rate: null, booking_amount: null },
    select: { id: true, project_name: true, commission_rate: true, booking_amount: true },
  });
};

export const updateAgentOverride = async (agentId: string, commissionRate: number) => {
  return prisma.user.update({
    where: { id: agentId },
    data: { commission_rate: commissionRate },
    select: { id: true, name: true, commission_rate: true },
  });
};

export const resetAgentOverride = async (agentId: string) => {
  return prisma.user.update({
    where: { id: agentId },
    data: { commission_rate: null },
    select: { id: true, name: true, commission_rate: true },
  });
};

export const getProjectOverrideValues = (projectId: string) => {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { project_name: true, commission_rate: true, booking_amount: true },
  });
};

export const getAgentOverrideValue = (agentId: string) => {
  return prisma.user.findUnique({
    where: { id: agentId },
    select: { name: true, commission_rate: true },
  });
};
