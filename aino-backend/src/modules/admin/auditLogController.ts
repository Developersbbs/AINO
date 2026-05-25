import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as auditSvc from './auditLogService';

export const listAuditLogs = async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await auditSvc.getAuditLogs();
    return apiResponse(res, 200, logs, 'Audit logs retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};
