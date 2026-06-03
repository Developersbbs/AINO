import prisma from '../../config/database';
import { UnitStatus, Prisma } from '@prisma/client';

const ownerSelect = { select: { id: true, name: true, phone: true } };

export const createProject = (data: {
  name: string;
  type: string;
  location: string;
  ownerId?: string;
  reraNumber?: string;
  configAttributes?: unknown;
}) => {
  const projectData: Prisma.ProjectUncheckedCreateInput = {
    project_name: data.name,
    project_type: data.type,
    location: data.location,
    rera_number: data.reraNumber,
    config_attributes: data.configAttributes as any,
  };
  if (data.ownerId) projectData.owner_id = data.ownerId;

  return prisma.project.create({
    data: projectData,
    include: { owner: ownerSelect },
  });
};

export const getPublishedProjects = (type?: string, location?: string) => {
  return prisma.project.findMany({
    where: {
      is_published: true,
      ...(type && { project_type: type }),
      ...(location && { location: { contains: location, mode: 'insensitive' } }),
    },
    include: {
      owner: ownerSelect,
      _count: { select: { units: true } },
    },
    orderBy: { created_at: 'desc' },
  });
};

export const getProjectById = (id: string) => {
  return prisma.project.findUnique({
    where: { id },
    include: {
      owner: ownerSelect,
      units: {
        select: {
          id: true,
          unit_number: true,
          sq_ft: true,
          price: true,
          facing: true,
          road_width: true,
          status: true,
          coordinates: true,
          attributes: true,
        },
        orderBy: { unit_number: 'asc' },
      },
    },
  });
};

export const updateDocuments = (id: string, documents: unknown[]) => {
  // `documents` field added via prisma db push; TS server cache may lag behind generated types
  const data: any = { documents };
  return prisma.project.update({ where: { id }, data });
};

export const updateProject = (id: string, data: {
  project_name?: string;
  project_type?: string;
  location?: string;
  rera_number?: string;
  config_attributes?: unknown;
  owner_id?: string;
}) => {
  return prisma.project.update({
    where: { id },
    data: { ...data, config_attributes: data.config_attributes as any },
    include: { owner: { select: { id: true, name: true, phone: true } } },
  });
};

export const publishProject = (id: string) => {
  return prisma.project.update({
    where: { id },
    data: { is_published: true },
  });
};

export const unpublishProject = (id: string) => {
  return prisma.project.update({
    where: { id },
    data: { is_published: false },
  });
};

export const assignOwner = (id: string, ownerId: string) => {
  return prisma.project.update({
    where: { id },
    data: { owner_id: ownerId },
    include: { owner: ownerSelect },
  });
};

export const updateLayoutImage = (id: string, url: string) => {
  return prisma.project.update({
    where: { id },
    data: { layout_image_url: url },
  });
};

export const getProjectUnits = (projectId: string) => {
  return prisma.unit.findMany({
    where: { project_id: projectId },
    select: {
      id: true,
      unit_number: true,
      sq_ft: true,
      price: true,
      facing: true,
      road_width: true,
      status: true,
      coordinates: true,
      attributes: true,
    },
    orderBy: { unit_number: 'asc' },
  });
};

export const STATUS_COLOR: Record<UnitStatus, string> = {
  [UnitStatus.Available]: 'green',
  [UnitStatus.Booked]:    'yellow',
  [UnitStatus.Sold]:      'red',
};
