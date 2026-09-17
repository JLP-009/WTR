import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Environment } from '../config/env.js';

export const securityPlugin = (env: Environment) => fp(async (app) => {
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(helmet);
  await app.register(rateLimit, { max: env.RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW });
}, { name: 'security' });
