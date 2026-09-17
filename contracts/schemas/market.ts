/**
 * Market schemas for Warangal Trading Ring API
 * STATUS: DRAFT — v1
 */

import type { DecimalString, ISOTimestamp } from './common';

// ---------------------------------------------------------------------------
// Market Status
// ---------------------------------------------------------------------------
export type MarketStatus = 'PRE_OPEN' | 'OPEN' | 'PAUSED' | 'HALTED' | 'CLOSED';

export interface MarketStatusResponse {
  status: MarketStatus;
  server_time: ISOTimestamp;
  next_change_at: ISOTimestamp | null;
  message: string | null;
  /** Current event lifecycle status. */
  event_status: string;                           // EventStatus — import from simulation.ts
  /** Current simulation day. Null during SETUP/READY. */
  simulation_day: number | null;
  /** Total configured event days. Null during SETUP/READY. */
  configured_total_simulation_days: number | null;
  /** Current simulation time HH:MM:SS. Null during SETUP/READY or before first interval. */
  simulation_time: string | null;
}

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------
export type InstrumentType = 'EQUITY' | 'INDEX' | 'FUTURES' | 'OPTIONS';
export type InstrumentStatus = 'ACTIVE' | 'SUSPENDED' | 'DELISTED';

export interface Instrument {
  symbol: string;
  name: string;
  instrument_type: InstrumentType;
  exchange: string;
  status: InstrumentStatus;
  tick_size: DecimalString;
  lot_size: number;          // Positive integer
}

// ---------------------------------------------------------------------------
// Quote
// ---------------------------------------------------------------------------
export interface Quote {
  symbol: string;
  /** CLOSE of last fully committed 10-second simulation interval. */
  last_price: DecimalString;
  open_price: DecimalString | null;
  high_price: DecimalString | null;
  low_price: DecimalString | null;
  close_price: DecimalString | null;
  change: DecimalString | null;
  change_percent: DecimalString | null;
  volume: number;
  timestamp: ISOTimestamp;
  // bid_price and ask_price are NOT in V1. This platform has no order book.
}

// ---------------------------------------------------------------------------
// Candles
// ---------------------------------------------------------------------------
/**
 * Canonical simulation interval: 10s (one row from the master dataset).
 * All higher timeframes are derived deterministically from 10s aggregation.
 */
export type CandleTimeframe = '10s' | '1m' | '5m' | '15m' | '1H' | '1D';

export interface Candle {
  timestamp: ISOTimestamp;  // Start of candle interval
  open: DecimalString;
  high: DecimalString;
  low: DecimalString;
  close: DecimalString;
  volume: number;
  is_complete: boolean;     // false = current live candle; true = closed interval
}

export interface CandleQueryParams {
  timeframe: CandleTimeframe;
  from?: ISOTimestamp;
  to?: ISOTimestamp;
  limit?: number;           // Default 100, max 500
}

export interface CandleResponse {
  symbol: string;
  timeframe: CandleTimeframe;
  candles: Candle[];        // Ordered ascending by timestamp
}
