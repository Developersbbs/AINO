import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as leadService from './leadService';

// ── POST /generate — Agent only ───────────────────────────────────────────────
export const generateLink = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, clientName, clientPhone } = req.body;
    if (!projectId) return apiResponse(res, 400, null, 'projectId is required');
    if (!clientName || !clientPhone) return apiResponse(res, 400, null, 'clientName and clientPhone are required');

    const shareToken = nanoid(12);
    const lead = await leadService.createLead(projectId, req.user!.id, shareToken, String(clientName).trim(), String(clientPhone).trim());

    const base = (process.env.SHARE_URL_BASE ?? `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

    return apiResponse(res, 201, {
      leadId: lead.id,
      shareToken,
      shareUrl: `${base}/book/${shareToken}`,
    }, 'Share link generated');
  } catch (error: any) {
    if (error.code === 'P2003') return apiResponse(res, 400, null, 'projectId does not reference a valid project');
    return apiResponse(res, 500, null, 'Server error');
  }
};

// ── GET /my — Agent's own leads ───────────────────────────────────────────────
export const getMyLeads = async (req: AuthRequest, res: Response) => {
  try {
    const leads = await leadService.getAgentLeads(req.user!.id);
    return apiResponse(res, 200, leads, 'Leads retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

// ── GET /:id — Agent sees own, Admin sees all ─────────────────────────────────
export const getLeadById = async (req: AuthRequest, res: Response) => {
  try {
    const lead = await leadService.getLeadById(String(req.params.id));

    if (!lead) return apiResponse(res, 404, null, 'Lead not found');

    const isAdmin = req.user!.role === 'Admin';
    const isOwner = lead.agent_id === req.user!.id;

    if (!isAdmin && !isOwner) {
      return apiResponse(res, 403, null, 'Forbidden');
    }

    return apiResponse(res, 200, lead, 'Lead retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

// ── POST /track/:shareToken — Public, no auth ─────────────────────────────────
export const trackLink = async (req: Request, res: Response) => {
  try {
    const lead = await leadService.recordFirstClick(String(req.params.shareToken));

    if (!lead) {
      return apiResponse(res, 404, null, 'Link invalid or expired');
    }

    return apiResponse(res, 200, {
      projectId: lead.project_id,
      agentId: lead.agent_id,
    }, 'Tracked');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

// ── GET /public/:shareToken — Customer-facing, no auth ────────────────────────
export const getPublicProject = async (req: Request, res: Response) => {
  try {
    const data = await leadService.getPublicLeadData(String(req.params.shareToken));

    if (!data?.project) {
      // Match spec's exact error shape for this endpoint
      return res.status(404).json({ error: 'Link invalid or expired' });
    }

    const { project } = data;

    return apiResponse(res, 200, {
      agentId: data.agent_id,
      project: {
        name: project.project_name,
        type: project.project_type,
        location: project.location,
        reraNumber: project.rera_number,
        configAttributes: project.config_attributes,
        layoutImageUrl: project.layout_image_url,
        documents: project.documents ?? [],
      },
      units: project.units,
    }, 'Project retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};
