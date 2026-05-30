import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as svc from './commissionConfigService';
import * as auditSvc from './auditLogService';

const param = (req: AuthRequest, key: string): string => req.params[key] as string;

const fmtRate   = (v: number | null | undefined) => v == null ? 'Global Default' : `${v}%`;
const fmtAmount = (v: number | null | undefined) => v == null ? 'Not set' : `₹${v.toLocaleString('en-IN')}`;

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
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ message: 'rate must be a number between 0 and 100' });
    }
    const [oldRate, actorName] = await Promise.all([
      svc.getGlobalRate(),
      auditSvc.getActorName(user.id),
    ]);
    const updated = await svc.setGlobalRate(rate);
    auditSvc.createLog({
      actorId: user.id, actorName,
      action: 'GLOBAL_RATE_CHANGE', targetType: 'global', targetName: 'Global Commission Rate',
      oldValue: `${oldRate}%`, newValue: `${updated}%`,
    }).catch(console.error);
    return res.status(200).json({ globalRate: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const patchProjectOverride = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    if (!user) return res.status(500).json({ message: 'Server error' });
    const id = param(req, 'id');
    const { commissionRate, bookingAmount } = req.body as {
      commissionRate?: number; bookingAmount?: number;
    };
    const [old, actorName] = await Promise.all([
      svc.getProjectOverrideValues(id),
      auditSvc.getActorName(user.id),
    ]);
    const project = await svc.updateProjectOverride(id, commissionRate, bookingAmount);
    if (commissionRate !== undefined) {
      auditSvc.createLog({
        actorId: user.id, actorName,
        action: 'PROJECT_COMMISSION_OVERRIDE', targetType: 'project', targetId: id,
        targetName: old?.project_name, oldValue: fmtRate(old?.commission_rate), newValue: `${commissionRate}%`,
      }).catch(console.error);
    }
    if (bookingAmount !== undefined) {
      auditSvc.createLog({
        actorId: user.id, actorName,
        action: 'PROJECT_BOOKING_AMOUNT_OVERRIDE', targetType: 'project', targetId: id,
        targetName: old?.project_name, oldValue: fmtAmount(old?.booking_amount), newValue: fmtAmount(bookingAmount),
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
      oldValue: old?.commission_rate == null ? undefined : `${old.commission_rate}%`,
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
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ message: 'commissionRate must be a number between 0 and 100' });
    }
    const [old, actorName] = await Promise.all([
      svc.getAgentOverrideValue(id),
      auditSvc.getActorName(user.id),
    ]);
    const agent = await svc.updateAgentOverride(id, rate);
    auditSvc.createLog({
      actorId: user.id, actorName,
      action: 'AGENT_COMMISSION_OVERRIDE', targetType: 'agent', targetId: id,
      targetName: old?.name, oldValue: fmtRate(old?.commission_rate), newValue: `${rate}%`,
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
      oldValue: old?.commission_rate == null ? undefined : `${old.commission_rate}%`,
      newValue: 'Global Default',
    }).catch(console.error);
    return res.status(200).json(agent);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};
