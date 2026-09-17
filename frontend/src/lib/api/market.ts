import { mockGetMarketState, mockGetMarketData } from '../../mocks/market';
import type { MarketState, MarketDataResponse, Timeframe } from '../../contracts/v1/market';

export async function getMarketState(symbol: string = 'NIFTY 50'): Promise<MarketState> {
  return mockGetMarketState(symbol);
}

export async function getMarketData(symbol: string, timeframe: Timeframe): Promise<MarketDataResponse> {
  return mockGetMarketData(symbol, timeframe);
}
