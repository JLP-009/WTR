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

export async function getMarketState(symbol: string = 'NIFTY'): Promise<MarketState> {
  const cleanSymbol = symbol.replace(/\s+/g, '').toUpperCase();
  try {
    const quote = await api.get<BackendQuoteResponse>(`/market/quote/${cleanSymbol}`);
    return {
      status: 'LIVE',
      symbol: quote.symbol,
      ltp: parseFloat(quote.last_price || '0'),
      change: parseFloat(quote.change || '0'),
      changePct: parseFloat(quote.change_percent || '0'),
    };
  } catch {
    return {
      status: 'PAUSED',
      symbol: cleanSymbol,
      ltp: 0,
      change: 0,
      changePct: 0,
    };
  }
}

export async function getMarketData(symbol: string = 'NIFTY', timeframe: Timeframe = '1m'): Promise<MarketDataResponse> {
  const cleanSymbol = symbol.replace(/\s+/g, '').toUpperCase();
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
  } catch {
    return {
      symbol: cleanSymbol,
      timeframe,
      candles: [],
    };
  }
}
