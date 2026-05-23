import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth';

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { project_name, project_type, layout_image_url, location, rera_number, config_attributes } = req.body;

    const project = await prisma.project.create({
      data: {
        project_name,
        project_type,
        layout_image_url,
        owner_id: req.user!.id,
        location,
        rera_number,
        config_attributes: config_attributes ? config_attributes : undefined,
        is_published: false
      }
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({ where: { is_published: true } });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id as string } });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
