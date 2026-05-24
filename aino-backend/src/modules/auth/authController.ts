import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../../middlewares/auth';
import prisma from '../../config/database';
import * as authService from './authService';

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone is required' });

    const otp = await authService.sendOtp(phone);

    const response: Record<string, string> = { message: 'OTP sent' };
    if (process.env.NODE_ENV === 'development') response.devOtp = otp;

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { phone, otp, firebaseIdToken } = req.body;

    let verifiedPhone: string;

    if (firebaseIdToken) {
      try {
        verifiedPhone = await authService.verifyFirebaseToken(firebaseIdToken);
      } catch (e: any) {
        if (e.code === 'FIREBASE_TIMEOUT') {
          return res.status(503).json({ message: 'Verification service timed out. Please try again.' });
        }
        return res.status(401).json({ message: 'Invalid or expired Firebase token' });
      }
    } else {
      if (!phone || !otp) {
        return res.status(400).json({ message: 'phone and otp are required' });
      }
      const valid = await authService.verifyOtpCode(phone, otp);
      if (!valid) return res.status(400).json({ message: 'Invalid or expired OTP' });
      verifiedPhone = phone;
    }

    const user = await authService.findUserByPhone(verifiedPhone);

    if (!user) {
      return res.status(404).json({
        message: 'OTP verified. Please complete registration.',
        phone: verifiedPhone,
        requiresRegistration: true,
      });
    }

    const { accessToken, refreshToken } = await authService.generateTokens(user.id, user.role);

    return res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isApproved: user.is_approved,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken is required' });

    const accessToken = await authService.refreshAccessToken(refreshToken);
    return res.status(200).json({ accessToken });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    await authService.revokeSession(req.user!.id);
    return res.status(200).json({ message: 'Logged out' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, phone: true, email: true, role: true, is_approved: true, documents: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const uploadUserDocument = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { documents: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const existing = (user.documents as any[]) ?? [];
    const newDoc = {
      name: (req.body.docType as string | undefined)?.trim() || req.file.originalname,
      url: `/uploads/user-docs/${req.file.filename}`,
      type: req.file.mimetype.includes('pdf') ? 'pdf' : 'image',
      uploadedAt: new Date().toISOString(),
    };

    await prisma.user.update({
      where: { id: userId },
      data: { documents: [...existing, newDoc] as any },
    });

    return res.status(200).json({ message: 'Document uploaded', document: newDoc });
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUserDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const index = Number(req.params.index);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { documents: true } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const existing = (user.documents as any[]) ?? [];
    if (index < 0 || index >= existing.length) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { documents: existing.filter((_, i) => i !== index) as any },
    });

    return res.status(200).json({ message: 'Document deleted' });
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── Firebase-verify: handles both login and registration from the mobile app ──

export const firebaseVerify = async (req: Request, res: Response) => {
  try {
    const { firebaseIdToken, name, email, role } = req.body;

    if (!firebaseIdToken) {
      return res.status(400).json({ message: 'firebaseIdToken is required' });
    }

    let verifiedPhone: string;
    try {
      verifiedPhone = await authService.verifyFirebaseToken(firebaseIdToken);
    } catch (e: any) {
      if (e.code === 'FIREBASE_TIMEOUT') {
        return res.status(503).json({ message: 'Verification service timed out. Please try again.' });
      }
      return res.status(401).json({ message: 'Invalid or expired Firebase token' });
    }

    // ── Registration path: name + role were supplied ──────────────────────────
    if (name && role) {
      if (!['Agent', 'Owner'].includes(role)) {
        return res.status(400).json({ message: 'role must be Agent or Owner' });
      }

      let user = await prisma.user.findUnique({ where: { phone: verifiedPhone } });
      if (user) {
        const { accessToken, refreshToken } = await authService.generateTokens(user.id, user.role);
        return res.status(200).json({
          message: 'Welcome back!',
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            isApproved: true,
          },
        });
      }

      user = await prisma.user.create({
        data: {
          name,
          phone: verifiedPhone,
          email: email || undefined,
          role: role as UserRole,
          is_approved: false,
        },
      });

      return res.status(201).json({
        message: 'Registration successful! Your account is pending admin approval.',
        requiresApproval: true,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      });
    }

    // ── Login path ────────────────────────────────────────────────────────────
    const user = await authService.findUserByPhone(verifiedPhone);

    if (!user) {
      return res.status(200).json({
        message: 'OTP verified. Please complete registration.',
        phone: verifiedPhone,
        requiresRegistration: true,
      });
    }

    const { accessToken, refreshToken } = await authService.generateTokens(user.id, user.role);

    return res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isApproved: user.is_approved,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    await prisma.$transaction([
      prisma.unit.updateMany({ where: { booked_by_agent_id: userId }, data: { booked_by_agent_id: null } }),
      prisma.project.updateMany({ where: { owner_id: userId }, data: { owner_id: null } }),
      prisma.commission.deleteMany({ where: { agent_id: userId } }),
      prisma.booking.deleteMany({ where: { agent_id: userId } }),
      prisma.lead.deleteMany({ where: { agent_id: userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    return res.status(200).json({ message: 'Account deleted' });
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── REST-style register (API clients, not the mobile Firebase flow) ──────────

export const register = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, role } = req.body as {
      name: string;
      phone: string;
      email?: string;
      role: 'Agent' | 'Owner';
    };

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return res.status(409).json({ message: 'Phone number already registered' });
    }

    await prisma.user.create({
      data: {
        name,
        phone,
        email: email ?? null,
        role: role as UserRole,
        is_approved: false,
      },
    });

    return res.status(201).json({
      message: 'Registration submitted, pending admin approval',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error });
  }
};
