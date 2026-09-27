import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Environment } from '../config/env.js';

export const securityPlugin = (env: Environment) => fp(async (app) => {
  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? env.CORS_ORIGIN : true,
    credentials: true,
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX || 1000,
    timeWindow: env.RATE_LIMIT_WINDOW || '1 minute',
    keyGenerator: (req) => {
      const user = (req as any).user;
      return user?.userId || req.ip;
    },
  });
}, { name: 'security' });
