/**
 * Portfolio schemas for Warangal Trading Ring API
 * STATUS: DRAFT — v1
 */

import type { DecimalString, ISOTimestamp } from './common';

// ---------------------------------------------------------------------------
// Balance sub-object
// ---------------------------------------------------------------------------
export interface Balance {
  available_cash: DecimalString;  // Cash available for new orders
  reserved_cash: DecimalString;   // Cash locked against pending BUY orders
  total_cash: DecimalString;      // available_cash + reserved_cash
}

// ---------------------------------------------------------------------------
// Invested value sub-object
// ---------------------------------------------------------------------------
export interface InvestedValue {
  cost_basis: DecimalString;    // Sum of (quantity × average_entry_price) across all open positions, regardless of side
  market_value: DecimalString;  // Sum of (quantity × current_price) across all open positions, regardless of side
}

// ---------------------------------------------------------------------------
// P&L sub-object
// ---------------------------------------------------------------------------
export interface PnL {
  /**
   * Aggregate directional unrealized P&L across all open positions.
   * LONG positions: gain when price rises. SHORT positions: gain when price falls.
   * Computed server-side. Frontend must display, not recompute.
   * NOTE: See OD-SHORT-01 in portfolio.md — exact computation for mixed LONG/SHORT portfolios is unresolved.
   */
  unrealized_pnl: DecimalString;   // Directional aggregate unrealized gain/loss
  realized_pnl: DecimalString;     // Locked-in from all exited positions
  total_pnl: DecimalString;        // unrealized_pnl + realized_pnl
  daily_pnl: DecimalString;        // P&L since session open
  return_percent: DecimalString;   // (total_pnl / starting_capital) × 100
}

// ---------------------------------------------------------------------------
// GET /api/v1/portfolio — full portfolio response
// ---------------------------------------------------------------------------
export interface Portfolio {
  participant_id: string;
  balance: Balance;
  invested: InvestedValue;
  portfolio_value: DecimalString;  // total_cash + market_value
  pnl: PnL;
  updated_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// GET /api/v1/portfolio/balance
// ---------------------------------------------------------------------------
export interface BalanceResponse extends Balance {
  updated_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// GET /api/v1/portfolio/pnl
// ---------------------------------------------------------------------------
export interface PnLResponse extends PnL {
  updated_at: ISOTimestamp;
}
