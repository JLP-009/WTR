/**
 * Leaderboard schemas for Warangal Trading Ring API
 * STATUS: DRAFT — v1
 */

import type { DecimalString, ISOTimestamp } from './common';

// ---------------------------------------------------------------------------
// Single leaderboard entry
// ---------------------------------------------------------------------------
export interface LeaderboardEntry {
  rank: number;                       // 1-indexed
  participant_id: string;             // Public identifier only
  display_name: string;
  portfolio_value: DecimalString;     // Primary ranking metric
  total_pnl: DecimalString;          // Absolute P&L
  return_percent: DecimalString;     // Return as % of starting capital
  updated_at: ISOTimestamp;          // When this entry was computed
}

// ---------------------------------------------------------------------------
// GET /api/v1/leaderboard — full board response
// ---------------------------------------------------------------------------
export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total_participants: number;
  /** Simulation day this snapshot represents. */
  simulation_day: number;
  as_of: ISOTimestamp;
  version: number;
}

// ---------------------------------------------------------------------------
// GET /api/v1/leaderboard/me — own rank response
// ---------------------------------------------------------------------------
export interface MyLeaderboardResponse extends LeaderboardEntry {
  total_participants: number;
  simulation_day: number;
  as_of: ISOTimestamp;
  version: number;
}

// ---------------------------------------------------------------------------
// GET /api/v1/leaderboard — query params (offset pagination)
// ---------------------------------------------------------------------------
export interface LeaderboardQueryParams {
  offset?: number;  // Default: 0
  limit?: number;   // Default: 50, max: 200
}
