import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { protect } from '../../middlewares/auth';
import { roles } from '../../middlewares/roles';
import { csvUpload } from '../../utils/multer';
import { apiResponse } from '../../utils/apiResponse';
import * as unitController from './unitController';

const router = Router();

const adminOnly = [protect, roles('Admin')];

// Wrap multer so errors come back as JSON (not Express HTML 500)
const csvMiddleware = (req: Request, res: Response, next: NextFunction) => {
  csvUpload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 2 MB limit' : err.message;
      return apiResponse(res, 400, null, msg);
    }
    if (err) return apiResponse(res, 400, null, err.message);
    next();
  });
};

// /bulk must be declared before /:id so it isn't swallowed by the param route
router.post('/bulk',      ...adminOnly, csvMiddleware, unitController.bulkCreateUnits);
router.post('/',          ...adminOnly,                unitController.createUnit);
router.get('/:id',                                     unitController.getUnit);
router.patch('/:id',      ...adminOnly,                unitController.updateUnit);
router.patch('/:id/status', ...adminOnly,              unitController.overrideStatus);

export default router;
