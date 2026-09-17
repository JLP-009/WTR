import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../common/errors/app-error.js';

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    const appError = error instanceof AppError ? error : error instanceof ZodError
      ? new AppError('VALIDATION_ERROR', 400, 'Request validation failed.', { fields: error.issues.map((issue) => ({ field: issue.path.join('.'), reason: issue.message })) })
      : new AppError('INTERNAL_ERROR', 500, 'An unexpected error occurred.');
    request.log.error({ err: error, request_id: request.requestId, code: appError.code }, 'Request failed');
    return reply.status(appError.statusCode).send({ error: { code: appError.code, message: appError.message, details: appError.details }, request_id: request.requestId });
  });
  app.setNotFoundHandler((request, reply) => reply.status(404).send({
    error: { code: 'NOT_FOUND', message: 'Resource does not exist.', details: {} },
    request_id: request.requestId,
  }));
}, { name: 'error-handler' });
