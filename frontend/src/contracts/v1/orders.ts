// FRONTEND/API CONTRACT DRAFT — v1

export type OrderSide = 'BUY' | 'SELL';

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;
}

export interface OrderResponse {
  orderId: string;
  status: 'ACCEPTED' | 'REJECTED';
  message: string;
  executedPrice?: number;
}
