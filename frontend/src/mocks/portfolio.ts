import type { PortfolioSummary } from '../contracts/v1/portfolio';

export async function mockGetPortfolioSummary(): Promise<PortfolioSummary> {
  await delay(400);
  return {
    totalPnl: 24560,
    totalPnlPct: 12.45,
    realizedPnl: 14200,
    unrealizedPnl: 10360,
    todayPnl: 4210,
    currentBalance: 224560,
    availableCash: 124560,
    investedValue: 100000,
    portfolioValue: 224560,
    totalReturn: 12.45,
    winRate: 62,
    totalTrades: 24,
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
