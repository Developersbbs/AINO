import { Request, Response } from 'express';
import * as svc from './commissionConfigService';

const param = (req: Request, key: string): string => req.params[key] as string;

export const getConfig = async (_req: Request, res: Response) => {
  try {
    const config = await svc.getCommissionConfig();
    return res.status(200).json(config);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const patchGlobalRate = async (req: Request, res: Response) => {
  try {
    const rate = parseFloat(req.body.rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ message: 'rate must be a number between 0 and 100' });
    }
    const updated = await svc.setGlobalRate(rate);
    return res.status(200).json({ globalRate: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const patchProjectOverride = async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const { commissionRate, bookingAmount } = req.body as {
      commissionRate?: number;
      bookingAmount?: number;
    };
    const project = await svc.updateProjectOverride(id, commissionRate, bookingAmount);
    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const resetProjectOverride = async (req: Request, res: Response) => {
  try {
    const project = await svc.resetProjectOverride(param(req, 'id'));
    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const patchAgentOverride = async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const rate = parseFloat(req.body.commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ message: 'commissionRate must be a number between 0 and 100' });
    }
    const agent = await svc.updateAgentOverride(id, rate);
    return res.status(200).json(agent);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const resetAgentOverride = async (req: Request, res: Response) => {
  try {
    const agent = await svc.resetAgentOverride(param(req, 'id'));
    return res.status(200).json(agent);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};
