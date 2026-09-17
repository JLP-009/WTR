// FRONTEND/API CONTRACT DRAFT — v1

export interface PortfolioSummary {
  totalPnl: number;
  totalPnlPct: number;
  realizedPnl: number;
  unrealizedPnl: number;
  todayPnl: number;
  currentBalance: number;
  availableCash: number;
  investedValue: number;
  portfolioValue: number;
  totalReturn: number;
  winRate: number;
  totalTrades: number;
}
