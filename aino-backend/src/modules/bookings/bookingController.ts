import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import redis from '../../config/redis';
import prisma from '../../config/database';
import * as bookingService from './bookingService';

// ── POST / — Public (customer submits via share link) ─────────────────────────
export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  const { unitId, customerName, customerPhone, shareToken } = req.body;
  let { agentId } = req.body;

  if (!unitId || !customerName || !customerPhone) {
    return apiResponse(res, 400, null, 'unitId, customerName, and customerPhone are required');
  }

  // Resolve agentId from shareToken when not supplied by the client
  if (!agentId && shareToken) {
    const lead = await prisma.lead.findUnique({
      where: { share_token: String(shareToken) },
      select: { agent_id: true },
    });
    if (!lead) return apiResponse(res, 404, null, 'Invalid share token');
    agentId = lead.agent_id;
  }

  if (!agentId) {
    return apiResponse(res, 400, null, 'agentId or shareToken is required');
  }

  const lockKey = `unit_lock:${unitId}`;
  const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');

  if (!acquired) {
    return apiResponse(res, 409, null, 'Unit is currently being processed, please try again');
  }

  try {
    const booking = await bookingService.createBooking(unitId, agentId, customerName, customerPhone, shareToken);
    return apiResponse(res, 201, { bookingId: booking.id }, 'Booking confirmed');
  } catch (error) {
    return next(error);
  } finally {
    await redis.del(lockKey);
  }
};

// ── GET /my — Agent's own bookings ────────────────────────────────────────────
export const getMyBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await bookingService.getAgentBookings(req.user!.id);
    return apiResponse(res, 200, bookings, 'Bookings retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

// ── GET /:id — Agent sees own, Admin sees all ─────────────────────────────────
export const getBookingById = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await bookingService.getBookingById(String(req.params.id));

    if (!booking) return apiResponse(res, 404, null, 'Booking not found');

    const isAdmin = req.user!.role === 'Admin';
    const isOwner = booking.agent_id === req.user!.id;

    if (!isAdmin && !isOwner) return apiResponse(res, 403, null, 'Forbidden');

    return apiResponse(res, 200, booking, 'Booking retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

// ── POST /:id/cancel — Admin only ─────────────────────────────────────────────
export const cancelBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await bookingService.cancelBooking(String(req.params.id));
    return apiResponse(res, 200, null, 'Booking cancelled');
  } catch (error) {
    return next(error);
  }
};
