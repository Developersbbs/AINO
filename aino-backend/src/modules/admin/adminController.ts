import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as adminService from './adminService';

export const getAgents = async (_req: AuthRequest, res: Response) => {
  try {
    const agents = await adminService.getAllAgents();
    return apiResponse(res, 200, agents, 'Agents retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const approveAgent = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const agent = await adminService.approveAgent(id);
    return apiResponse(res, 200, agent, 'Agent approved');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Agent not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const rejectAgent = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    await adminService.rejectAgent(id);
    return apiResponse(res, 200, null, 'Agent rejected and record deleted');
  } catch (error: any) {
    if (error.message === 'AGENT_HAS_BOOKINGS') {
      return apiResponse(res, 409, null, 'Cannot delete agent with existing bookings. Use deactivate instead.');
    }
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Agent not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const deactivateAgent = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const agent = await adminService.deactivateAgent(id);
    return apiResponse(res, 200, agent, 'Agent deactivated');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Agent not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const getOwners = async (_req: AuthRequest, res: Response) => {
  try {
    const owners = await adminService.getAllOwners();
    return apiResponse(res, 200, owners, 'Owners retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const approveOwner = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const owner = await adminService.approveAgent(id);
    return apiResponse(res, 200, owner, 'Owner approved');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Owner not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const deactivateOwner = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const owner = await adminService.deactivateAgent(id);
    return apiResponse(res, 200, owner, 'Owner deactivated');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Owner not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const getAdminProjects = async (_req: AuthRequest, res: Response) => {
  try {
    const projects = await adminService.getAllProjectsAdmin();
    return apiResponse(res, 200, projects, 'Projects retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const getDashboard = async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await adminService.getDashboardStats();
    return apiResponse(res, 200, stats, 'Dashboard data retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};
