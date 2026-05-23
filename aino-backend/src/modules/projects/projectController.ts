import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as projectService from './projectService';

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, location, reraNumber, configAttributes, ownerId } = req.body;

    if (!name || !type || !location) {
      return apiResponse(res, 400, null, 'name, type and location are required');
    }

    const project = await projectService.createProject({
      name, type, location, ownerId, reraNumber, configAttributes,
    });

    return apiResponse(res, 201, project, 'Project created');
  } catch (error: any) {
    if (error.code === 'P2003') return apiResponse(res, 400, null, 'ownerId does not reference a valid user');
    if (error.name === 'PrismaClientValidationError') return apiResponse(res, 400, null, 'Invalid field value — check ownerId format');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const listProjects = async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const location = req.query.location as string | undefined;
    const projects = await projectService.getPublishedProjects(type, location);
    return apiResponse(res, 200, projects, 'Projects retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const project = await projectService.getProjectById(String(req.params.id));
    if (!project) return apiResponse(res, 404, null, 'Project not found');
    return apiResponse(res, 200, project, 'Project retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, location, reraNumber, configAttributes } = req.body;
    const project = await projectService.updateProject(String(req.params.id), {
      ...(name && { project_name: name }),
      ...(type && { project_type: type }),
      ...(location && { location }),
      ...(reraNumber !== undefined && { rera_number: reraNumber }),
      ...(configAttributes !== undefined && { config_attributes: configAttributes }),
    });
    return apiResponse(res, 200, project, 'Project updated');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Project not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const publishProject = async (req: AuthRequest, res: Response) => {
  try {
    const project = await projectService.publishProject(String(req.params.id));
    return apiResponse(res, 200, project, 'Project published');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Project not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const assignOwner = async (req: AuthRequest, res: Response) => {
  try {
    const { ownerId } = req.body;
    if (!ownerId) return apiResponse(res, 400, null, 'ownerId is required');

    const project = await projectService.assignOwner(String(req.params.id), ownerId);
    return apiResponse(res, 200, project, 'Owner assigned');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Project not found');
    if (error.code === 'P2003') return apiResponse(res, 400, null, 'ownerId does not reference a valid user');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const uploadLayout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return apiResponse(res, 400, null, 'No image file provided');

    const imageUrl = `/uploads/layouts/${req.file.filename}`;
    const project = await projectService.updateLayoutImage(String(req.params.id), imageUrl);

    return apiResponse(res, 200, { layoutImageUrl: imageUrl, project }, 'Layout image uploaded');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Project not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return apiResponse(res, 400, null, 'No file provided');

    const id = String(req.params.id);
    const project = await projectService.getProjectById(id);
    if (!project) return apiResponse(res, 404, null, 'Project not found');

    const existing = (project.documents as any[]) ?? [];
    const newDoc = {
      name: (req.body.name as string | undefined)?.trim() || req.file.originalname,
      url: `/uploads/documents/${req.file.filename}`,
      type: req.file.mimetype.includes('pdf') ? 'pdf' : 'image',
      uploadedAt: new Date().toISOString(),
    };

    const updated = await projectService.updateDocuments(id, [...existing, newDoc]);
    return apiResponse(res, 200, { document: newDoc, documents: updated.documents }, 'Document uploaded');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Project not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const index = Number(req.params.index);

    const project = await projectService.getProjectById(id);
    if (!project) return apiResponse(res, 404, null, 'Project not found');

    const existing = (project.documents as any[]) ?? [];
    if (index < 0 || index >= existing.length) {
      return apiResponse(res, 404, null, 'Document not found');
    }

    const updated = existing.filter((_, i) => i !== index);
    await projectService.updateDocuments(id, updated);
    return apiResponse(res, 200, { documents: updated }, 'Document deleted');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Project not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const getUnits = async (req: Request, res: Response) => {
  try {
    const units = await projectService.getProjectUnits(String(req.params.id));

    const withColor = units.map((unit) => ({
      ...unit,
      statusColor: projectService.STATUS_COLOR[unit.status],
    }));

    return apiResponse(res, 200, withColor, 'Units retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};
