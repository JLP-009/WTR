import Fastify, { type FastifyInstance } from 'fastify';
import type { Environment } from './config/env.js';
import { createDatabase } from './db/client.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { requestIdPlugin } from './plugins/request-id.js';
import { securityPlugin } from './plugins/security.js';
import { authPlugin } from './plugins/auth.js';
import { websocketPlugin } from './plugins/websocket.js';
import { routes } from './routes.js';

export async function buildApp(env: Environment): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: env.LOG_LEVEL }, bodyLimit: 1_048_576, disableRequestLogging: true });
  
  const db = createDatabase(env);
  app.decorate('db', db);

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body: string, done) => {
    if (!body || (typeof body === 'string' && body.trim() === '')) {
      done(null, {});
      return;
    }
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (err: any) {
      done(err, undefined);
    }
  });

  await app.register(requestIdPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(securityPlugin(env));
  await app.register(authPlugin, { db, env });
  await app.register(websocketPlugin, { db, env });
  await app.register(routes);

  return app;
}
