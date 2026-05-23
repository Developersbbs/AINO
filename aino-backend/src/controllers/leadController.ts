import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth';

const unitPublicSelect = {
  id: true,
  unit_number: true,
  sq_ft: true,
  price: true,
  facing: true,
  road_width: true,
  status: true,
  coordinates: true,
  attributes: true,
};

function shareBase(req: Request): string {
  if (process.env.SHARE_URL_BASE) return process.env.SHARE_URL_BASE.replace(/\/$/, '');
  const host = req.headers.host ?? 'localhost';
  return `${req.protocol}://${host}`;
}

// ── POST /create-share-link — Agent / Admin only ──────────────────────────────
export const createShareLink = async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, customer_phone, customer_name } = req.body;
    if (!project_id) return res.status(400).json({ message: 'project_id is required' });

    const share_token = nanoid(12);

    await prisma.lead.create({
      data: {
        share_token,
        project_id,
        agent_id: req.user!.id,
        customer_phone,
        customer_name,
      },
    });

    return res.status(201).json({
      message: 'Share link created',
      share_token,
      share_url: `${shareBase(req)}/book/${share_token}`,
    });
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'Duplicate share token, please retry' });
    if (error.code === 'P2003') return res.status(400).json({ message: 'project_id does not reference a valid project' });
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /public/:token — Customer-facing, no auth ────────────────────────────
export const getPublicLead = async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const lead = await prisma.lead.findUnique({
      where: { share_token: token },
      include: {
        project: {
          include: {
            units: {
              select: unitPublicSelect,
              orderBy: { unit_number: 'asc' },
            },
          },
        },
      },
    });

    if (!lead?.project) return res.status(404).json({ message: 'Link invalid or expired' });

    const { project } = lead;
    return res.status(200).json({
      project: {
        name: project.project_name,
        type: project.project_type,
        location: project.location,
        reraNumber: project.rera_number,
        layoutImageUrl: project.layout_image_url,
        configAttributes: project.config_attributes,
        documents: project.documents ?? [],
      },
      units: project.units,
    });
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /track/:token — Record first customer click ─────────────────────────
export const trackLead = async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const lead = await prisma.lead.findUnique({ where: { share_token: token } });
    if (!lead) return res.status(404).json({ message: 'Link invalid or expired' });

    if (!lead.first_click_at) {
      await prisma.lead.update({
        where: { share_token: token },
        data: { first_click_at: new Date() },
      });
    }

    return res.status(200).json({ projectId: lead.project_id, agentId: lead.agent_id });
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /:token — Internal lookup (agent / admin) ────────────────────────────
export const getLeadByToken = async (req: AuthRequest, res: Response) => {
  try {
    const token = String(req.params.token);
    const lead = await prisma.lead.findUnique({
      where: { share_token: token },
      include: {
        project: { select: { id: true, project_name: true, location: true } },
        agent:   { select: { id: true, name: true, phone: true } },
      },
    });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    return res.status(200).json(lead);
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
};
