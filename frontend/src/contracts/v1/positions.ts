// FRONTEND/API CONTRACT DRAFT — v1

export type PositionSide = 'LONG' | 'SHORT';

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  avgPrice: number;
  ltp: number;
  pnl: number;
  pnlPct: number;
}

export interface ClosePositionRequest {
  positionId: string;
}

export interface ClosePositionResponse {
  success: boolean;
  message: string;
}
