import { Request, Response } from 'express';
import prisma from '../config/database';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../services/emailService';
import admin from '../config/firebase';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// ─── Firebase Phone Auth ──────────────────────────────────────────────────────

export const firebaseVerifyAndAuth = async (req: Request, res: Response) => {
  try {
    const { firebaseIdToken, name, email, role } = req.body;

    if (!firebaseIdToken) {
      return res.status(400).json({ message: 'Firebase ID token is required' });
    }

    const decoded = await admin.auth().verifyIdToken(firebaseIdToken);
    const phone = decoded.phone_number;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number not found in Firebase token' });
    }

    let user = await prisma.user.findUnique({ where: { phone } });

    if (user) {
      const token = generateToken(user.id, user.role);
      return res.status(200).json({
        message: 'Login successful',
        token,
        user: { id: user.id, name: user.name, role: user.role },
      });
    }

    // New user — require registration details
    if (!name || !email || !role) {
      return res.status(200).json({
        message: 'OTP verified. Please complete registration.',
        phone,
        requiresRegistration: true,
      });
    }

    const existingByEmail = await prisma.user.findFirst({ where: { email } });
    if (existingByEmail) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPin = await bcrypt.hash(pin, await bcrypt.genSalt(10));

    const newUser = await prisma.user.create({
      data: { name, phone, email, role: role as UserRole, password: hashedPin },
    });

    await sendEmail(
      email,
      'Your AINO Account Default PIN',
      `Hello ${name},\n\nYour account has been created.\nYour default 6-digit login PIN is: ${pin}\n\nPlease use this PIN with your phone number to login.\n\nThanks,\nAINO Team`
    );

    const token = generateToken(newUser.id, newUser.role);

    res.status(201).json({
      message: 'User registered successfully. Default PIN sent to email.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    if (error.code?.startsWith('auth/')) {
      return res.status(401).json({ message: 'Invalid or expired Firebase token', error: error.code });
    }
    res.status(500).json({ message: 'Server error', error });
  }
};

// ─── Legacy OTP (keep for fallback / testing) ────────────────────────────────

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await prisma.otpLog.create({
      data: { phone, otp_code: otp, expires_at: expiresAt },
    });

    console.log(`[DEV] OTP for ${phone}: ${otp}`);

    res.status(200).json({ message: 'OTP sent (check server logs in dev)' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phone, otp_code } = req.body;

    const otpLog = await prisma.otpLog.findFirst({
      where: { phone, otp_code, is_verified: false, expires_at: { gt: new Date() } },
    });

    if (!otpLog) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await prisma.otpLog.update({ where: { id: otpLog.id }, data: { is_verified: true } });

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      return res.status(200).json({ message: 'OTP verified, please register', phone });
    }

    const token = generateToken(user.id, user.role);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, role, otp_code } = req.body;

    const otpLog = await prisma.otpLog.findFirst({
      where: { phone, otp_code, is_verified: false, expires_at: { gt: new Date() } },
    });

    if (!otpLog) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await prisma.otpLog.update({ where: { id: otpLog.id }, data: { is_verified: true } });

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ phone }, { email }] },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this phone or email already exists' });
    }

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPin = await bcrypt.hash(pin, await bcrypt.genSalt(10));

    const newUser = await prisma.user.create({
      data: { name, phone, email, role: role as UserRole, password: hashedPin },
    });

    await sendEmail(
      email,
      'Your AINO Account Default PIN',
      `Hello ${name},\n\nYour account has been successfully created.\nYour default 6-digit login PIN is: ${pin}\n\nThanks,\nAINO Team`
    );

    res.status(201).json({
      message: 'User registered successfully. Default PIN sent to email.',
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { phone, pin } = req.body;

    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user || !user.password) {
      return res.status(400).json({ message: 'Invalid credentials or user not found' });
    }

    const isMatch = await bcrypt.compare(pin, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.role);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { phone, otp_code, new_pin } = req.body;

    const otpLog = await prisma.otpLog.findFirst({
      where: { phone, otp_code, is_verified: false, expires_at: { gt: new Date() } },
    });

    if (!otpLog) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await prisma.otpLog.update({ where: { id: otpLog.id }, data: { is_verified: true } });

    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPin = await bcrypt.hash(new_pin, await bcrypt.genSalt(10));

    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPin } });

    res.status(200).json({ message: 'PIN reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
