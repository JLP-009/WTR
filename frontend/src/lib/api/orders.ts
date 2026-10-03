import { api } from './client';
import { v4 as uuidv4 } from '../../utils/uuid';
import type { OrderRequest, OrderResponse } from '../../contracts/v1/orders';

interface BackendOrderSubmitResponse {
  order_id: string;
  client_order_id: string;
  symbol: string;
  side: string;
  quantity: number;
  filled_quantity: number;
  status: string;
  average_price: string | null;
}

export async function submitOrder(req: OrderRequest): Promise<OrderResponse> {
  const clientOrderId = `cli_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  try {
    const data = await api.post<BackendOrderSubmitResponse>('/orders', {
      client_order_id: clientOrderId,
      symbol: req.symbol.replace(/\s+/g, '').toUpperCase(),
      side: req.side,
      quantity: req.quantity,
      order_type: 'MARKET',
    });

    return {
      orderId: data.order_id,
      status: 'ACCEPTED',
      message: `Order executed: ${data.side} ${data.quantity} ${data.symbol}`,
      executedPrice: data.average_price ? parseFloat(data.average_price) : undefined,
    };
  } catch (err: any) {
    return {
      orderId: '',
      status: 'REJECTED',
      message: err.message || 'Order execution failed.',
    };
  }
}
