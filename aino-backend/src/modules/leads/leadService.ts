import prisma from '../../config/database';

const projectPublicSelect = {
  id: true,
  project_name: true,
  project_type: true,
  location: true,
  rera_number: true,
  config_attributes: true,
  layout_image_url: true,
  documents: true,
};

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

export const createLead = (
  projectId: string,
  agentId: string,
  shareToken: string,
  customerName?: string,
  customerPhone?: string,
) => {
  return prisma.lead.create({
    data: {
      share_token: shareToken,
      project_id: projectId,
      agent_id: agentId,
      is_locked: true,
      ...(customerName && { customer_name: customerName }),
      ...(customerPhone && { customer_phone: customerPhone }),
    },
    select: {
      id: true,
      share_token: true,
      project_id: true,
    },
  });
};

export const getAgentLeads = (agentId: string) => {
  return prisma.lead.findMany({
    where: { agent_id: agentId },
    select: {
      id: true,
      share_token: true,
      first_click_at: true,
      customer_name: true,
      is_locked: true,
      project: { select: { id: true, project_name: true, location: true } },
    },
    orderBy: { first_click_at: { sort: 'desc', nulls: 'last' } },
  });
};

export const getLeadById = (id: string) => {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      project: { select: { ...projectPublicSelect, is_published: true } },
      agent: { select: { id: true, name: true, phone: true } },
    },
  });
};

export const getLeadByToken = (shareToken: string) => {
  return prisma.lead.findUnique({
    where: { share_token: shareToken },
  });
};

export const recordFirstClick = async (shareToken: string) => {
  const lead = await prisma.lead.findUnique({ where: { share_token: shareToken } });
  if (!lead) return null;

  if (!lead.first_click_at) {
    return prisma.lead.update({
      where: { share_token: shareToken },
      data: { first_click_at: new Date() },
    });
  }

  return lead;
};

export const getPublicLeadData = (shareToken: string) => {
  return prisma.lead.findUnique({
    where: { share_token: shareToken },
    select: {
      id: true,
      agent_id: true,
      project: {
        select: {
          ...projectPublicSelect,
          units: {
            select: unitPublicSelect,
            orderBy: { unit_number: 'asc' },
          },
        },
      },
    },
  });
};
