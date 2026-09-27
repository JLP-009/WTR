import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken, generateRefreshToken, hashRefreshToken } from '../../src/common/auth/jwt.js';
import { hashPassword, verifyPassword } from '../../src/common/auth/password.js';
import type { Environment } from '../../src/config/env.js';

const testEnv: Environment = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 3000,
  DATABASE_URL: 'postgres://wtr:wtr@localhost:5432/wtr',
  JWT_SECRET: 'test-secret-key-that-is-at-least-32-chars-long!',
  JWT_EXPIRY: '15m',
  CORS_ORIGIN: 'http://localhost:5173',
  LOG_LEVEL: 'error',
  WS_HEARTBEAT_INTERVAL_MS: 30000,
  SIMULATION_TICK_INTERVAL_MS: 10000,
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_WINDOW: '1 minute',
};

describe('Auth Unit Tests', () => {
  it('hashes and verifies passwords correctly with Argon2', async () => {
    const raw = 'SuperSecret123!';
    const hash = await hashPassword(raw);
    expect(hash).toContain('$argon2id$');
    
    const isValid = await verifyPassword(hash, raw);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword(hash, 'WrongPassword');
    expect(isInvalid).toBe(false);
  });

  it('signs and verifies JWT access tokens with Jose', async () => {
    const payload = {
      userId: 'usr-uuid-1',
      publicId: 'usr_01',
      participantId: 'TRADER001',
      role: 'PARTICIPANT' as const,
    };

    const { token, expiresInSeconds } = await signAccessToken(payload, testEnv);
    expect(typeof token).toBe('string');
    expect(expiresInSeconds).toBe(900);

    const verified = await verifyAccessToken(token, testEnv);
    expect(verified.userId).toBe(payload.userId);
    expect(verified.participantId).toBe(payload.participantId);
    expect(verified.role).toBe(payload.role);
  });

  it('generates and hashes refresh tokens', () => {
    const rawToken = generateRefreshToken();
    expect(rawToken.startsWith('rft_')).toBe(true);

    const hash1 = hashRefreshToken(rawToken);
    const hash2 = hashRefreshToken(rawToken);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});
