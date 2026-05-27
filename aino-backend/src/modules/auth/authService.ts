import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import https from 'node:https';
import twilio from 'twilio';
import prisma from '../../config/database';
import redis from '../../config/redis';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

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

  await twilioClient.messages.create({
    body: `Your AINO verification code is: ${otp}. Valid for 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phone,
  });

  return otp;
};

// ─── Firebase token verification without Admin SDK ────────────────────────────
// Verifies the RS256 JWT signature using Google's public keys, cached per
// the Cache-Control header (typically 1 hour). Falls back to a 8 s network
// timeout so the endpoint never hangs indefinitely.

interface KeyCache { keys: Record<string, string>; expiresAt: number; }
let _keyCache: KeyCache | null = null;

function fetchGooglePublicKeys(): Promise<Record<string, string>> {
  if (_keyCache && Date.now() < _keyCache.expiresAt) return Promise.resolve(_keyCache.keys);

  return new Promise((resolve, reject) => {
    let settled = false;
    let reqHandle: ReturnType<typeof https.get> | null = null;

    // Unconditional 5 s deadline — fires even if DNS never resolves
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reqHandle?.destroy();
      reject(Object.assign(new Error('Timed out fetching Google public keys'), { code: 'FIREBASE_TIMEOUT' }));
    }, 5_000);

    reqHandle = https.get(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      (res) => {
        let raw = '';
        res.on('data', (chunk: string) => { raw += chunk; });
        res.on('end', () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          try {
            const keys = JSON.parse(raw) as Record<string, string>;
            const cc = String(res.headers['cache-control'] ?? '');
            const m = /max-age=(\d+)/.exec(cc);
            _keyCache = { keys, expiresAt: Date.now() + (m ? Number(m[1]) * 1_000 : 3_600_000) };
            resolve(keys);
          } catch { reject(new Error('Failed to parse Google public keys')); }
        });
      },
    );
    reqHandle.on('error', (e: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });
  });
}

export const verifyFirebaseToken = async (idToken: string): Promise<string> => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID env var is not set');

  const header = jwt.decode(idToken, { complete: true });
  if (!header || typeof header === 'string' || !header.header.kid) {
    throw new Error('Malformed Firebase ID token');
  }

  const keys = await fetchGooglePublicKeys();
  const publicKey = keys[header.header.kid];
  if (!publicKey) throw new Error('Firebase token: unknown key ID — try again');

  const payload = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  }) as jwt.JwtPayload;

  const phone = payload.phone_number;
  if (!phone) throw new Error('No phone number in Firebase token');
  return phone;
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
