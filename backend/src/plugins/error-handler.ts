import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../common/errors/app-error.js';

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    console.error('FASTIFY SERVER ERROR:', error);
    const isValidationError = error instanceof ZodError || (error as any)?.validation;
    const zodFirstMessage = error instanceof ZodError && error.issues[0]?.message ? error.issues[0].message : 'Request validation failed.';
    const appError = error instanceof AppError
      ? error
      : isValidationError
      ? new AppError('VALIDATION_ERROR', 400, zodFirstMessage, { fields: error instanceof ZodError ? error.issues.map((issue) => ({ field: issue.path.join('.'), reason: issue.message })) : [] })
      : new AppError('INTERNAL_ERROR', 500, 'Service temporarily unavailable. Please try again.');
    request.log.error({ err: error, request_id: request.requestId, code: appError.code }, 'Request failed');
    return reply.status(appError.statusCode).send({ error: { code: appError.code, message: appError.message, details: appError.details }, request_id: request.requestId });
  });
  app.setNotFoundHandler((request, reply) => reply.status(404).send({
    error: { code: 'NOT_FOUND', message: 'Resource does not exist.', details: {} },
    request_id: request.requestId,
  }));
}, { name: 'error-handler' });
