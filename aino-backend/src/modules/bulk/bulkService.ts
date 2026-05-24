import { parse } from 'csv-parse/sync';
import prisma from '../../config/database';

export interface CsvRowData {
  name: string;
  type: string;
  location: string;
  rera?: string;
  ownerPhone?: string;
  block?: string;
  approvalAuthority?: string;
  approvalNumber?: string;
}

export interface ParsedRow {
  row: number;
  data: CsvRowData;
  valid: boolean;
  errors: string[];
}

function pick(record: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const val = record[k]?.trim();
    if (val) return val;
  }
  return '';
}

export const parseProjectsCsv = (buffer: Buffer): ParsedRow[] => {
  let records: Record<string, string>[];
  try {
    records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
    });
  } catch (e: any) {
    throw new Error(`CSV parse error: ${e.message}`);
  }

  if (records.length === 0) throw new Error('CSV file has no data rows');

  return records.map((record, i) => {
    const name     = pick(record, 'Name', 'name', 'project_name', 'Project Name');
    const type     = pick(record, 'Type', 'type', 'project_type', 'Project Type');
    const location = pick(record, 'Location', 'location');

    const rera              = pick(record, 'RERA Number', 'RERA', 'rera', 'rera_number') || undefined;
    const ownerPhone        = pick(record, 'Owner Phone', 'owner_phone', 'Owner') || undefined;
    const block             = pick(record, 'Block/Phase', 'Block', 'Phase', 'block_phase') || undefined;
    const approvalAuthority = pick(record, 'Approval Authority', 'approval_authority') || undefined;
    const approvalNumber    = pick(record, 'Approval Number', 'approval_number') || undefined;

    const errors: string[] = [];
    if (!name)     errors.push('Name is required');
    if (!type)     errors.push('Type is required');
    if (!location) errors.push('Location is required');

    return {
      row: i + 2, // row 1 = header
      data: { name, type, location, rera, ownerPhone, block, approvalAuthority, approvalNumber },
      valid: errors.length === 0,
      errors,
    };
  });
};

// ─── Units bulk upload ────────────────────────────────────────────────────────

export interface UnitCsvRow {
  unit_number: string;
  sq_ft: number;
  price: number;
  facing?: string;
  road_width?: number;
  plot_type?: string;
  booking_amount?: number;
  commission_percentage?: number;
  corner_plot?: boolean;
  registration_ready?: boolean;
  water?: boolean;
  electricity?: boolean;
  drainage?: boolean;
  street_lights?: boolean;
  compound_wall?: boolean;
  park?: boolean;
  security?: boolean;
}

export interface ParsedUnitRow {
  row: number;
  data: UnitCsvRow;
  valid: boolean;
  errors: string[];
}

const YES_VALUES = new Set(['yes', 'y', 'true', '1']);

function parseBool(val: string): boolean {
  return YES_VALUES.has(val.toLowerCase().trim());
}

function parseNum(raw: string): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

function pickBool(record: Record<string, string>, ...keys: string[]): boolean | undefined {
  const val = pick(record, ...keys);
  return val ? parseBool(val) : undefined;
}

function parseOptionalUnitFields(record: Record<string, string>): Partial<UnitCsvRow> {
  const out: Partial<UnitCsvRow> = {};
  const facing    = pick(record, 'Facing', 'facing');
  const roadWidth = parseNum(pick(record, 'Road Width', 'road_width'));
  const plotType  = pick(record, 'Plot Type', 'plot_type');
  const ba        = parseNum(pick(record, 'Booking Amount', 'booking_amount'));
  const comm      = parseNum(pick(record, 'Commission %', 'commission_percentage', 'Commission'));

  if (facing)    out.facing    = facing;
  if (roadWidth) out.road_width = roadWidth;
  if (plotType)  out.plot_type  = plotType;
  if (ba)        out.booking_amount        = ba;
  if (comm)      out.commission_percentage = comm;

  const cp  = pickBool(record, 'Corner Plot', 'corner_plot');
  const rr  = pickBool(record, 'Registration Ready', 'registration_ready');
  const w   = pickBool(record, 'Water', 'water');
  const el  = pickBool(record, 'Electricity', 'electricity');
  const dr  = pickBool(record, 'Drainage', 'drainage');
  const sl  = pickBool(record, 'Street Lights', 'street_lights');
  const cw  = pickBool(record, 'Compound Wall', 'compound_wall');
  const pk  = pickBool(record, 'Park', 'park');
  const sec = pickBool(record, 'Security', 'security');

  if (cp  !== undefined) out.corner_plot        = cp;
  if (rr  !== undefined) out.registration_ready = rr;
  if (w   !== undefined) out.water              = w;
  if (el  !== undefined) out.electricity        = el;
  if (dr  !== undefined) out.drainage           = dr;
  if (sl  !== undefined) out.street_lights      = sl;
  if (cw  !== undefined) out.compound_wall      = cw;
  if (pk  !== undefined) out.park               = pk;
  if (sec !== undefined) out.security           = sec;

  return out;
}

