/**
 * Admin type definitions — Warangal Trading Ring
 * Derived from contracts/v1/admin.md  STATUS: DRAFT
 * These types MUST match the API contract shapes exactly.
 */

// Financial primitive types — string-encoded to avoid floating-point precision loss
export type DecimalString = string;
// ISO-8601 UTC timestamp string
export type ISOTimestamp = string;

// ---------------------------------------------------------------------------
// Shared status enums — from admin.md
// ---------------------------------------------------------------------------
export type EventStatus = 'SETUP' | 'READY' | 'RUNNING' | 'PAUSED' | 'ENDED';
export type SimulationStatus = 'STOPPED' | 'RUNNING' | 'PAUSED';
export type DayStatus = 'PRE_OPEN' | 'OPEN' | 'CLOSED';
export type MarketStatus = 'PRE_OPEN' | 'OPEN' | 'PAUSED' | 'HALTED' | 'CLOSED';
export type DatasetValidationStatus = 'PENDING' | 'VALID' | 'INVALID';
export type ParticipantAdminStatus = 'ACTIVE' | 'DISABLED';

// ---------------------------------------------------------------------------
// Cursor — simulation position pointer
// ---------------------------------------------------------------------------
export interface SimulationCursor {
  dataset_id?: string;
  dataset_version?: string;
  simulation_day: number;
  interval_index: number;
  simulated_time: string;
}

// ---------------------------------------------------------------------------
// § 2 Event state — GET /api/v1/admin/event
// ---------------------------------------------------------------------------
export interface AdminEventState {
  event_id: string;
  event_status: EventStatus;
  simulation_status: SimulationStatus;
  day_status: DayStatus;
  market_status: MarketStatus;
  simulation_day: number;
  configured_total_simulation_days: number;
  days_remaining: number;
  simulation_time: string;
  cursor: SimulationCursor;
  last_committed_close: DecimalString;
  event_symbol_count: number;
  dataset_id: string;
  updated_at: ISOTimestamp;
  /**
   * Populated only in state-changing responses (§10).
   * Contains the latest authoritative price for each active symbol at the time of the operation.
   * Not present in GET /admin/event responses.
   */
  authoritative_price_by_symbol?: Record<string, DecimalString>;
}

// § 3 Event config — GET /api/v1/admin/event/config
export interface AdminEventConfig {
  dataset_id: string;
  dataset_total_days: number;
  dataset_symbol_count: number;
  configured_total_simulation_days: number;
  event_symbol_count: number;
  event_symbols: string[];
  data_interval_seconds: number;
  simulated_day_duration_minutes: number;
  simulated_day_duration_seconds: number;
  intervals_per_day: number;
  simulation_speed: number;
  rows_per_day: number;
  expected_total_event_rows: number;
  config_locked: boolean;
  dataset_checksum: string;
  dataset_validation_status: DatasetValidationStatus;
}

// PUT config request body
export interface SetEventConfigRequest {
  dataset_id: string;
  total_simulation_days: number;
  symbols: string[];
  simulation_speed: number;
}

