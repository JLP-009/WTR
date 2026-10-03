import type { FastifyPluginAsync } from 'fastify';
import { MarketService } from './market.service.js';

export const marketRoutes: FastifyPluginAsync = async (app) => {
  const marketService = new MarketService(app.db);

  app.get('/status', async (request) => {
    const data = await marketService.getMarketStatus();
    return { data, request_id: request.requestId };
  });

  app.get('/instruments', { preHandler: [app.optionalAuthenticate] }, async (request) => {
    const data = await marketService.getInstruments();
    return { data, request_id: request.requestId };
  });

  app.get('/instruments/:symbol', { preHandler: [app.optionalAuthenticate] }, async (request) => {
    const { symbol } = request.params as { symbol: string };
    const data = await marketService.getInstrument(symbol);
    return { data, request_id: request.requestId };
  });

  app.get('/quote/:symbol', { preHandler: [app.optionalAuthenticate] }, async (request) => {
    const { symbol } = request.params as { symbol: string };
    const data = await marketService.getLatestQuote(symbol);
    return { data, request_id: request.requestId };
  });

  app.get('/candles/:symbol', { preHandler: [app.optionalAuthenticate] }, async (request) => {
    const { symbol } = request.params as { symbol: string };
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 200;
    const data = await marketService.getCandles(symbol, limit);
    return { data, request_id: request.requestId };
  });
};
