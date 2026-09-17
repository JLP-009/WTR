/**
 * Simulation, Event, and Admin schemas for Warangal Trading Ring API
 * STATUS: DRAFT — v1
 */

import type { DecimalString, ISOTimestamp } from './common';

// ---------------------------------------------------------------------------
// Lifecycle state enums
// ---------------------------------------------------------------------------

export type EventStatus = 'SETUP' | 'READY' | 'RUNNING' | 'PAUSED' | 'ENDED';

export type SimulationStatus = 'STOPPED' | 'RUNNING' | 'PAUSED' | 'DAY_CLOSED';

export type DayStatus = 'PRE_OPEN' | 'OPEN' | 'CLOSING' | 'CLOSED';

export type MarketStatus = 'PRE_OPEN' | 'OPEN' | 'PAUSED' | 'HALTED' | 'CLOSED';

// ---------------------------------------------------------------------------
// Simulation cursor
// ---------------------------------------------------------------------------

export interface SimulationCursor {
  dataset_id: string;
  dataset_version: string;
  simulation_day: number;
  /** 0-based interval index. Interval 0 = 09:15:00, interval 71 = 09:26:50. */
  interval_index: number;
  /** Simulation time string in HH:MM:SS format, e.g. "09:20:10" */
  simulated_time: string;
  committed_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// Complete system state (used in Admin responses and WebSocket system.status)
// ---------------------------------------------------------------------------

export interface SystemState {
  event_id: string;
  event_status: EventStatus;
  simulation_status: SimulationStatus;
  day_status: DayStatus;
  market_status: MarketStatus;
  simulation_day: number;
  configured_total_simulation_days: number;
  days_remaining: number;
  simulation_time: string;               // HH:MM:SS in simulation timezone
  cursor: SimulationCursor | null;
  /** Per-symbol last committed close price. Key = symbol string. */
  last_committed_close_by_symbol: Record<string, DecimalString>;
  updated_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// Dataset metadata
// ---------------------------------------------------------------------------

export type DatasetValidationStatus = 'PENDING' | 'VALID' | 'INVALID' | 'WARNING';

export interface DatasetMetadata {
  dataset_id: string;
  dataset_version: string;
  dataset_name: string;
  source_type: 'CSV';
  dataset_checksum: string;
  total_dataset_days: number;
  dataset_symbol_count: number;
  dataset_symbols: string[];
  simulated_day_duration_minutes: number;   // 12
  simulated_day_duration_seconds: number;   // 720
  data_interval_seconds: number;            // 10
  intervals_per_day: number;                // 72
  timezone: string;                         // e.g. "Asia/Kolkata"
  total_rows: number;
  first_simulation_day: number;
  last_simulation_day: number;
  validation_status: DatasetValidationStatus;
  validation_errors: string[];
  validation_warnings: string[];
  immutable: boolean;
  locked: boolean;
  created_at: ISOTimestamp;
  loaded_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// Event configuration
// ---------------------------------------------------------------------------

export interface EventConfig {
  dataset_id: string;
  dataset_total_days: number;
  dataset_symbol_count: number;
  configured_total_simulation_days: number;
  event_symbol_count: number;
  event_symbols: string[];
  data_interval_seconds: number;            // 10 — fixed
  simulated_day_duration_minutes: number;   // 12 — fixed
  simulated_day_duration_seconds: number;   // 720 — fixed
  intervals_per_day: number;               // 72 — fixed
  /**
   * V1 default: 1.0 (1 real second per 10-simulated-second interval).
   * One simulation day = 72 real seconds at default speed.
   * real_seconds_per_interval = 1.0 / simulation_speed.
   * Immutable after event START.
   */
  simulation_speed: number;
  rows_per_day: number;                    // event_symbol_count × 72
  expected_total_event_rows: number;       // total_simulation_days × event_symbol_count × 72
  config_locked: boolean;
  dataset_checksum: string;
  dataset_validation_status: DatasetValidationStatus;
}

export interface SetEventConfigRequest {
  dataset_id: string;
  total_simulation_days: number;
  symbols: string[];
  /** Default: 1.0. Optional override. Immutable after START. */
  simulation_speed?: number;
}

// ---------------------------------------------------------------------------
// Admin: simulation monitoring state
// ---------------------------------------------------------------------------

export interface SimulationState {
  simulation_status: SimulationStatus;
  simulation_day: number;
  simulation_time: string;
  interval_index: number;
  next_interval: string | null;            // HH:MM:SS of next interval; null if day complete
  intervals_remaining_today: number;
  simulation_speed: number;
  /** = 1.0 / simulation_speed. At default speed (1.0), this is 1.0 real second per interval. */
  real_seconds_per_interval: number;
  cursor: SimulationCursor | null;
  last_commit_at: ISOTimestamp | null;
}

// ---------------------------------------------------------------------------
// Admin lifecycle error codes (complement to common.ts ErrorCode)
// ---------------------------------------------------------------------------
export type AdminErrorCode =
  | 'EVENT_NOT_READY'
  | 'EVENT_ALREADY_STARTED'
  | 'EVENT_ALREADY_ENDED'
  | 'EVENT_CONFIGURATION_LOCKED'
  | 'EVENT_CONFIGURATION_INCOMPLETE'
  | 'SIMULATION_ALREADY_RUNNING'
  | 'SIMULATION_NOT_RUNNING'
  | 'DAY_NOT_CLOSED'
  | 'DAY_ALREADY_CLOSED'
  | 'NO_NEXT_DAY'
  | 'MARKET_ALREADY_OPEN'
  | 'MARKET_ALREADY_HALTED'
  | 'INVALID_STATE_TRANSITION'
  | 'DATASET_NOT_READY'
  | 'DATASET_INVALID';

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

export type NewsType = 'INFO' | 'WARNING' | 'CRITICAL' | 'MARKET_UPDATE' | 'EVENT_UPDATE';
export type NewsAudience = 'ALL_PARTICIPANTS';  // V1 only

export interface NewsItem {
  news_id: string;
  type: NewsType;
  title: string;
  body: string;
  audience: NewsAudience;
  created_by: string;                      // Admin actor ID
  created_at: ISOTimestamp;
}

export interface CreateNewsRequest {
  type: NewsType;
  title: string;                           // Max 200 chars
  body: string;                            // Max 2000 chars
  audience: NewsAudience;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export interface AuditRecord {
  audit_id: string;
  actor_id: string;
  action: string;                          // e.g. "MARKET_HALTED"
  target: string;                          // e.g. "market", "participant", "event"
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  request_id: string | null;
  idempotency_key: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  timestamp: ISOTimestamp;
}
