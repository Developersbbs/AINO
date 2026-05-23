import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import redis from '../../config/redis';
import admin from '../../config/firebase';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export const generateTokens = async (userId: string, role: string) => {
  const accessToken = jwt.sign({ id: userId, role }, ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId, role }, REFRESH_SECRET, { expiresIn: '7d' });

  const hash = await bcrypt.hash(refreshToken, 10);
  await redis.set(`refresh:${userId}`, hash, 'EX', REFRESH_TTL);

  return { accessToken, refreshToken };
};

export const sendOtp = async (phone: string): Promise<string> => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const hash = await bcrypt.hash(otp, 10);

  await prisma.otpLog.create({
    data: { phone, otp_code: hash, expires_at: expiresAt },
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[DEV OTP] ${phone} → ${otp}\n`);
  }

  return otp;
};

export const verifyFirebaseToken = async (idToken: string): Promise<string> => {
  const decoded = await admin.auth().verifyIdToken(idToken);
  if (!decoded.phone_number) throw new Error('No phone number in Firebase token');
  return decoded.phone_number;
};

export const verifyOtpCode = async (phone: string, otp: string): Promise<boolean> => {
  // Find latest unverified, unexpired OTP for this phone
  const log = await prisma.otpLog.findFirst({
    where: { phone, is_verified: false, expires_at: { gt: new Date() } },
    orderBy: { expires_at: 'desc' },
  });

  if (!log) return false;

  const match = await bcrypt.compare(otp, log.otp_code);
  if (!match) return false;

  await prisma.otpLog.update({ where: { id: log.id }, data: { is_verified: true } });
  return true;
};

export const findUserByPhone = async (phone: string) => {
  return prisma.user.findUnique({ where: { phone } });
};

export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { id: string; role: string };
  const storedHash = await redis.get(`refresh:${decoded.id}`);

  if (!storedHash) throw new Error('Session not found');

  const valid = await bcrypt.compare(refreshToken, storedHash);
  if (!valid) throw new Error('Invalid refresh token');

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw new Error('User not found');

  return jwt.sign({ id: user.id, role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });
};

export const revokeSession = async (userId: string): Promise<void> => {
  await redis.del(`refresh:${userId}`);
};
