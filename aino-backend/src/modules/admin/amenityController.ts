import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as svc from './amenityService';

export const listAmenities = async (_req: AuthRequest, res: Response) => {
  try {
    const amenities = await svc.getAllAmenities();
    return apiResponse(res, 200, amenities, 'Amenities retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const addAmenity = async (req: AuthRequest, res: Response) => {
  try {
    const { label, icon, color } = req.body as { label?: string; icon?: string; color?: string };
    if (!label?.trim()) return res.status(400).json({ message: 'label is required' });
    const amenity = await svc.addCustomAmenity(label, icon ?? 'star', color ?? '#3b82f6');
    return apiResponse(res, 201, amenity, 'Amenity added');
  } catch (err: any) {
    const status = err?.message?.includes('already exists') || err?.message?.includes('Conflicts') ? 409 : 500;
    return res.status(status).json({ message: err?.message ?? 'Server error' });
  }
};

export const removeAmenity = async (req: AuthRequest, res: Response) => {
  try {
    const key = req.params.key as string;
    await svc.deleteCustomAmenity(key);
    return apiResponse(res, 200, null, 'Amenity removed');
  } catch (err: any) {
    const status = err?.message?.includes('built-in') ? 400 : 500;
    return res.status(status).json({ message: err?.message ?? 'Server error' });
  }
};
