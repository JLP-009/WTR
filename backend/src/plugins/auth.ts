import fp from 'fastify-plugin';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../common/errors/app-error.js';
import { verifyAccessToken } from '../common/auth/jwt.js';
import { AuthService } from '../modules/auth/auth.service.js';
import type { Database } from '../db/client.js';
import type { Environment } from '../config/env.js';

export interface AuthPluginOptions {
  db: Database;
  env: Environment;
}

export const authPlugin = fp<AuthPluginOptions>(async (app, options) => {
  const authService = new AuthService(options.db, options.env);
  app.decorate('authService', authService);

  const authenticate = async (request: FastifyRequest, _reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHENTICATED', 401, 'Authorization bearer token is missing or malformed.');
    }

    const token = authHeader.slice(7).trim();
    try {
      const payload = await verifyAccessToken(token, options.env);
      request.user = payload;
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'ERR_JWT_EXPIRED') {
        throw new AppError('TOKEN_EXPIRED', 401, 'Access token has expired.');
      }
      throw new AppError('UNAUTHENTICATED', 401, 'Invalid access token.');
    }
  };

  const optionalAuthenticate = async (request: FastifyRequest, _reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return;
    }

    const token = authHeader.slice(7).trim();
    try {
      const payload = await verifyAccessToken(token, options.env);
      request.user = payload;
    } catch {
      // Ignored for optional auth
    }
  };

  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (request.user?.role !== 'ADMIN') {
      throw new AppError('FORBIDDEN', 403, 'Administrator privileges required.');
    }
  };

  app.decorate('authenticate', authenticate);
  app.decorate('optionalAuthenticate', optionalAuthenticate);
  app.decorate('requireAdmin', requireAdmin);
}, { name: 'auth-plugin' });
