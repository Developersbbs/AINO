import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { protect } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { userDocUpload } from '../../utils/multer';
import { apiResponse } from '../../utils/apiResponse';
import * as authController from './authController';
import {
  sendOtpValidator,
  verifyOtpValidator,
  registerValidator,
  refreshValidator,
} from './validators';

const router = Router();

router.post('/send-otp',       sendOtpValidator,   validate, authController.sendOtp);
router.post('/verify-otp',     verifyOtpValidator, validate, authController.verifyOtp);
router.post('/firebase-verify', authController.firebaseVerify);
router.post('/register',       registerValidator,  validate, authController.register);
router.post('/refresh',    refreshValidator,    validate, authController.refresh);
router.post('/logout',     protect,                       authController.logout);
router.delete('/account',  protect,                       authController.deleteAccount);
router.get('/me',          protect,                       authController.me);
router.patch('/me',        protect,                       authController.updateMe);

router.post(
  '/me/documents',
  protect,
  (req: Request, res: Response, next: NextFunction) => {
    userDocUpload.single('file')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 10 MB limit' : err.message;
        return apiResponse(res, 400, null, msg);
      }
      if (err) return apiResponse(res, 400, null, err.message);
      next();
    });
  },
  authController.uploadUserDocument,
);

router.delete('/me/documents/:index', protect, authController.deleteUserDocument);

export default router;
