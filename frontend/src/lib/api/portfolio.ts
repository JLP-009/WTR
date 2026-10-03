import { api } from './client';
import { mockGetPortfolioSummary } from '../../mocks/portfolio';
import type { PortfolioSummary } from '../../contracts/v1/portfolio';

interface BackendPortfolio {
  cash: string;
  available_cash: string;
  reserved_cash: string;
  invested_amount: string;
  market_value: string;
  equity: string;
  buying_power: string;
  realized_pnl: string;
  unrealized_pnl: string;
  daily_pnl: string;
  total_pnl: string;
}

export function normalizePortfolioSummary(data: any): PortfolioSummary {
  if (!data) {
    return {
      totalPnl: 0,
      totalPnlPct: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      todayPnl: 0,
      currentBalance: 1000000,
      availableCash: 1000000,
      investedValue: 0,
      portfolioValue: 1000000,
      totalReturn: 0,
      winRate: 0,
      totalTrades: 0,
    };
  }

  const totalPnl = typeof data.totalPnl === 'number'
    ? data.totalPnl
    : parseFloat(data.total_pnl ?? data.totalPnl ?? '0');

  const portfolioValue = typeof data.portfolioValue === 'number'
    ? data.portfolioValue
    : parseFloat(data.equity ?? data.portfolioValue ?? '1000000');

  const rawTotalPnlPct = typeof data.totalPnlPct === 'number'
    ? data.totalPnlPct
    : (portfolioValue > 0 ? (totalPnl / (portfolioValue - totalPnl)) * 100 : 0);

  const totalPnlPct = isNaN(rawTotalPnlPct) ? 0 : parseFloat(rawTotalPnlPct.toFixed(2));

  const realizedPnl = typeof data.realizedPnl === 'number'
    ? data.realizedPnl
    : parseFloat(data.realized_pnl ?? data.realizedPnl ?? '0');

  const unrealizedPnl = typeof data.unrealizedPnl === 'number'
    ? data.unrealizedPnl
    : parseFloat(data.unrealized_pnl ?? data.unrealizedPnl ?? '0');

  const todayPnl = typeof data.todayPnl === 'number'
    ? data.todayPnl
    : parseFloat(data.daily_pnl ?? data.todayPnl ?? '0');

  const currentBalance = typeof data.currentBalance === 'number'
    ? data.currentBalance
    : parseFloat(data.cash ?? data.available_cash ?? data.currentBalance ?? '1000000');

  const availableCash = typeof data.availableCash === 'number'
    ? data.availableCash
    : parseFloat(data.available_cash ?? data.availableCash ?? '1000000');

  const investedValue = typeof data.investedValue === 'number'
    ? data.investedValue
    : parseFloat(data.invested_amount ?? data.investedValue ?? '0');

  return {
    totalPnl: isNaN(totalPnl) ? 0 : totalPnl,
    totalPnlPct: isNaN(totalPnlPct) ? 0 : totalPnlPct,
    realizedPnl: isNaN(realizedPnl) ? 0 : realizedPnl,
    unrealizedPnl: isNaN(unrealizedPnl) ? 0 : unrealizedPnl,
    todayPnl: isNaN(todayPnl) ? 0 : todayPnl,
    currentBalance: isNaN(currentBalance) ? 1000000 : currentBalance,
    availableCash: isNaN(availableCash) ? 1000000 : availableCash,
    investedValue: isNaN(investedValue) ? 0 : investedValue,
    portfolioValue: isNaN(portfolioValue) ? 1000000 : portfolioValue,
    totalReturn: isNaN(totalPnlPct) ? 0 : totalPnlPct,
    winRate: typeof data.winRate === 'number' ? data.winRate : (totalPnl > 0 ? 66.7 : 0),
    totalTrades: typeof data.totalTrades === 'number' ? data.totalTrades : 0,
  };
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  try {
    const data = await api.get<BackendPortfolio>('/portfolio');
    return normalizePortfolioSummary(data);
  } catch (err) {
    console.error('[Portfolio] Failed to fetch portfolio summary:', err);
    throw err;
  }
}
