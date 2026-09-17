// FRONTEND/API CONTRACT DRAFT — v1

export type MarketStatus = 'LIVE' | 'CLOSED' | 'PRE_OPEN' | 'POST_CLOSE';

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '1D';

export interface MarketState {
  status: MarketStatus;
  symbol: string;
  ltp: number;
  change: number;
  changePct: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataResponse {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
}
