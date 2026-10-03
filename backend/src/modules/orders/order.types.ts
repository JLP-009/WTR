import { z } from 'zod';

export const submitOrderSchema = z.object({
  client_order_id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  symbol: z.string().min(1).max(32),
  side: z.enum(['BUY', 'SELL', 'CLOSE']),
  quantity: z.number().int().positive().optional().nullable(),
  order_type: z.literal('MARKET').default('MARKET'),
});

export type SubmitOrderRequest = z.infer<typeof submitOrderSchema>;

export interface ExecutionResponse {
  execution_id: string;
  quantity: number;
  price: string;
  executed_at: string;
}

export interface OrderResponse {
  order_id: string;
  client_order_id: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'CLOSE';
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  order_type: string;
  status: string;
  average_price: string | null;
  executions?: ExecutionResponse[];
  created_at: string;
  updated_at: string;
}
