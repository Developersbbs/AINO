import prisma from '../../config/database';
import { UserRole } from '@prisma/client';

const ilike = (val: string) => ({ contains: val, mode: 'insensitive' as const });

export const globalSearch = async (query: string, userId: string, role: UserRole) => {
  const q = query.trim();
  if (q.length < 2) return { projects: [], plots: [], bookings: [], people: [] };

  if (role === UserRole.Admin) {
    const [projects, plots, bookings, agents, customers] = await Promise.all([
      // Projects
      prisma.project.findMany({
        where: {
          OR: [
            { project_name: ilike(q) },
            { location: ilike(q) },
          ],
        },
        select: {
          id: true, project_name: true, location: true,
          is_published: true, _count: { select: { units: true } },
        },
        take: 5,
      }),
      // Units/Plots
      prisma.unit.findMany({
        where: {
          OR: [
            { unit_number: ilike(q) },
            { project: { project_name: ilike(q) } },
            { facing: ilike(q) },
          ],
        },
        select: {
          id: true, unit_number: true, sq_ft: true, price: true,
          facing: true, status: true,
          project: { select: { id: true, project_name: true } },
        },
        take: 8,
      }),
      // Bookings
      prisma.booking.findMany({
        where: {
          OR: [
            { customer_name: ilike(q) },
            { customer_phone: ilike(q) },
            { unit: { unit_number: ilike(q) } },
          ],
        },
        select: {
          id: true, customer_name: true, customer_phone: true,
          booking_date: true, status: true,
          unit: { select: { unit_number: true, project: { select: { project_name: true } } } },
        },
        take: 6,
      }),
      // Agents
      prisma.user.findMany({
        where: {
          role: UserRole.Agent,
          deleted_at: null,
          OR: [{ name: ilike(q) }, { phone: ilike(q) }],
        },
        select: {
          id: true, name: true, phone: true, is_approved: true,
          _count: { select: { bookings: true } },
        },
        take: 5,
      }),
      // Customers (unique from bookings)
      prisma.booking.findMany({
        where: {
          OR: [{ customer_name: ilike(q) }, { customer_phone: ilike(q) }],
        },
        select: { customer_name: true, customer_phone: true },
        distinct: ['customer_phone'],
        take: 5,
      }),
    ]);

    return {
      projects: projects.map((p) => ({
        id: p.id, name: p.project_name, location: p.location,
        unitCount: p._count.units, isPublished: p.is_published,
      })),
      plots: plots.map((u) => ({
        id: u.id, unitNumber: u.unit_number, sqFt: u.sq_ft,
        price: u.price, facing: u.facing, status: u.status,
        projectId: u.project.id, projectName: u.project.project_name,
      })),
      bookings: bookings.map((b) => ({
        id: b.id, customerName: b.customer_name, customerPhone: b.customer_phone,
        date: b.booking_date, status: b.status,
        unitNumber: b.unit.unit_number,
        projectName: b.unit.project.project_name,
      })),
      people: [
        ...agents.map((a) => ({
          id: a.id, name: a.name, phone: a.phone,
          type: 'Agent' as const, isActive: a.is_approved,
          sales: a._count.bookings,
        })),
        ...customers.map((c) => ({
          id: `cust-${c.customer_phone}`, name: c.customer_name,
          phone: c.customer_phone, type: 'Customer' as const,
          isActive: true, sales: 0,
        })),
      ],
    };
  }

  if (role === UserRole.Agent) {
    const [plots, bookings] = await Promise.all([
      prisma.unit.findMany({
        where: {
          OR: [
            { unit_number: ilike(q) },
            { project: { project_name: ilike(q) } },
          ],
        },
        select: {
          id: true, unit_number: true, sq_ft: true, price: true,
          facing: true, status: true,
          project: { select: { id: true, project_name: true } },
        },
        take: 8,
      }),
      prisma.booking.findMany({
        where: {
          agent_id: userId,
          OR: [
            { customer_name: ilike(q) },
            { customer_phone: ilike(q) },
            { unit: { unit_number: ilike(q) } },
          ],
        },
        select: {
          id: true, customer_name: true, customer_phone: true,
          booking_date: true, status: true,
          unit: { select: { unit_number: true, project: { select: { project_name: true } } } },
        },
        take: 6,
      }),
    ]);

    const customers = [...new Map(
      bookings.map((b) => [b.customer_phone, { customer_name: b.customer_name, customer_phone: b.customer_phone }]),
    ).values()];

    return {
      projects: [],
      plots: plots.map((u) => ({
        id: u.id, unitNumber: u.unit_number, sqFt: u.sq_ft,
        price: u.price, facing: u.facing, status: u.status,
        projectId: u.project.id, projectName: u.project.project_name,
      })),
      bookings: bookings.map((b) => ({
        id: b.id, customerName: b.customer_name, customerPhone: b.customer_phone,
        date: b.booking_date, status: b.status,
        unitNumber: b.unit.unit_number, projectName: b.unit.project.project_name,
      })),
      people: customers.map((c) => ({
        id: `cust-${c.customer_phone}`, name: c.customer_name,
        phone: c.customer_phone, type: 'Customer' as const,
        isActive: true, sales: 0,
      })),
    };
  }

  // Owner
  const [projects, plots, bookings] = await Promise.all([
    prisma.project.findMany({
      where: {
        owner_id: userId,
        OR: [{ project_name: ilike(q) }, { location: ilike(q) }],
      },
      select: {
        id: true, project_name: true, location: true,
        is_published: true, _count: { select: { units: true } },
      },
      take: 5,
    }),
    prisma.unit.findMany({
      where: {
        project: { owner_id: userId },
        OR: [{ unit_number: ilike(q) }, { facing: ilike(q) }],
      },
      select: {
        id: true, unit_number: true, sq_ft: true, price: true,
        facing: true, status: true,
        project: { select: { id: true, project_name: true } },
      },
      take: 8,
    }),
    prisma.booking.findMany({
      where: {
        unit: { project: { owner_id: userId } },
        OR: [{ customer_name: ilike(q) }, { customer_phone: ilike(q) }],
      },
      select: {
        id: true, customer_name: true, customer_phone: true,
        booking_date: true, status: true,
        unit: { select: { unit_number: true, project: { select: { project_name: true } } } },
      },
      take: 6,
    }),
  ]);

  return {
    projects: projects.map((p) => ({
      id: p.id, name: p.project_name, location: p.location,
      unitCount: p._count.units, isPublished: p.is_published,
    })),
    plots: plots.map((u) => ({
      id: u.id, unitNumber: u.unit_number, sqFt: u.sq_ft,
      price: u.price, facing: u.facing, status: u.status,
      projectId: u.project.id, projectName: u.project.project_name,
    })),
    bookings: bookings.map((b) => ({
      id: b.id, customerName: b.customer_name, customerPhone: b.customer_phone,
      date: b.booking_date, status: b.status,
      unitNumber: b.unit.unit_number, projectName: b.unit.project.project_name,
    })),
    people: [],
  };
};
