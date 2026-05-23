import prisma from '../../config/database';
import { UnitStatus, CommissionStatus } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';
import { createNotification } from '../notifications/notificationService';

export const createBooking = async (
  unitId: string,
  agentId: string,
  customerName: string,
  customerPhone: string,
  shareToken?: string,
) => {
  const { booking, unit } = await prisma.$transaction(async (tx) => {
    const unit = await tx.unit.findUnique({
      where: { id: unitId },
      include: { project: { select: { project_name: true, owner_id: true } } },
    });

    if (!unit) throw new AppError('NOT_FOUND', 'Unit not found');
    if (unit.status !== UnitStatus.Available) throw new AppError('NOT_AVAILABLE', 'Unit is not available for booking');

    const existing = await tx.booking.findFirst({ where: { unit_id: unitId } });
    if (existing) throw new AppError('ALREADY_BOOKED', 'Unit has already been booked');

    const booking = await tx.booking.create({
      data: { unit_id: unitId, agent_id: agentId, customer_name: customerName, customer_phone: customerPhone },
    });

    await tx.unit.update({
      where: { id: unitId },
      data: { status: UnitStatus.Booked, booked_by_agent_id: agentId },
    });

    await tx.commission.create({
      data: {
        unit_id: unitId,
        agent_id: agentId,
        amount: unit.price * 0.02,
        status: CommissionStatus.Unpaid,
      },
    });

    if (shareToken) {
      await tx.lead.updateMany({
        where: { share_token: shareToken },
        data: { customer_name: customerName, customer_phone: customerPhone },
      });
    }

    return { booking, unit };
  });

  // Fire notifications after the transaction (non-blocking)
  void createNotification(agentId,
    'Booking Confirmed 🎉',
    `Plot ${unit.unit_number} has been successfully booked by ${customerName}.`,
    'booking_new',
    { bookingId: booking.id, unitNumber: unit.unit_number },
  );

  if (unit.project.owner_id) {
    void createNotification(unit.project.owner_id,
      'New Booking Pending Verification',
      `Plot ${unit.unit_number} in ${unit.project.project_name} has been booked and awaits your confirmation.`,
      'booking_verify',
      { bookingId: booking.id, unitNumber: unit.unit_number },
    );
  }

  return booking;
};

export const getAgentBookings = (agentId: string) => {
  return prisma.booking.findMany({
    where: { agent_id: agentId },
    include: {
      unit: { select: { id: true, unit_number: true, price: true, status: true, project: { select: { id: true, project_name: true } } } },
    },
    orderBy: { booking_date: 'desc' },
  });
};

export const getBookingById = (id: string) => {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      unit: { select: { id: true, unit_number: true, price: true, status: true, project: { select: { id: true, project_name: true } } } },
      agent: { select: { id: true, name: true, phone: true } },
    },
  });
};

export const cancelBooking = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw new AppError('NOT_FOUND', 'Booking not found');

    await tx.unit.update({
      where: { id: booking.unit_id },
      data: { status: UnitStatus.Available, booked_by_agent_id: null },
    });

    await tx.commission.deleteMany({ where: { unit_id: booking.unit_id, agent_id: booking.agent_id } });

    await tx.booking.delete({ where: { id } });
  });
};
