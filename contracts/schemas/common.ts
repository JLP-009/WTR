/**
 * Common shared types for Warangal Trading Ring API
 * STATUS: DRAFT — v1
 */

// ---------------------------------------------------------------------------
// Decimal string — used for all financial values at the API boundary.
// Never use number for prices, P&L, balances, or percentages.
// ---------------------------------------------------------------------------
export type DecimalString = string;

// ---------------------------------------------------------------------------
// ISO-8601 UTC timestamp string — e.g. "2026-01-01T10:30:00.000Z"
// ---------------------------------------------------------------------------
export type ISOTimestamp = string;

// ---------------------------------------------------------------------------
// Opaque ID types — clients must not parse or construct these.
// ---------------------------------------------------------------------------
export type UserId = string;         // usr_<ulid>
export type OrderId = string;        // ord_<ulid>
export type ExecutionId = string;    // exe_<ulid>
export type EventId = string;        // evt_<ulid>
export type RequestId = string;      // req_<ulid> or client-provided

// Client-generated ID, max 64 chars, [a-zA-Z0-9_-]
export type ClientOrderId = string;

// ---------------------------------------------------------------------------
// Standard success envelope — single object
// ---------------------------------------------------------------------------
export interface ApiResponse<T> {
  data: T;
  request_id: RequestId;
}

// ---------------------------------------------------------------------------
// Standard success envelope — collection with cursor pagination
// ---------------------------------------------------------------------------
export interface ApiCollectionResponse<T> {
  data: T[];
  next_cursor: string | null;
  request_id: RequestId;
}

// ---------------------------------------------------------------------------
// Standard success envelope — collection with offset pagination
// ---------------------------------------------------------------------------
export interface ApiOffsetResponse<T> {
  data: T[];
  offset: number;
  limit: number;
  request_id: RequestId;
}

// ---------------------------------------------------------------------------
// Standard error envelope
// ---------------------------------------------------------------------------
export interface ApiErrorResponse {
  error: ApiError;
  request_id: RequestId;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details: Record<string, unknown>;
}

export interface ValidationErrorDetails {
  fields: ValidationFieldError[];
}

export interface ValidationFieldError {
  field: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Error codes — exhaustive list for v1
// ---------------------------------------------------------------------------
export type ErrorCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'AUTHENTICATION_FAILED'
  | 'ACCOUNT_DISABLED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DUPLICATE_REQUEST'
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_POSITION'   // Not enough LONG position quantity for directional SELL
  | 'NO_OPEN_POSITION'        // CLOSE order submitted but no open position exists
  | 'NO_AUTHORITATIVE_PRICE'  // No committed simulation price exists; Day 1 PRE_OPEN before first interval
  | 'MARKET_CLOSED'           // Reserved for admin operations; NOT used for standard participant MARKET orders
  | 'INVALID_ORDER'
  | 'CANCEL_INVALID'
  | 'RATE_LIMITED'
  | 'SYSTEM_UNAVAILABLE'
  | 'INTERNAL_ERROR';

// ---------------------------------------------------------------------------
// Admin lifecycle error codes — returned only by /api/v1/admin/* endpoints.
// See also: simulation.ts AdminErrorCode (same values, kept in sync).
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

/** Union of all possible error codes across participant and admin endpoints. */
export type AnyErrorCode = ErrorCode | AdminErrorCode;

// ---------------------------------------------------------------------------
// Cursor pagination query params
// ---------------------------------------------------------------------------
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Offset pagination query params
// ---------------------------------------------------------------------------
export interface OffsetPaginationParams {
  offset?: number;
  limit?: number;
}
