import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { UnitStatus } from '@prisma/client';

export const createUnit = async (req: AuthRequest, res: Response) => {
  try {
    const unit = await prisma.unit.create({
      data: req.body
    });
    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getUnitsByProject = async (req: Request, res: Response) => {
  try {
    const units = await prisma.unit.findMany({ where: { project_id: req.params.projectId as string } });
    res.status(200).json(units);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateUnitStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const unit = await prisma.unit.update({
      where: { id: req.params.id as string },
      data: { status }
    });
    res.status(200).json(unit);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
