import Fastify, { type FastifyInstance } from 'fastify';
import type { Environment } from './config/env.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { requestIdPlugin } from './plugins/request-id.js';
import { securityPlugin } from './plugins/security.js';
import { routes } from './routes.js';

export async function buildApp(env: Environment): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: env.LOG_LEVEL }, bodyLimit: 1_048_576, disableRequestLogging: true });
  await app.register(requestIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(securityPlugin(env));
  await app.register(routes);
  return app;
}
