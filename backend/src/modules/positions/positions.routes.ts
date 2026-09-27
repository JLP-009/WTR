import type { FastifyPluginAsync } from 'fastify';
import { PortfolioService } from '../portfolio/portfolio.service.js';
import { AppError } from '../../common/errors/app-error.js';

export const positionsRoutes: FastifyPluginAsync = async (app) => {
  const portfolioService = new PortfolioService(app.db);

  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const data = await portfolioService.getPositions(request.user!.userId);
    return { data, request_id: request.requestId };
  });

  app.get('/:symbol', { preHandler: [app.authenticate] }, async (request) => {
    const { symbol } = request.params as { symbol: string };
    const positions = await portfolioService.getPositions(request.user!.userId);
    const pos = positions.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
    if (!pos) {
      throw new AppError('NOT_FOUND', 404, `No position found for symbol '${symbol}'.`);
    }
    return { data: pos, request_id: request.requestId };
  });
};
