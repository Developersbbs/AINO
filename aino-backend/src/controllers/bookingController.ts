import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { UnitStatus, CommissionStatus } from '@prisma/client';

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { unit_id, customer_name, customer_phone } = req.body;

    // Run booking via interactive transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Check unit availability
      const unit = await tx.unit.findUnique({ where: { id: unit_id } });
      if (!unit) {
        throw new Error('Unit not found');
      }
      
      if (unit.status !== UnitStatus.Available) {
        throw new Error('Unit is already booked or sold');
      }

      // 2. Update unit status
      await tx.unit.update({
        where: { id: unit_id },
        data: {
          status: UnitStatus.Booked,
          booked_by_agent_id: req.user!.id
        }
      });

      // 3. Create booking
      const booking = await tx.booking.create({
        data: {
          unit_id,
          agent_id: req.user!.id,
          customer_name,
          customer_phone,
        }
      });

      // 4. Generate Commission (assuming flat 2% for demo)
      const commissionAmount = unit.price * 0.02;
      await tx.commission.create({
        data: {
          unit_id,
          agent_id: req.user!.id,
          amount: commissionAmount,
          status: CommissionStatus.Unpaid
        }
      });

      return booking;
    });

    res.status(201).json({ message: 'Booking confirmed', booking: result });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Booking failed' });
  }
};
