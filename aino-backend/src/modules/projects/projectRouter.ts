import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { protect } from '../../middlewares/auth';
import { roles } from '../../middlewares/roles';
import { publicRateLimit } from '../../utils/rateLimiter';
import { layoutUpload, documentUpload } from '../../utils/multer';
import { apiResponse } from '../../utils/apiResponse';
import * as projectController from './projectController';

const router = Router();

const adminOnly = [protect, roles('Admin')];

// ── Public routes (rate-limited) ──────────────────────────────────────────────
router.get('/',         publicRateLimit, projectController.listProjects);
router.get('/:id',      publicRateLimit, projectController.getProject);
router.get('/:id/units', publicRateLimit, projectController.getUnits);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.post('/',                   ...adminOnly, projectController.createProject);
router.patch('/:id',               ...adminOnly, projectController.updateProject);
router.post('/:id/publish',        ...adminOnly, projectController.publishProject);
router.post('/:id/unpublish',      ...adminOnly, projectController.unpublishProject);
router.post('/:id/assign-owner',   ...adminOnly, projectController.assignOwner);

// Layout upload — multer errors returned as JSON, not HTML
router.post(
  '/:id/layout',
  ...adminOnly,
  (req: Request, res: Response, next: NextFunction) => {
    layoutUpload.single('image')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 5 MB limit' : err.message;
        return apiResponse(res, 400, null, msg);
      }
      if (err) return apiResponse(res, 400, null, err.message);
      next();
    });
  },
  projectController.uploadLayout,
);

// Document upload / delete
router.post(
  '/:id/documents',
  ...adminOnly,
  (req: Request, res: Response, next: NextFunction) => {
    documentUpload.single('file')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 10 MB limit' : err.message;
        return apiResponse(res, 400, null, msg);
      }
      if (err) return apiResponse(res, 400, null, err.message);
      next();
    });
  },
  projectController.uploadDocument,
);

router.delete('/:id/documents/:index', ...adminOnly, projectController.deleteDocument);

export default router;
