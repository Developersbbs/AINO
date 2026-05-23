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

export const createProjectsBulk = async (rows: CsvRowData[]) => {
  let created = 0;
  const failures: { index: number; name: string; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      let ownerId: string | undefined;
      if (r.ownerPhone) {
        const owner = await prisma.user.findUnique({ where: { phone: r.ownerPhone } });
        if (owner) ownerId = owner.id;
      }

      const configAttributes: Record<string, string> = {};
      if (r.block)             configAttributes.block             = r.block;
      if (r.approvalAuthority) configAttributes.approvalAuthority = r.approvalAuthority;
      if (r.approvalNumber)    configAttributes.approvalNumber    = r.approvalNumber;

      await prisma.project.create({
        data: {
          project_name: r.name,
          project_type: r.type,
          location:     r.location,
          rera_number:  r.rera ?? null,
          owner_id:     ownerId ?? null,
          config_attributes: Object.keys(configAttributes).length > 0
            ? configAttributes as any
            : undefined,
        },
      });
      created++;
    } catch (e: any) {
      failures.push({ index: i, name: r.name, error: e.message });
    }
  }

  return { created, failed: failures.length, failures };
};
