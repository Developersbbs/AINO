import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as adminService from './adminService';
import * as auditSvc from './auditLogService';

const actor = async (req: AuthRequest) => {
  const actorId = req.user?.id;
  const actorName = actorId ? await auditSvc.getActorName(actorId) : 'Admin';
  return { actorId, actorName };
};

const logAudit = (
  req: AuthRequest,
  data: Omit<Parameters<typeof auditSvc.createLog>[0], 'actorId' | 'actorName'>,
) => {
  actor(req)
    .then((a) => auditSvc.createLog({ ...a, ...data }))
    .catch(console.error);
};

export const createAgent = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !phone) return apiResponse(res, 400, null, 'name and phone are required');
    const user = await adminService.createUser({
      name: String(name), phone: String(phone),
      email: email ? String(email) : undefined, role: 'Agent',
    });
    logAudit(req, { action: 'CREATE_AGENT', targetType: 'User', targetId: user.id, targetName: user.name });
    return apiResponse(res, 201, user, 'Agent created');
  } catch (error: any) {
    if (error.code === 'P2002') return apiResponse(res, 409, null, 'Phone number already registered');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const createOwner = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !phone) return apiResponse(res, 400, null, 'name and phone are required');
    const user = await adminService.createUser({
      name: String(name), phone: String(phone),
      email: email ? String(email) : undefined, role: 'Owner',
    });
    logAudit(req, { action: 'CREATE_OWNER', targetType: 'User', targetId: user.id, targetName: user.name });
    return apiResponse(res, 201, user, 'Owner created');
  } catch (error: any) {
    if (error.code === 'P2002') return apiResponse(res, 409, null, 'Phone number already registered');
    return apiResponse(res, 500, null, 'Server error');
  }
};

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
    logAudit(req, { action: 'APPROVE_AGENT', targetType: 'User', targetId: agent.id, targetName: agent.name });
    return apiResponse(res, 200, agent, 'Agent approved');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Agent not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const rejectAgent = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const name = await auditSvc.getActorName(id).catch(() => id);
    await adminService.rejectAgent(id);
    logAudit(req, { action: 'REJECT_AGENT', targetType: 'User', targetId: id, targetName: name });
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
    logAudit(req, { action: 'DEACTIVATE_AGENT', targetType: 'User', targetId: agent.id, targetName: agent.name });
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
    logAudit(req, { action: 'APPROVE_OWNER', targetType: 'User', targetId: owner.id, targetName: owner.name });
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
    logAudit(req, { action: 'DEACTIVATE_OWNER', targetType: 'User', targetId: owner.id, targetName: owner.name });
    return apiResponse(res, 200, owner, 'Owner deactivated');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Owner not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const editUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, email, phone } = req.body as { name?: string; email?: string; phone?: string };
    if (!name?.trim() && !email?.trim() && !phone?.trim()) {
      return apiResponse(res, 400, null, 'Provide at least one field to update');
    }
    const user = await adminService.updateUser(id, {
      ...(name?.trim() && { name: name.trim() }),
      ...(email?.trim() !== undefined && { email: email.trim() || null }),
      ...(phone?.trim() && { phone: phone.trim() }),
    });
    logAudit(req, { action: 'EDIT_USER', targetType: 'User', targetId: user.id, targetName: user.name });
    return apiResponse(res, 200, user, 'User updated');
  } catch (error: any) {
    if (error.code === 'P2002') return apiResponse(res, 409, null, 'Phone or email already in use');
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'User not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const getRecycleBin = async (_req: AuthRequest, res: Response) => {
  try {
    const users = await adminService.getRecycleBin();
    return apiResponse(res, 200, users, 'Recycle bin retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const restoreUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const user = await adminService.restoreUser(id);
    logAudit(req, { action: 'RESTORE_USER', targetType: 'User', targetId: user.id, targetName: user.name });
    return apiResponse(res, 200, user, 'User restored');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'User not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const permanentlyDeleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    await adminService.permanentlyDeleteUser(id);
    logAudit(req, { action: 'PERMANENT_DELETE_USER', targetType: 'User', targetId: id, targetName: id });
    return apiResponse(res, 200, null, 'User permanently deleted');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'User not found');
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
