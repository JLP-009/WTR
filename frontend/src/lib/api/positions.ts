import { api } from './client';
import { v4 as uuidv4 } from '../../utils/uuid';
import { mockGetPositions, mockClosePosition } from '../../mocks/positions';
import type { Position, ClosePositionRequest, ClosePositionResponse } from '../../contracts/v1/positions';

interface BackendPosition {
  symbol: string;
  instrument_name: string;
  side: 'LONG' | 'SHORT' | null;
  quantity: number;
  average_entry_price: string | null;
  current_price: string;
  market_value: string;
  unrealized_pnl: string;
  unrealized_pnl_percent: string;
  realized_pnl: string;
}

export async function getPositions(): Promise<Position[]> {
  try {
    const data = await api.get<BackendPosition[]>('/positions');
    return data.map((p) => ({
      id: p.symbol,
      symbol: p.symbol,
      side: (p.side || 'LONG') as 'LONG' | 'SHORT',
      quantity: p.quantity,
      avgPrice: p.average_entry_price ? parseFloat(p.average_entry_price) : 0,
      ltp: parseFloat(p.current_price || '0'),
      pnl: parseFloat(p.unrealized_pnl || '0'),
      pnlPct: parseFloat(p.unrealized_pnl_percent || '0'),
    }));
  } catch {
    return [];
  }
}

export async function closePosition(req: ClosePositionRequest): Promise<ClosePositionResponse> {
  const clientOrderId = `cli_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  try {
    await api.post('/orders', {
      client_order_id: clientOrderId,
      symbol: req.positionId.replace(/\s+/g, '').toUpperCase(),
      side: 'CLOSE',
      order_type: 'MARKET',
    });

    return {
      success: true,
      message: `Position for ${req.positionId} closed successfully.`,
    };
  } catch (err: any) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return mockClosePosition(req);
    }
    return {
      success: false,
      message: err.message || 'Failed to close position.',
    };
  }
}
