import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as svc from './commissionConfigService';
import type { CommissionType } from './commissionConfigService';
import * as auditSvc from './auditLogService';

const param = (req: AuthRequest, key: string): string => req.params[key] as string;

const fmtCommission = (rate: number | null | undefined, type: string | null | undefined): string => {
  if (rate == null) return 'Global Default';
  return type === 'fixed_amount' ? `₹${rate.toLocaleString('en-IN')}` : `${rate}%`;
};

export const getConfig = async (_req: AuthRequest, res: Response) => {
  try {
    const config = await svc.getCommissionConfig();
    return apiResponse(res, 200, config, 'Commission config retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const patchGlobalRate = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    if (!user) return res.status(500).json({ message: 'Server error' });

    const rate = Number.parseFloat(req.body.rate);
    const type = req.body.type as CommissionType | undefined;

    if (Number.isNaN(rate) || rate < 0) {
      return res.status(400).json({ message: 'rate must be a non-negative number' });
    }
    if (type === 'percentage' && rate > 100) {
      return res.status(400).json({ message: 'percentage rate must be between 0 and 100' });
    }
    if (type !== undefined && type !== 'percentage' && type !== 'fixed_amount') {
      return res.status(400).json({ message: 'type must be "percentage" or "fixed_amount"' });
    }

    const [oldRate, oldType, actorName] = await Promise.all([
      svc.getGlobalRate(),
      svc.getGlobalType(),
      auditSvc.getActorName(user.id),
    ]);

    const [updated, updatedType] = await Promise.all([
      svc.setGlobalRate(rate),
      type === undefined ? Promise.resolve(oldType) : svc.setGlobalType(type),
    ]);

    auditSvc.createLog({
      actorId: user.id, actorName,
      action: 'GLOBAL_RATE_CHANGE', targetType: 'global', targetName: 'Global Commission Rate',
      oldValue: fmtCommission(oldRate, oldType),
      newValue: fmtCommission(updated, updatedType),
    }).catch(console.error);

    return res.status(200).json({ globalRate: updated, globalType: updatedType });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const patchProjectOverride = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    if (!user) return res.status(500).json({ message: 'Server error' });
    const id = param(req, 'id');
    const { commissionRate, commissionType, bookingAmount } = req.body as {
      commissionRate?: number; commissionType?: CommissionType; bookingAmount?: number;
    };

    if (commissionType !== undefined && commissionType !== 'percentage' && commissionType !== 'fixed_amount') {
      return res.status(400).json({ message: 'commissionType must be "percentage" or "fixed_amount"' });
    }

    const [old, actorName] = await Promise.all([
      svc.getProjectOverrideValues(id),
      auditSvc.getActorName(user.id),
    ]);
    const project = await svc.updateProjectOverride(id, commissionRate, commissionType, bookingAmount);

    if (commissionRate !== undefined) {
      auditSvc.createLog({
        actorId: user.id, actorName,
        action: 'PROJECT_COMMISSION_OVERRIDE', targetType: 'project', targetId: id,
        targetName: old?.project_name,
        oldValue: fmtCommission(old?.commission_rate, old?.commission_type),
        newValue: fmtCommission(commissionRate, commissionType ?? old?.commission_type),
      }).catch(console.error);
    }
    if (bookingAmount !== undefined) {
      auditSvc.createLog({
        actorId: user.id, actorName,
        action: 'PROJECT_BOOKING_AMOUNT_OVERRIDE', targetType: 'project', targetId: id,
        targetName: old?.project_name,
        oldValue: old?.booking_amount == null ? 'Not set' : `₹${old.booking_amount.toLocaleString('en-IN')}`,
        newValue: `₹${bookingAmount.toLocaleString('en-IN')}`,
      }).catch(console.error);
    }
    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const resetProjectOverride = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    if (!user) return res.status(500).json({ message: 'Server error' });
    const id = param(req, 'id');
    const [old, actorName] = await Promise.all([
      svc.getProjectOverrideValues(id),
      auditSvc.getActorName(user.id),
    ]);
    const project = await svc.resetProjectOverride(id);
    auditSvc.createLog({
      actorId: user.id, actorName,
      action: 'PROJECT_OVERRIDE_RESET', targetType: 'project', targetId: id,
      targetName: old?.project_name,
      oldValue: fmtCommission(old?.commission_rate, old?.commission_type),
      newValue: 'Global Default',
    }).catch(console.error);
    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const patchAgentOverride = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    if (!user) return res.status(500).json({ message: 'Server error' });
    const id = param(req, 'id');
    const rate = Number.parseFloat(req.body.commissionRate);
    const commissionType = req.body.commissionType as CommissionType | undefined;

    if (Number.isNaN(rate) || rate < 0) {
      return res.status(400).json({ message: 'commissionRate must be a non-negative number' });
    }
    if (commissionType === 'percentage' && rate > 100) {
      return res.status(400).json({ message: 'percentage commissionRate must be between 0 and 100' });
    }
    if (commissionType !== undefined && commissionType !== 'percentage' && commissionType !== 'fixed_amount') {
      return res.status(400).json({ message: 'commissionType must be "percentage" or "fixed_amount"' });
    }

    const [old, actorName] = await Promise.all([
      svc.getAgentOverrideValue(id),
      auditSvc.getActorName(user.id),
    ]);
    const agent = await svc.updateAgentOverride(id, rate, commissionType);
    auditSvc.createLog({
      actorId: user.id, actorName,
      action: 'AGENT_COMMISSION_OVERRIDE', targetType: 'agent', targetId: id,
      targetName: old?.name,
      oldValue: fmtCommission(old?.commission_rate, old?.commission_type),
      newValue: fmtCommission(rate, commissionType ?? old?.commission_type),
    }).catch(console.error);
    return res.status(200).json(agent);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const resetAgentOverride = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    if (!user) return res.status(500).json({ message: 'Server error' });
    const id = param(req, 'id');
    const [old, actorName] = await Promise.all([
      svc.getAgentOverrideValue(id),
      auditSvc.getActorName(user.id),
    ]);
    const agent = await svc.resetAgentOverride(id);
    auditSvc.createLog({
      actorId: user.id, actorName,
      action: 'AGENT_OVERRIDE_RESET', targetType: 'agent', targetId: id,
      targetName: old?.name,
      oldValue: fmtCommission(old?.commission_rate, old?.commission_type),
      newValue: 'Global Default',
    }).catch(console.error);
    return res.status(200).json(agent);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};
