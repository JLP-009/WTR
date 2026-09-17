/**
 * Position schemas for Warangal Trading Ring API
 * STATUS: DRAFT — v1
 *
 * V1 POSITION MODEL:
 * - LONG and SHORT positions are both supported.
 * - A participant holds ONE net position per symbol at any time.
 * - No simultaneous LONG + SHORT hedge for the same symbol.
 * - quantity is always a positive integer (absolute size). Side carries direction.
 * - Negative quantity is FORBIDDEN. Use side: "SHORT" to indicate short direction.
 */

import type { DecimalString, ISOTimestamp } from './common';

// ---------------------------------------------------------------------------
// Position side
// ---------------------------------------------------------------------------
/**
 * LONG: participant is long (bought in, benefits from price rise)
 * SHORT: participant is short (sold in, benefits from price fall)
 *
 * NOTE: OrderSide (BUY | SELL) and PositionSide (LONG | SHORT) are distinct.
 * BUY does not always result in LONG. SELL does not always result in SHORT.
 * See positions.md §1.2 for the full mapping.
 */
export type PositionSide = 'LONG' | 'SHORT';

// ---------------------------------------------------------------------------
// Position object
// ---------------------------------------------------------------------------
export interface Position {
  symbol: string;

  /** Direction of the net position. */
  side: PositionSide;

  /**
   * Absolute size of the position.
   * Always a positive integer (≥ 0). NEVER negative.
   * 0 only when include_zero=true and the position has been fully closed.
   */
  quantity: number;

  /**
   * Volume-weighted average price at which the current position was entered.
   * Named average_entry_price (not average_buy_price) to be correct for both LONG and SHORT.
   * For LONG: average price of BUY executions that built this position.
   * For SHORT: average price of SELL executions that built this position.
   */
  average_entry_price: DecimalString;

  /** Last market price used to compute unrealized P&L. */
  current_price: DecimalString;

  /** quantity × current_price — always positive regardless of side. */
  market_value: DecimalString;

  /** quantity × average_entry_price — always positive regardless of side. */
  cost_basis: DecimalString;

  /**
   * Directional unrealized gain/loss.
   *
   * LONG:  unrealized_pnl = (current_price - average_entry_price) × quantity
   * SHORT: unrealized_pnl = (average_entry_price - current_price) × quantity
   *
   * Positive = profit. Negative = loss.
   * Computed server-side. Frontend must display, not recompute.
   */
  unrealized_pnl: DecimalString;

  /** (unrealized_pnl / cost_basis) × 100 */
  unrealized_pnl_percent: DecimalString;

  /**
   * Locked-in P&L from closed portions of this position.
   * Per-symbol scope — accumulates across the competition.
   */
  realized_pnl: DecimalString;

  updated_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// GET /api/v1/positions — query params
// ---------------------------------------------------------------------------
export interface ListPositionsParams {
  /** Default: false. When true, includes fully-exited positions with quantity=0. */
  include_zero?: boolean;
}
