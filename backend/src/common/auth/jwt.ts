import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import type { Environment } from '../../config/env.js';

export interface TokenPayload {
  userId: string;
  publicId: string;
  participantId: string;
  role: 'PARTICIPANT' | 'ADMIN';
}

export async function signAccessToken(payload: TokenPayload, env: Environment): Promise<{ token: string; expiresInSeconds: number }> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const expiresInSeconds = 900;
  
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRY || '15m')
    .sign(secret);

  return { token, expiresInSeconds };
}

export async function verifyAccessToken(token: string, env: Environment): Promise<TokenPayload> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret);
  return {
    userId: (payload.userId as string) || (payload.sub as string),
    publicId: payload.publicId as string,
    participantId: payload.participantId as string,
    role: payload.role as 'PARTICIPANT' | 'ADMIN',
  };
}

export function generateRefreshToken(): string {
  return `rft_${randomBytes(32).toString('hex')}`;
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