// ---------------------------------------------------------------------------
// § 4 Simulation state — GET /api/v1/admin/simulation
// ---------------------------------------------------------------------------
export interface AdminSimulationState {
  simulation_status: SimulationStatus;
  simulation_day: number;
  simulation_time: string;
  interval_index: number;
  next_interval: string;
  intervals_remaining_today: number;
  simulation_speed: number;
  real_seconds_per_interval: number;
  cursor: SimulationCursor;
  last_commit_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// § 5 Market state — GET /api/v1/admin/market
// ---------------------------------------------------------------------------
export interface AdminMarketState {
  market_status: MarketStatus;
  day_status: DayStatus;
  last_committed_close_by_symbol: Record<string, DecimalString>;
  last_committed_at: ISOTimestamp;
  simulation_time: string;
}

// ---------------------------------------------------------------------------
// § 6 News — GET/POST /api/v1/admin/news
// ---------------------------------------------------------------------------
export type NewsType = 'INFO' | 'WARNING' | 'CRITICAL' | 'MARKET_UPDATE' | 'EVENT_UPDATE';
export type NewsAudience = 'ALL_PARTICIPANTS';

export interface AdminNewsItem {
  news_id: string;
  type: NewsType;
  title: string;
  body: string;
  audience: NewsAudience;
  created_by: string;
  created_at: ISOTimestamp;
}

export interface CreateNewsRequest {
  type: NewsType;
  title: string;
  body: string;
  audience: NewsAudience;
}

// ---------------------------------------------------------------------------
// § 7 Participant management
// ---------------------------------------------------------------------------
export interface AdminParticipant {
  participant_id: string;
  display_name: string;
  status: ParticipantAdminStatus;
  created_at: ISOTimestamp;
  // Extended detail (from GET /participants/{id})
  balance?: DecimalString;
  equity?: DecimalString;
  realized_pnl?: DecimalString;
  unrealized_pnl?: DecimalString;
  total_orders?: number;
  open_positions?: number;
  rank?: number;
}

// ---------------------------------------------------------------------------
// § 8 Monitoring
// ---------------------------------------------------------------------------
export type HealthStatus = 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'OFFLINE';

export interface AdminMonitoringState {
  event_status: EventStatus;
  simulation_status: SimulationStatus;
  market_status: MarketStatus;
  day_status: DayStatus;
  simulation_day: number;
  simulation_time: string;
  last_interval_commit_at: ISOTimestamp;
  intervals_committed_today: number;
  cursor_healthy: boolean;
  database_healthy: boolean;
  websocket_healthy: boolean;
  dataset_id: string;
  dataset_checksum: string;
  total_participants: number;
  active_participants: number;
  orders_today: number;
  errors_last_hour: number;
}

// Extended monitoring view with derived health status
export interface AdminMonitoringView extends AdminMonitoringState {
  overall_health: HealthStatus;
}

// Admin order — monitoring view
export interface AdminOrder {
  order_id: string;
  participant_id: string;
  participant_display_name: string;
  symbol: string;
  side: 'BUY' | 'SELL' | 'CLOSE';
  quantity: number;
  order_type: 'MARKET';
  status: 'PENDING' | 'ACCEPTED' | 'FILLED' | 'REJECTED' | 'FAILED' | 'CANCELLED';
  average_price: DecimalString | null;
  rejection_reason?: string;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

// Admin position — monitoring view
export interface AdminPosition {
  participant_id: string;
  participant_display_name: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  average_entry_price: DecimalString;
  current_price: DecimalString;
  unrealized_pnl: DecimalString;
  realized_pnl: DecimalString;
  market_value: DecimalString;
  updated_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// § 9 Audit log
// ---------------------------------------------------------------------------
export type AuditAction =
  | 'EVENT_STARTED' | 'EVENT_PAUSED' | 'EVENT_RESUMED' | 'EVENT_ENDED'
  | 'SIMULATION_STARTED' | 'SIMULATION_PAUSED' | 'SIMULATION_RESUMED'
  | 'DAY_CLOSED' | 'NEXT_DAY'
  | 'MARKET_OPENED' | 'MARKET_PAUSED' | 'MARKET_RESUMED' | 'MARKET_HALTED' | 'MARKET_CLOSED'
  | 'DATASET_SELECTED' | 'EVENT_CONFIG_CHANGED'
  | 'PARTICIPANT_ENABLED' | 'PARTICIPANT_DISABLED'
  | 'NEWS_CREATED'
  | 'SYSTEM_ERROR' | 'DATA_ERROR' | 'INTERVAL_COMMIT_FAILED';

export interface AuditLogEntry {
  audit_id: string;
  actor_id: string;
  action: AuditAction;
  target: string;
  previous_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  request_id: string;
  idempotency_key: string;
  reason?: string;
  metadata: Record<string, unknown>;
  timestamp: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// Admin leaderboard entry (same as participant leaderboard)
// ---------------------------------------------------------------------------
export interface AdminLeaderboardEntry {
  rank: number;
  participant_id: string;
  display_name: string;
  portfolio_value: DecimalString;
  total_pnl: DecimalString;
  return_percent: DecimalString;
  updated_at: ISOTimestamp;
}

export interface AdminLeaderboard {
  entries: AdminLeaderboardEntry[];
  total_participants: number;
  as_of: ISOTimestamp;
  version: number;
}

// ---------------------------------------------------------------------------
// Admin error codes — from admin.md §11
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
  | 'DATASET_INVALID'
  // Used by §3.2 Set Configuration (invalid symbol, duplicate, days > dataset_total_days).
  // NOTE: VALIDATION_ERROR is not listed in the §11 error codes table — contract gap.
  | 'VALIDATION_ERROR';

export const ADMIN_ERROR_MESSAGES: Record<AdminErrorCode, string> = {
  EVENT_NOT_READY: 'Event is not in READY state. Ensure configuration and dataset are valid.',
  EVENT_ALREADY_STARTED: 'Event has already been started.',
  EVENT_ALREADY_ENDED: 'Event has ended and cannot be modified.',
  EVENT_CONFIGURATION_LOCKED: 'Configuration is locked after event start.',
  EVENT_CONFIGURATION_INCOMPLETE: 'Required configuration is missing. Set dataset and symbols first.',
  SIMULATION_ALREADY_RUNNING: 'Simulation is already running.',
  SIMULATION_NOT_RUNNING: 'Simulation is not currently running.',
  DAY_NOT_CLOSED: 'Current simulation day must be closed before advancing.',
  DAY_ALREADY_CLOSED: 'Simulation day is already closed.',
  NO_NEXT_DAY: 'All configured simulation days have been completed.',
  MARKET_ALREADY_OPEN: 'Market is already open.',
  MARKET_ALREADY_HALTED: 'Market is already halted.',
  INVALID_STATE_TRANSITION: 'This state transition is not valid from the current state.',
  DATASET_NOT_READY: 'Dataset is not loaded or validated.',
  DATASET_INVALID: 'Dataset failed validation checks.',
  VALIDATION_ERROR: 'Configuration is invalid. Check symbol names, duplicates, and that total_simulation_days does not exceed dataset_total_days.',
};

// ---------------------------------------------------------------------------
// Dataset (UI-level, not yet fully specified in contract — DRAFT)
// ---------------------------------------------------------------------------
export interface AdminDataset {
  dataset_id: string;
  name: string;
  source: string;
  start_date: string;
  end_date: string;
  total_days: number;
  symbol_count: number;
  interval_seconds: number;
  total_candles: number;
  validation_status: DatasetValidationStatus;
  checksum: string;
  version: string;
  active: boolean;
  created_at: ISOTimestamp;
}
