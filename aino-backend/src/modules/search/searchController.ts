import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import * as searchService from './searchService';

export const search = async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string | undefined) ?? '';
    if (!q.trim()) {
      return res.status(200).json({ projects: [], plots: [], bookings: [], people: [] });
    }
    const results = await searchService.globalSearch(q, req.user!.id, req.user!.role as UserRole);
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};
