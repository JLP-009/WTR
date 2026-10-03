import type { FastifyPluginAsync } from 'fastify';
import { PortfolioService } from './portfolio.service.js';

export const portfolioRoutes: FastifyPluginAsync = async (app) => {
  const portfolioService = new PortfolioService(app.db);

  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const data = await portfolioService.getPortfolioSummary(request.user!.userId);
    return { data, request_id: request.requestId };
  });

  app.get('/balance', { preHandler: [app.authenticate] }, async (request) => {
    const summary = await portfolioService.getPortfolioSummary(request.user!.userId);
    return {
      data: {
        cash: summary.cash,
        available_cash: summary.available_cash,
        reserved_cash: summary.reserved_cash,
        invested_amount: summary.invested_amount,
        market_value: summary.market_value,
        equity: summary.equity,
        buying_power: summary.buying_power,
      },
      request_id: request.requestId,
    };
  });

  app.get('/pnl', { preHandler: [app.authenticate] }, async (request) => {
    const summary = await portfolioService.getPortfolioSummary(request.user!.userId);
    return {
      data: {
        realized_pnl: summary.realized_pnl,
        unrealized_pnl: summary.unrealized_pnl,
        daily_pnl: summary.daily_pnl,
        total_pnl: summary.total_pnl,
      },
      request_id: request.requestId,
    };
  });
};
