import { SignJWT, jwtVerify, decodeJwt } from 'jose';
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
  const expiresInSeconds = 86400; // 24 hours (full trading day)
  
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRY || '24h')
    .sign(secret);

  return { token, expiresInSeconds };
}

export async function verifyAccessToken(token: string, env: Environment): Promise<TokenPayload> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: (payload.userId as string) || (payload.sub as string),
      publicId: payload.publicId as string,
      participantId: payload.participantId as string,
      role: payload.role as 'PARTICIPANT' | 'ADMIN',
    };
  } catch (err: unknown) {
    // Seamless grace check: if token's exp passed, cryptographically verify signature at issuance time
    // This ensures existing participants who already logged in NEVER get kicked out or forced to re-login!
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ERR_JWT_EXPIRED') {
      try {
        const decoded = decodeJwt(token);
        if (decoded && decoded.iat) {
          const issuedDate = new Date(decoded.iat * 1000);
          // Verify HMAC-SHA256 signature with JWT_SECRET
          const { payload } = await jwtVerify(token, secret, { currentDate: issuedDate });
          const elapsed = Date.now() - (decoded.iat * 1000);
          // Allow valid tokens issued within the last 7 days
          if (elapsed < 7 * 24 * 60 * 60 * 1000) {
            return {
              userId: (payload.userId as string) || (payload.sub as string),
              publicId: payload.publicId as string,
              participantId: payload.participantId as string,
              role: payload.role as 'PARTICIPANT' | 'ADMIN',
            };
          }
        }
      } catch {
        // Fall through to throw original error if signature check fails
      }
    }
    throw err;
  }
}

export function generateRefreshToken(): string {
  return `rft_${randomBytes(32).toString('hex')}`;
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
