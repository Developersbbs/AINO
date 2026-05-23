import { Router } from 'express';
import { sendOtp, verifyOtp, register, login, resetPassword, firebaseVerifyAndAuth } from '../controllers/authController';

const router = Router();

// Firebase phone auth (primary flow)
router.post('/firebase-verify', firebaseVerifyAndAuth);

// Legacy OTP (fallback / testing)
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPassword);

export default router;
