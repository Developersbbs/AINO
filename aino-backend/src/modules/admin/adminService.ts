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
    where: { role: UserRole.Agent, deleted_at: null },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      is_approved: true,
      documents: true,
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
    where: { role: UserRole.Owner, deleted_at: null },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      is_approved: true,
      documents: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });
};

export const getRecycleBin = () => {
  return prisma.user.findMany({
    where: { deleted_at: { not: null } },
    select: { id: true, name: true, phone: true, email: true, role: true, deleted_at: true, created_at: true },
    orderBy: { deleted_at: 'desc' },
  });
};

export const restoreUser = (id: string) => {
  return prisma.user.update({
    where: { id },
    data: { deleted_at: null, is_approved: true },
    select: { id: true, name: true, role: true },
  });
};

export const permanentlyDeleteUser = async (id: string) => {
  await prisma.$transaction([
    prisma.unit.updateMany({ where: { booked_by_agent_id: id }, data: { booked_by_agent_id: null } }),
    prisma.project.updateMany({ where: { owner_id: id }, data: { owner_id: null } }),
    prisma.commission.deleteMany({ where: { agent_id: id } }),
    prisma.booking.deleteMany({ where: { agent_id: id } }),
    prisma.lead.deleteMany({ where: { agent_id: id } }),
    prisma.notification.deleteMany({ where: { user_id: id } }),
    prisma.user.delete({ where: { id } }),
  ]);
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

export const updateUser = (
  id: string,
  data: { name?: string; email?: string | null; phone?: string },
) => {
  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, phone: true, email: true, role: true, is_approved: true },
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
    totalOwners,
    totalBookings,
    pendingApprovals,
    revenueResult,
    recentBookings,
    recentActivity,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { is_published: true } }),
    prisma.unit.count(),
    prisma.unit.count({ where: { status: UnitStatus.Available } }),
    prisma.unit.count({ where: { status: UnitStatus.Booked } }),
    prisma.unit.count({ where: { status: UnitStatus.Sold } }),
    prisma.user.count({ where: { role: UserRole.Agent } }),
    prisma.user.count({ where: { role: UserRole.Agent, is_approved: true } }),
    prisma.user.count({ where: { role: UserRole.Owner } }),
    prisma.booking.count(),
    prisma.user.count({ where: { is_approved: false } }),
    prisma.unit.aggregate({
      _sum: { price: true },
      where: { status: UnitStatus.Sold },
    }),
    prisma.booking.findMany({
      take: 5,
      orderBy: { booking_date: 'desc' },
      select: {
        id: true,
        status: true,
        booking_date: true,
        unit: { select: { unit_number: true, price: true } },
        agent: { select: { name: true } },
      },
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { created_at: 'desc' },
      select: { id: true, action: true, actor_name: true, created_at: true },
    }).catch(() => []),
  ]);

  return {
    stats: {
      totalProjects,
      publishedProjects,
      totalUnits,
      availableUnits,
      bookedUnits,
      soldUnits,
      totalAgents,
      approvedAgents,
      totalOwners,
      totalBookings,
      pendingApprovals,
      totalRevenue: revenueResult._sum.price ?? 0,
    },
    recentBookings: recentBookings.map((b) => ({
      id: b.id,
      unit: b.unit?.unit_number ?? '—',
      agent: b.agent?.name ?? '—',
      status: b.status,
      createdAt: b.booking_date.toISOString(),
      amount: b.unit?.price ?? 0,
    })),
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      user: a.actor_name,
      action: a.action,
      createdAt: a.created_at.toISOString(),
    })),
  };
};
