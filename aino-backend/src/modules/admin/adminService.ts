import prisma from '../../config/database';
import { UserRole, UnitStatus } from '@prisma/client';
import { createNotification } from '../notifications/notificationService';

export const createUser = (data: {
  name: string;
  phone: string;
  email?: string;
  role: 'Agent' | 'Owner';
}) => {
  return prisma.user.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      role: data.role,
      is_approved: true,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      is_approved: true,
      created_at: true,
    },
  });
};

export const getAllAgents = () => {
  return prisma.user.findMany({
    where: { role: UserRole.Agent },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      is_approved: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });
};

export const approveAgent = async (id: string) => {
  const user = await prisma.user.update({
    where: { id },
    data: { is_approved: true },
    select: { id: true, name: true, phone: true, role: true, is_approved: true },
  });
  void createNotification(
    id,
    'Account Approved ✅',
    `Welcome, ${user.name}! Your ${user.role} account has been approved. You can now access all platform features.`,
    'user_approved',
  );
  return user;
};

export const rejectAgent = async (id: string) => {
  const bookingCount = await prisma.booking.count({ where: { agent_id: id } });
  if (bookingCount > 0) throw new Error('AGENT_HAS_BOOKINGS');

  return prisma.user.delete({ where: { id } });
};

export const deactivateAgent = (id: string) => {
  return prisma.user.update({
    where: { id },
    data: { is_approved: false },
    select: { id: true, name: true, phone: true, role: true, is_approved: true },
  });
};

export const getAllOwners = () => {
  return prisma.user.findMany({
    where: { role: UserRole.Owner },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      is_approved: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });
};

export const getAllProjectsAdmin = () => {
  return prisma.project.findMany({
    include: {
      owner: { select: { id: true, name: true, phone: true } },
      _count: { select: { units: true } },
    },
    orderBy: { created_at: 'desc' },
  });
};

export const getDashboardStats = async () => {
  const [
    totalProjects,
    publishedProjects,
    totalUnits,
    availableUnits,
    bookedUnits,
    soldUnits,
    totalAgents,
    approvedAgents,
    totalBookings,
    revenueResult,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { is_published: true } }),
    prisma.unit.count(),
    prisma.unit.count({ where: { status: UnitStatus.Available } }),
    prisma.unit.count({ where: { status: UnitStatus.Booked } }),
    prisma.unit.count({ where: { status: UnitStatus.Sold } }),
    prisma.user.count({ where: { role: UserRole.Agent } }),
    prisma.user.count({ where: { role: UserRole.Agent, is_approved: true } }),
    prisma.booking.count(),
    prisma.unit.aggregate({
      _sum: { price: true },
      where: { status: UnitStatus.Sold },
    }),
  ]);

  return {
    totalProjects,
    publishedProjects,
    totalUnits,
    availableUnits,
    bookedUnits,
    soldUnits,
    totalAgents,
    approvedAgents,
    totalBookings,
    totalRevenue: revenueResult._sum.price ?? 0,
  };
};
