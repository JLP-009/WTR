// FRONTEND/API CONTRACT DRAFT — v1

export type OrderSide = 'BUY' | 'SELL' | 'CLOSE';

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

export interface TradeHistoryItem {
  order_id: string;
  client_order_id?: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'CLOSE';
  quantity: number;
  filled_quantity: number;
  status: string;
  average_price: string | null;
  created_at: string;
  updated_at?: string;
}
