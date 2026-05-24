import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { apiResponse } from '../../utils/apiResponse';
import * as bulkService from './bulkService';

export const parseProjects = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return apiResponse(res, 400, null, 'No CSV file provided');

    const rows = bulkService.parseProjectsCsv(req.file.buffer);
    const valid = rows.filter((r) => r.valid).length;

    return apiResponse(res, 200, { rows, total: rows.length, valid }, 'CSV parsed');
  } catch (e: any) {
    return apiResponse(res, 400, null, e.message);
  }
};

export const createProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = req.body as { rows: bulkService.CsvRowData[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return apiResponse(res, 400, null, 'rows array is required and must not be empty');
    }

    const result = await bulkService.createProjectsBulk(rows);
    return apiResponse(res, 200, result, `${result.created} project(s) created`);
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};

export const parseUnits = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return apiResponse(res, 400, null, 'No CSV file provided');

    const rows = bulkService.parseUnitsCsv(req.file.buffer);
    const valid = rows.filter((r) => r.valid).length;
    return apiResponse(res, 200, { rows, total: rows.length, valid }, 'CSV parsed');
  } catch (e: any) {
    return apiResponse(res, 400, null, e.message);
  }
};

export const createUnits = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, rows } = req.body as { projectId: string; rows: bulkService.UnitCsvRow[] };
    if (!projectId) return apiResponse(res, 400, null, 'projectId is required');
    if (!Array.isArray(rows) || rows.length === 0) {
      return apiResponse(res, 400, null, 'rows array is required and must not be empty');
    }

    const result = await bulkService.createUnitsBulk(projectId, rows);
    return apiResponse(res, 200, result, `${result.created} plot(s) created`);
  } catch {
    return apiResponse(res, 500, null, 'Server error');
  }
};
