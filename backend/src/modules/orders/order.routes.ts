import type { FastifyPluginAsync } from 'fastify';
import { submitOrderSchema } from './order.types.js';
import { OrderService } from './order.service.js';

export const orderRoutes: FastifyPluginAsync = async (app) => {
  const orderService = new OrderService(app.db);

  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parsed = submitOrderSchema.parse(request.body);
    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
    const data = await orderService.submitOrder(request.user!.userId, parsed, idempotencyKey);
    
    // Broadcast order update to the specific user for instant UI feedback
    app.wsGateway.sendToUser(request.user!.userId, 'orders', [data]);

    return reply.status(201).send({ data, request_id: request.requestId });
  });

  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const query = request.query as { limit?: string };
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const data = await orderService.getOrders(request.user!.userId, limit);
    return { data, request_id: request.requestId };
  });

  app.get('/:order_id', { preHandler: [app.authenticate] }, async (request) => {
    const { order_id } = request.params as { order_id: string };
    const data = await orderService.getOrderById(request.user!.userId, order_id);
    return { data, request_id: request.requestId };
  });

  app.post('/:order_id/cancel', { preHandler: [app.authenticate] }, async (request) => {
    const { order_id } = request.params as { order_id: string };
    await orderService.cancelOrder(request.user!.userId, order_id);
    return { data: { success: true }, request_id: request.requestId };
  });
};
