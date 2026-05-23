import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import { AppError } from '../../middlewares/errorHandler';
import * as ownerService from './ownerService';

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const projects = await ownerService.getOwnerProjects(req.user!.id);
    return apiResponse(res, 200, projects, 'Projects retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const project = await ownerService.getOwnerProjectById(req.user!.id, String(req.params.id));
    if (!project) return apiResponse(res, 404, null, 'Project not found');
    return apiResponse(res, 200, project, 'Project retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const getBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await ownerService.getOwnerBookings(req.user!.id);
    return apiResponse(res, 200, bookings, 'Bookings retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const verifyBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { confirmed } = req.body;
    if (typeof confirmed !== 'boolean') {
      return apiResponse(res, 400, null, 'confirmed must be a boolean');
    }

    const result = await ownerService.verifyBooking(String(req.params.id), confirmed);
    const message = confirmed
      ? 'Booking confirmed, unit marked as sold'
      : 'Booking rejected, unit returned to available';
    return apiResponse(res, 200, result, message);
  } catch (error) {
    if (error instanceof AppError && error.code === 'NOT_FOUND') {
      return apiResponse(res, 404, null, error.message);
    }
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const reports = await ownerService.getOwnerReports(req.user!.id);
    return apiResponse(res, 200, reports, 'Reports retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};
