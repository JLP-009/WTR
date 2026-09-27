import type { MarketState, MarketDataResponse, Timeframe } from '../contracts/v1/market';

export const TRADABLE_SYMBOLS = [
  'NIFTY',
  'BANKNIFTY',
  'RELIANCE',
  'TCS',
  'INFY',
  'HDFCBANK',
  'ICICIBANK',
  'SBIN',
  'BHARTIARTL',
  'AXISBANK',
  'ITC',
  'LT',
];

const SYMBOL_BASE: Record<string, number> = {
  NIFTY: 24600,
  BANKNIFTY: 52800,
  RELIANCE: 1403,
  TCS: 3380,
  INFY: 1560,
  HDFCBANK: 1715,
  ICICIBANK: 1285,
  SBIN: 842,
  BHARTIARTL: 1650,
  AXISBANK: 1180,
  ITC: 468,
  LT: 3620,
};

const SYMBOL_CHANGE: Record<string, { change: number; pct: number }> = {
  NIFTY: { change: 128.4, pct: 0.52 },
  BANKNIFTY: { change: -214.5, pct: -0.41 },
  RELIANCE: { change: 17.4, pct: 1.24 },
  TCS: { change: -22.1, pct: -0.65 },
  INFY: { change: 12.8, pct: 0.82 },
  HDFCBANK: { change: -8.5, pct: -0.5 },
  ICICIBANK: { change: 14.2, pct: 1.1 },
  SBIN: { change: -5.3, pct: -0.63 },
  BHARTIARTL: { change: 12.5, pct: 0.76 },
  AXISBANK: { change: -4.2, pct: -0.35 },
  ITC: { change: 3.1, pct: 0.66 },
  LT: { change: 25.0, pct: 0.69 },
};

export async function mockGetMarketState(symbol: string = 'NIFTY 50'): Promise<MarketState> {
  await delay(200);
  const base = SYMBOL_BASE[symbol] ?? 1000;
  const { change, pct } = SYMBOL_CHANGE[symbol] ?? { change: 0, pct: 0 };
  return {
    status: 'LIVE',
    symbol,
    ltp: base + change,
    change,
    changePct: pct,
  };
}

export async function mockGetMarketData(
  symbol: string,
  timeframe: Timeframe,
): Promise<MarketDataResponse> {
  await delay(300);
  const base = SYMBOL_BASE[symbol] ?? 1000;
  const volatility = base * 0.003;
  const candles = generateCandles(base, 80, volatility);
  return { symbol, timeframe, candles };
}

function generateCandles(base: number, count: number, volatility: number) {
  let price = base;
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }, (_, i) => {
    const open = price;
    const change = (Math.random() - 0.48) * volatility * 2;
    const close = Math.max(open + change, base * 0.9);
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    price = close;
    return {
      time: now - (count - i) * 60,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.floor(Math.random() * 60000 + 8000),
    };
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
