import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { Environment } from '../../src/config/env.js';

const env: Environment = { NODE_ENV: 'test', HOST: '127.0.0.1', PORT: 3000, DATABASE_URL: 'postgres://wtr:wtr@localhost:5432/wtr', JWT_SECRET: 'a-32-character-test-secret-value-123', JWT_EXPIRY: '15m', CORS_ORIGIN: 'http://localhost:5173', LOG_LEVEL: 'error', WS_HEARTBEAT_INTERVAL_MS: 30000, SIMULATION_TICK_INTERVAL_MS: 10000, RATE_LIMIT_MAX: 100, RATE_LIMIT_WINDOW: '1 minute' };

describe('GET /health', () => {
  it('returns the envelope and an echoed request ID', async () => {
    const app = await buildApp(env);
    const response = await app.inject({ method: 'GET', url: '/health', headers: { 'x-request-id': 'req_test123' } });
    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe('req_test123');
    expect(response.json()).toEqual({ data: { status: 'ok' }, request_id: 'req_test123' });
    await app.close();
  });

  it('generates a valid request ID and envelopes 404 errors', async () => {
    const app = await buildApp(env);
    const response = await app.inject({ method: 'GET', url: '/missing', headers: { 'x-request-id': 'bad id' } });
    expect(response.statusCode).toBe(404);
    expect(response.headers['x-request-id']).toMatch(/^req_[a-f0-9]{32}$/);
    expect(response.json()).toMatchObject({ error: { code: 'NOT_FOUND' }, request_id: response.headers['x-request-id'] });
    await app.close();
  });
});
