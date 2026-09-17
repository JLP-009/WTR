import type { FastifyPluginAsync } from 'fastify';

export const routes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (request) => ({ data: { status: 'ok' }, request_id: request.requestId }));
};
