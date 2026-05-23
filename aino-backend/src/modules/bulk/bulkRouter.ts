import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { protect } from '../../middlewares/auth';
import { roles } from '../../middlewares/roles';
import { csvUpload } from '../../utils/multer';
import { apiResponse } from '../../utils/apiResponse';
import * as bulkController from './bulkController';

const router = Router();
const adminOnly = [protect, roles('Admin')];

// Parse CSV → preview rows (no DB write)
router.post(
  '/projects/parse',
  ...adminOnly,
  (req: Request, res: Response, next: NextFunction) => {
    csvUpload.single('file')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 2 MB limit' : err.message;
        return apiResponse(res, 400, null, msg);
      }
      if (err) return apiResponse(res, 400, null, err.message);
      next();
    });
  },
  bulkController.parseProjects,
);

// Confirm creation from previewed rows
router.post('/projects/create', ...adminOnly, bulkController.createProjects);

export default router;
