import prisma from '../../config/database';
import { UnitStatus } from '@prisma/client';

export const createUnit = (data: {
  projectId: string;
  unitNumber: string;
  sqFt: number;
  price: number;
  facing?: string;
  roadWidth?: number;
  coordinates?: unknown;
  attributes?: unknown;
}) => {
  return prisma.unit.create({
    data: {
      project_id: data.projectId,
      unit_number: data.unitNumber,
      sq_ft: data.sqFt,
      price: data.price,
      facing: data.facing,
      road_width: data.roadWidth,
      coordinates: data.coordinates as any,
      attributes: data.attributes as any,
    },
  });
};

export type BulkRow = {
  project_id: string;
  unit_number: string;
  sq_ft: number;
  price: number;
  facing?: string;
  road_width?: number;
};

export const bulkCreateUnits = (rows: BulkRow[]) => {
  return prisma.unit.createMany({
    data: rows.map((r) => ({
      project_id: r.project_id,
      unit_number: r.unit_number,
      sq_ft: r.sq_ft,
      price: r.price,
      facing: r.facing,
      road_width: r.road_width,
    })),
    skipDuplicates: true,
  });
};

export const getUnitById = (id: string) => {
  return prisma.unit.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, project_name: true, location: true } },
    },
  });
};

export const updateUnit = (id: string, data: {
  sq_ft?: number;
  price?: number;
  facing?: string;
  road_width?: number;
  coordinates?: unknown;
  attributes?: unknown;
}) => {
  return prisma.unit.update({
    where: { id },
    data: {
      ...(data.sq_ft       !== undefined && { sq_ft: data.sq_ft }),
      ...(data.price       !== undefined && { price: data.price }),
      ...(data.facing      !== undefined && { facing: data.facing }),
      ...(data.road_width  !== undefined && { road_width: data.road_width }),
      ...(data.coordinates !== undefined && { coordinates: data.coordinates as any }),
      ...(data.attributes  !== undefined && { attributes: data.attributes as any }),
    },
  });
};

export const setUnitStatus = (id: string, status: UnitStatus) => {
  return prisma.unit.update({
    where: { id },
    data: { status },
  });
};
