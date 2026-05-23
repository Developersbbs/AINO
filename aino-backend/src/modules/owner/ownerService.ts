import prisma from '../../config/database';
import { UnitStatus, CommissionStatus, BookingStatus } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';
import { createNotification } from '../notifications/notificationService';

export const getOwnerProjects = async (ownerId: string) => {
  const projects = await prisma.project.findMany({
    where: { owner_id: ownerId },
    select: {
      id: true,
      project_name: true,
      project_type: true,
      location: true,
      rera_number: true,
      is_published: true,
      created_at: true,
      units: { select: { status: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  return projects.map(({ units, ...project }) => ({
    ...project,
    unitSummary: {
      total: units.length,
      available: units.filter((u) => u.status === UnitStatus.Available).length,
      booked: units.filter((u) => u.status === UnitStatus.Booked).length,
      sold: units.filter((u) => u.status === UnitStatus.Sold).length,
    },
  }));
};

export const getOwnerProjectById = (ownerId: string, projectId: string) => {
  return prisma.project.findFirst({
    where: { id: projectId, owner_id: ownerId },
    include: {
      units: {
        select: {
          id: true,
          unit_number: true,
          sq_ft: true,
          price: true,
          facing: true,
          road_width: true,
          status: true,
          coordinates: true,
          attributes: true,
        },
        orderBy: { unit_number: 'asc' },
      },
    },
  });
};

export const getOwnerBookings = (ownerId: string, status: BookingStatus) => {
  return prisma.booking.findMany({
    where: { unit: { project: { owner_id: ownerId } }, status },
    include: {
      unit: {
        select: {
          id: true,
          unit_number: true,
          sq_ft: true,
          price: true,
          status: true,
          project: { select: { id: true, project_name: true } },
        },
      },
      agent: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { booking_date: 'desc' },
  });
};

// Stage 1: Owner confirms initial payment received (Pending → Confirmed) or rejects
export const verifyBooking = async (bookingId: string, confirmed: boolean) => {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        unit: { select: { unit_number: true, project: { select: { project_name: true } } } },
      },
    });
    if (!booking) throw new AppError('NOT_FOUND', 'Booking not found');
    if (booking.status !== BookingStatus.Pending) throw new AppError('BAD_REQUEST', 'Booking is not in Pending state');

    if (confirmed) {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.Confirmed, confirmed_at: new Date() },
      });
      return { status: 'confirmed' as const, booking };
    }

    // Reject: free the unit and remove booking + commission
    await tx.unit.update({
      where: { id: booking.unit_id },
      data: { status: UnitStatus.Available, booked_by_agent_id: null },
    });
    await tx.commission.deleteMany({ where: { unit_id: booking.unit_id, agent_id: booking.agent_id } });
    await tx.booking.delete({ where: { id: bookingId } });
    return { status: 'rejected' as const, booking };
  });

  const { booking } = result;
  if (result.status === 'confirmed') {
    void createNotification(
      booking.agent_id,
      'Booking Confirmed ✅',
      `Booking for Plot ${booking.unit.unit_number} in ${booking.unit.project.project_name} has been confirmed. Await full payment.`,
      'booking_confirmed',
      { bookingId: booking.id, unitNumber: booking.unit.unit_number },
    );
  } else {
    void createNotification(
      booking.agent_id,
      'Booking Rejected',
      `The booking for Plot ${booking.unit.unit_number} in ${booking.unit.project.project_name} was rejected.`,
      'booking_rejected',
      { bookingId: booking.id, unitNumber: booking.unit.unit_number },
    );
  }

  return { status: result.status };
};

// Stage 2: Full payment received → mark unit as Sold
export const markAsSold = async (bookingId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        unit: { select: { unit_number: true, project: { select: { project_name: true } } } },
      },
    });
    if (!booking) throw new AppError('NOT_FOUND', 'Booking not found');
    if (booking.status !== BookingStatus.Confirmed) throw new AppError('BAD_REQUEST', 'Booking must be Confirmed before marking as Sold');

    await tx.unit.update({ where: { id: booking.unit_id }, data: { status: UnitStatus.Sold } });
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.Sold, sold_at: new Date() },
    });
    return { status: 'sold' as const, booking };
  });

  void createNotification(
    result.booking.agent_id,
    'Sale Completed! 🏆',
    `Plot ${result.booking.unit.unit_number} in ${result.booking.unit.project.project_name} has been marked as sold. Commission will be processed.`,
    'booking_sold',
    { bookingId: result.booking.id, unitNumber: result.booking.unit.unit_number },
  );

  return { status: result.status };
};

export const getOwnerReports = async (ownerId: string) => {
  const [revenueResult, pendingResult, soldUnits, bookedUnits, bookings, commissions] =
    await Promise.all([
      prisma.unit.aggregate({
        _sum: { price: true },
        where: { status: UnitStatus.Sold, project: { owner_id: ownerId } },
      }),
      prisma.commission.aggregate({
        _sum: { amount: true },
        where: { status: CommissionStatus.Unpaid, unit: { project: { owner_id: ownerId } } },
      }),
      prisma.unit.count({ where: { status: UnitStatus.Sold, project: { owner_id: ownerId } } }),
      prisma.unit.count({ where: { status: UnitStatus.Booked, project: { owner_id: ownerId } } }),
      prisma.booking.findMany({
        where: { unit: { project: { owner_id: ownerId } } },
        select: { agent_id: true, agent: { select: { name: true } } },
      }),
      prisma.commission.findMany({
        where: { unit: { project: { owner_id: ownerId } } },
        select: { agent_id: true, amount: true },
      }),
    ]);

  const agentMap = new Map<string, { agentId: string; name: string; bookings: number; commissionTotal: number }>();

  for (const b of bookings) {
    if (!agentMap.has(b.agent_id)) {
      agentMap.set(b.agent_id, { agentId: b.agent_id, name: b.agent.name, bookings: 0, commissionTotal: 0 });
    }
    agentMap.get(b.agent_id)!.bookings++;
  }

  for (const c of commissions) {
    if (agentMap.has(c.agent_id)) {
      agentMap.get(c.agent_id)!.commissionTotal += c.amount;
    }
  }

  return {
    revenue: revenueResult._sum.price ?? 0,
    pendingCommissions: pendingResult._sum.amount ?? 0,
    soldUnits,
    bookedUnits,
    agentPerformance: Array.from(agentMap.values()),
  };
};
