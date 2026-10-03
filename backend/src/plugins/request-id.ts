import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';

const validRequestId = /^[a-zA-Z0-9_-]{8,128}$/;

export const requestIdPlugin = fp(async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    const supplied = request.headers['x-request-id'];
    const candidate = Array.isArray(supplied) ? supplied[0] : supplied;
    request.requestId = candidate && validRequestId.test(candidate)
      ? candidate
      : `req_${randomUUID().replaceAll('-', '')}`;
    reply.header('x-request-id', request.requestId);
  });
  app.addHook('onResponse', async (request, reply) => {
    request.log.info({ request_id: request.requestId, status_code: reply.statusCode }, 'Request completed');
  });
}, { name: 'request-id' });
