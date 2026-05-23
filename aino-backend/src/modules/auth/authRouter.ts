import { Router } from 'express';
import { protect } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
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

export default router;