function buildAttrsFromUnitCsvRow(r: UnitCsvRow): Record<string, unknown> | undefined {
  const a: Record<string, unknown> = {};
  if (r.plot_type)             a.plotType             = r.plot_type;
  if (r.booking_amount)        a.bookingAmount        = r.booking_amount;
  if (r.commission_percentage) a.commissionPercentage = r.commission_percentage;
  if (r.corner_plot)           a.cornerPlot           = true;
  if (r.registration_ready)    a.registrationReady    = true;
  if (r.water)                 a.water                = true;
  if (r.electricity)           a.electricity          = true;
  if (r.drainage)              a.drainage             = true;
  if (r.street_lights)         a.streetLights         = true;
  if (r.compound_wall)         a.compoundWall         = true;
  if (r.park)                  a.park                 = true;
  if (r.security)              a.security             = true;
  return Object.keys(a).length > 0 ? a : undefined;
}

export const parseUnitsCsv = (buffer: Buffer): ParsedUnitRow[] => {
  let records: Record<string, string>[];
  try {
    records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true, relax_quotes: true });
  } catch (e: any) {
    throw new Error(`CSV parse error: ${e.message}`);
  }
  if (records.length === 0) throw new Error('CSV file has no data rows');

  return records.map((record, i) => {
    const unit_number = pick(record, 'Plot Number', 'plot_number', 'Unit Number', 'unit_number');
    const sq_ft       = parseNum(pick(record, 'Size (sqft)', 'size_sqft', 'sq_ft', 'sqft', 'Size'));
    const price       = parseNum(pick(record, 'Price', 'price', 'Total Price', 'total_price'));

    const errors: string[] = [];
    if (!unit_number)              errors.push('Plot Number is required');
    if (!sq_ft || sq_ft <= 0)      errors.push('Size (sqft) must be a positive number');
    if (!price || price <= 0)      errors.push('Price must be a positive number');

    const data: UnitCsvRow = {
      unit_number,
      sq_ft: sq_ft ?? 0,
      price: price ?? 0,
      ...parseOptionalUnitFields(record),
    };

    return { row: i + 2, data, valid: errors.length === 0, errors };
  });
};

export const createUnitsBulk = async (projectId: string, rows: UnitCsvRow[]) => {
  let created = 0;
  const failures: { index: number; unit: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      await prisma.unit.create({
        data: {
          project_id:  projectId,
          unit_number: r.unit_number,
          sq_ft:       r.sq_ft,
          price:       r.price,
          facing:      r.facing ?? null,
          road_width:  r.road_width ?? null,
          attributes:  buildAttrsFromUnitCsvRow(r) as any,
        },
      });
      created++;
    } catch (e: any) {
      failures.push({ index: i, unit: r.unit_number, error: e.message });
    }
  }

  return { created, failed: failures.length, failures };
};

async function resolveOwnerId(phone: string | undefined): Promise<string | undefined> {
  if (!phone) return undefined;
  const owner = await prisma.user.findUnique({ where: { phone } });
  return owner?.id;
}

function buildProjectConfigAttrs(r: CsvRowData): Record<string, string> | undefined {
  const cfg: Record<string, string> = {};
  if (r.block)             cfg.block             = r.block;
  if (r.approvalAuthority) cfg.approvalAuthority = r.approvalAuthority;
  if (r.approvalNumber)    cfg.approvalNumber    = r.approvalNumber;
  return Object.keys(cfg).length > 0 ? cfg : undefined;
}

export const createProjectsBulk = async (rows: CsvRowData[]) => {
  let created = 0;
  const failures: { index: number; name: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      await prisma.project.create({
        data: {
          project_name:      r.name,
          project_type:      r.type,
          location:          r.location,
          rera_number:       r.rera ?? null,
          owner_id:          (await resolveOwnerId(r.ownerPhone)) ?? null,
          config_attributes: buildProjectConfigAttrs(r) as any,
        },
      });
      created++;
    } catch (e: any) {
      failures.push({ index: i, name: r.name, error: e.message });
    }
  }

  return { created, failed: failures.length, failures };
};
