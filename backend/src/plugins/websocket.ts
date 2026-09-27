import fp from 'fastify-plugin';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocketGateway } from '../modules/websocket/websocket.gateway.js';
import { SimulationWorker } from '../modules/simulation/simulation.worker.js';
import type { Database } from '../db/client.js';
import type { Environment } from '../config/env.js';

export interface WebSocketPluginOptions {
  db: Database;
  env: Environment;
}

declare module 'fastify' {
  interface FastifyInstance {
    wsGateway: WebSocketGateway;
    simWorker: SimulationWorker;
  }
}

export const websocketPlugin = fp<WebSocketPluginOptions>(async (app, options) => {
  await app.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576,
    },
  });

  const wsGateway = new WebSocketGateway(app, options.env);
  const simWorker = new SimulationWorker(options.db, wsGateway, options.env);

  app.decorate('wsGateway', wsGateway);
  app.decorate('simWorker', simWorker);

  // Start simulation background worker
  simWorker.start();

  app.addHook('onClose', (_instance, done) => {
    simWorker.stop();
    done();
  });

  app.get('/api/v1/ws', { websocket: true }, (socket) => {
    wsGateway.handleConnection(socket);
  });
}, { name: 'websocket-plugin' });
