import type { FastifyPluginAsync } from 'fastify';
import { loginRequestSchema, refreshRequestSchema, registerRequestSchema, resetPasswordRequestSchema } from './auth.types.js';
import { AppError } from '../../common/errors/app-error.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request) => {
    const parsed = registerRequestSchema.parse(request.body);
    const data = await app.authService.register(parsed);
    return { data, request_id: request.requestId };
  });

  app.post('/forgot-password', async (request) => {
    const parsed = resetPasswordRequestSchema.parse(request.body);
    const data = await app.authService.resetPassword(parsed);
    return { data, request_id: request.requestId };
  });

  app.post('/reset-password', async (request) => {
    const parsed = resetPasswordRequestSchema.parse(request.body);
    const data = await app.authService.resetPassword(parsed);
    return { data, request_id: request.requestId };
  });

  app.post('/login', async (request) => {
    const parsed = loginRequestSchema.parse(request.body);
    const data = await app.authService.login(parsed);
    return { data, request_id: request.requestId };
  });

  app.post('/refresh', async (request) => {
    const parsed = refreshRequestSchema.parse(request.body);
    const data = await app.authService.refresh(parsed.refresh_token);
    return { data, request_id: request.requestId };
  });

  app.post('/logout', { preHandler: [app.authenticate] }, async (request) => {
    const body = request.body as { refresh_token?: string } | undefined;
    await app.authService.logout(request.user!.userId, body?.refresh_token);
    return { data: { success: true }, request_id: request.requestId };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await app.authService.getUserById(request.user!.userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'User profile not found.');
    }
    return {
      data: {
        user_id: user.publicId,
        participant_id: user.participantId,
        display_name: user.displayName,
        role: user.role,
        account_status: user.accountStatus,
        created_at: user.createdAt.toISOString(),
      },
      request_id: request.requestId,
    };
  });
};
