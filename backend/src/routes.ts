import type { FastifyPluginAsync } from 'fastify';
import { authRoutes } from './modules/auth/auth.routes.js';
import { marketRoutes } from './modules/market/market.routes.js';
import { orderRoutes } from './modules/orders/order.routes.js';
import { portfolioRoutes } from './modules/portfolio/portfolio.routes.js';
import { positionsRoutes } from './modules/positions/positions.routes.js';
import { leaderboardRoutes } from './modules/leaderboard/leaderboard.routes.js';
import { newsRoutes } from './modules/news/news.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';

export const routes: FastifyPluginAsync = async (app) => {
  // Base Health
  app.get('/health', async (request) => ({ data: { status: 'ok' }, request_id: request.requestId }));

  // API v1 prefix routes
  await app.register(async (v1) => {
    await v1.register(authRoutes, { prefix: '/auth' });
    await v1.register(marketRoutes, { prefix: '/market' });
    await v1.register(orderRoutes, { prefix: '/orders' });
    await v1.register(portfolioRoutes, { prefix: '/portfolio' });
    await v1.register(positionsRoutes, { prefix: '/positions' });
    await v1.register(leaderboardRoutes, { prefix: '/leaderboard' });
    await v1.register(newsRoutes, { prefix: '/news' });
    await v1.register(adminRoutes, { prefix: '/admin' });
  }, { prefix: '/api/v1' });
};
