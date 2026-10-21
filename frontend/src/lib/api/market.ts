import { api } from './client';
import { mockGetMarketState, mockGetMarketData } from '../../mocks/market';
import type { MarketState, MarketDataResponse, Timeframe, Candle } from '../../contracts/v1/market';

interface BackendQuoteResponse {
  symbol: string;
  last_price: string;
  open_price: string | null;
  high_price: string | null;
  low_price: string | null;
  close_price: string | null;
  change: string | null;
  change_percent: string | null;
  volume: number;
  timestamp: string;
}

interface BackendCandleResponse {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
  interval_index: number;
  trading_day: number;
}

export async function getMarketState(symbol: string = 'NIFTY_50'): Promise<MarketState> {
  const cleanSymbol = symbol.replace(/\s+/g, '_').toUpperCase();
  try {
    const quote = await api.get<BackendQuoteResponse>(`/market/quote/${cleanSymbol}`);
    return {
      status: 'LIVE',
      symbol: quote.symbol,
      ltp: parseFloat(quote.last_price || '0'),
      change: parseFloat(quote.change || '0'),
      changePct: parseFloat(quote.change_percent || '0'),
    };
  } catch (err) {
    console.error(`[Market] Failed to fetch quote for ${cleanSymbol}:`, err);
    throw err;
  }
}

export async function getMarketData(symbol: string = 'NIFTY_50', timeframe: Timeframe = '1m'): Promise<MarketDataResponse> {
  const cleanSymbol = symbol.replace(/\s+/g, '_').toUpperCase();
  try {
    const candles = await api.get<BackendCandleResponse[]>(`/market/candles/${cleanSymbol}`);
    const mappedCandles: Candle[] = candles.map((c) => ({
      time: Math.floor(new Date(c.timestamp).getTime() / 1000),
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: c.volume,
    }));

    return {
      symbol: cleanSymbol,
      timeframe,
      candles: mappedCandles,
    };
  } catch (err) {
    console.error(`[Market] Failed to fetch candles for ${cleanSymbol}:`, err);
    throw err;
  }
}

export interface MarketStatusResponse {
  status: string;
  server_time: string;
  next_change_at: string | null;
  message: string | null;
  event_status: string;
  simulation_day: number | null;
  configured_total_simulation_days: number | null;
  simulation_time: string | null;
}

export async function getMarketStatus(): Promise<MarketStatusResponse> {
  try {
    return await api.get<MarketStatusResponse>('/market/status');
  } catch {
    return {
      status: 'CLOSED',
      server_time: new Date().toISOString(),
      next_change_at: null,
      message: null,
      event_status: 'RUNNING',
      simulation_day: 1,
      configured_total_simulation_days: 20,
      simulation_time: '09:15:00',
    };
  }
}
