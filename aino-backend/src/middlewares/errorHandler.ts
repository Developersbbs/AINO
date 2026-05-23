import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    switch (err.code) {
      case 'NOT_AVAILABLE':
        return res.status(409).json({ success: false, message: 'Unit is not available for booking', data: null });
      case 'ALREADY_BOOKED':
        return res.status(409).json({ success: false, message: 'Unit has already been booked', data: null });
      case 'NOT_FOUND':
        return res.status(404).json({ success: false, message: err.message, data: null });
    }
  }

  console.error('[ErrorHandler]', err);
  return res.status(500).json({ success: false, message: 'Internal server error', data: null });
};
