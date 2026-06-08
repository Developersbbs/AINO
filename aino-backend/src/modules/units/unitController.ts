import { Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import { UnitStatus } from '@prisma/client';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as unitService from './unitService';

const VALID_STATUSES = new Set(Object.values(UnitStatus));

// ── POST / ────────────────────────────────────────────────────────────────────
export const createUnit = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, unitNumber, sqFt, price, facing, roadWidth, coordinates, attributes } = req.body;

    if (!projectId || !unitNumber || sqFt == null || price == null) {
      return apiResponse(res, 400, null, 'projectId, unitNumber, sqFt and price are required');
    }

    const unit = await unitService.createUnit({
      projectId,
      unitNumber,
      sqFt: Number(sqFt),
      price: Number(price),
      facing: facing || undefined,
      roadWidth: roadWidth != null ? Number(roadWidth) : undefined,
      coordinates,
      attributes: attributes || undefined,
    });

    return apiResponse(res, 201, unit, 'Unit created');
  } catch (error: any) {
    if (error.code === 'P2002') return apiResponse(res, 409, null, 'Unit number already exists in this project');
    if (error.code === 'P2003') return apiResponse(res, 400, null, 'projectId does not reference a valid project');
    return apiResponse(res, 500, null, 'Server error');
  }
};

// ── POST /bulk ────────────────────────────────────────────────────────────────
export const bulkCreateUnits = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return apiResponse(res, 400, null, 'No CSV file provided');

    let rawRows: Record<string, string>[];
    try {
      rawRows = parse(req.file.buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      return apiResponse(res, 400, null, 'Invalid CSV format — could not parse file');
    }

    if (rawRows.length === 0) {
      return apiResponse(res, 400, null, 'CSV file contains no data rows');
    }

    const validRows: unitService.BulkRow[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const r = rawRows[i];
      const rowNum = i + 2; // +1 for 1-based, +1 for header row
      const rowErrors: string[] = [];

      if (!r.projectId?.trim()) rowErrors.push('projectId is required');
      if (!r.unitNumber?.trim()) rowErrors.push('unitNumber is required');

      const sqFt = parseFloat(r.sqFt);
      if (!r.sqFt || isNaN(sqFt) || sqFt <= 0) rowErrors.push('sqFt must be a positive number');

      const price = parseFloat(r.price);
      if (!r.price || isNaN(price) || price <= 0) rowErrors.push('price must be a positive number');

      let roadWidth: number | undefined;
      if (r.roadWidth?.trim()) {
        roadWidth = parseFloat(r.roadWidth);
        if (isNaN(roadWidth) || roadWidth <= 0) rowErrors.push('roadWidth must be a positive number');
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, message: rowErrors.join('; ') });
        continue;
      }

      validRows.push({
        project_id: r.projectId.trim(),
        unit_number: r.unitNumber.trim(),
        sq_ft: sqFt,
        price,
        facing: r.facing?.trim() || undefined,
        road_width: roadWidth,
      });
    }

    let inserted = 0;

    if (validRows.length > 0) {
      const result = await unitService.bulkCreateUnits(validRows);
      inserted = result.count;

      // Rows skipped by DB due to @@unique violation
      const skipped = validRows.length - inserted;
      if (skipped > 0) {
        errors.push({
          row: -1,
          message: `${skipped} row(s) skipped — unit number already exists in the project (use @@unique: projectId + unitNumber)`,
        });
      }
    }

    return apiResponse(res, 200, { inserted, errors }, `${inserted} unit(s) inserted`);
  } catch (error: any) {
    return apiResponse(res, 500, null, 'Server error');
  }
};

// ── GET /:id ──────────────────────────────────────────────────────────────────
export const getUnit = async (req: Request, res: Response) => {
  try {
    const unit = await unitService.getUnitById(String(req.params.id));
    if (!unit) return apiResponse(res, 404, null, 'Unit not found');
    return apiResponse(res, 200, unit, 'Unit retrieved');
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

// ── PATCH /:id ────────────────────────────────────────────────────────────────
export const updateUnit = async (req: AuthRequest, res: Response) => {
  try {
    const { sqFt, price, facing, roadWidth, coordinates, attributes } = req.body;

    const unit = await unitService.updateUnit(String(req.params.id), {
      sq_ft:       sqFt       != null  ? Number(sqFt)      : undefined,
      price:       price      != null  ? Number(price)     : undefined,
      facing:      facing     !== undefined ? facing        : undefined,
      road_width:  roadWidth  != null  ? Number(roadWidth) : undefined,
      coordinates,
      attributes,
    });

    return apiResponse(res, 200, unit, 'Unit updated');
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Unit not found');
    if (error.code === 'P2002') return apiResponse(res, 409, null, 'Plot number already exists in this project');
    return apiResponse(res, 500, null, 'Server error');
  }
};

// ── PATCH /:id/status ─────────────────────────────────────────────────────────
export const overrideStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, reason } = req.body;

    if (!VALID_STATUSES.has(status)) {
      return apiResponse(res, 400, null, `status must be one of: ${[...VALID_STATUSES].join(', ')}`);
    }

    const unit = await unitService.setUnitStatus(id, status as UnitStatus);

    console.log(`[AUDIT] unit_status_override | unitId=${id} | newStatus=${status} | adminId=${req.user!.id} | reason="${reason ?? 'none'}"`);

    return apiResponse(res, 200, unit, `Unit status set to ${status}`);
  } catch (error: any) {
    if (error.code === 'P2025') return apiResponse(res, 404, null, 'Unit not found');
    return apiResponse(res, 500, null, 'Server error');
  }
};
