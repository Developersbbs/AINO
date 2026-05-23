import { Response } from 'express';

export const apiResponse = <T>(
  res: Response,
  status: number,
  data: T | null,
  message: string,
): Response => {
  return res.status(status).json({
    success: status < 400,
    message,
    data,
  });
};
