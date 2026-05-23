import { Response } from 'express';
import { CommissionStatus } from '@prisma/client';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as commissionService from './commissionService';

export const getMyCommissions = async (req: AuthRequest, res: Response) => {
  try {
    const commissions = await commissionService.getAgentCommissions(req.user!.id);
    return apiResponse(res, 200, commissions, 'Commissions retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const getAllCommissions = async (req: AuthRequest, res: Response) => {
  try {
    const { status, agentId } = req.query;

    let statusFilter: CommissionStatus | undefined;
    if (status === 'Unpaid' || status === 'Paid') statusFilter = status as CommissionStatus;

    const commissions = await commissionService.getAllCommissions(
      statusFilter,
      agentId ? String(agentId) : undefined,
    );
    return apiResponse(res, 200, commissions, 'Commissions retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const markPaid = async (req: AuthRequest, res: Response) => {
  try {
    const commission = await commissionService.markPaid(String(req.params.id));
    return apiResponse(res, 200, commission, 'Commission marked as paid');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Commission not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};
