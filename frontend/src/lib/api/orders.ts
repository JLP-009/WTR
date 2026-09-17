import type { OrderRequest, OrderResponse } from '../../contracts/v1/orders';

export async function submitOrder(req: OrderRequest): Promise<OrderResponse> {
  await new Promise((r) => setTimeout(r, 600));
  return {
    orderId: 'mock-' + Date.now(),
    status: 'ACCEPTED',
    message: `Order accepted: ${req.side} ${req.quantity} ${req.symbol}`,
    executedPrice: 0,
  };
}
