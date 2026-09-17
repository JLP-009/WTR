/**
 * Order schemas for Warangal Trading Ring API
 * STATUS: DRAFT — v1
 *
 * V1 EXECUTION MODEL:
 * Warangal Trading Ring V1 is NOT an exchange. There is no order book, no order matching,
 * and no participant-to-participant execution. Every valid MARKET order is executed
 * immediately by the Order Execution Service against the authoritative market price.
 *
 * Normal V1 lifecycle: PENDING → ACCEPTED → FILLED
 * Failure paths:       PENDING → REJECTED | ACCEPTED → FAILED
 */

import type { DecimalString, ISOTimestamp, OrderId, ClientOrderId, ExecutionId } from './common';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
/**
 * The direction of the order.
 *
 * BUY  — purchase the instrument (reduces cash, may open/increase LONG or reduce/close SHORT)
 * SELL — sell the instrument (may open/increase SHORT or reduce/close LONG)
 * CLOSE — close the participant's entire open position in the symbol (no quantity required)
 *
 * IMPORTANT: OrderSide and PositionSide (LONG/SHORT) are distinct concepts.
 * BUY does not always result in LONG. SELL does not always result in SHORT.
 * The resulting PositionSide depends on the current net position — see positions.md §1.2.
 */
export type OrderSide = 'BUY' | 'SELL' | 'CLOSE';

/**
 * v1: MARKET only.
 * A MARKET order executes immediately at the authoritative market price.
 * The participant does not submit a price. There is no order book.
 */
export type OrderType = 'MARKET';

/**
 * V1 order status values.
 *
 * NORMAL PATH (expected for every valid submission):
 *   PENDING → ACCEPTED → FILLED
 *
 * FAILURE PATHS:
 *   PENDING → REJECTED   (validation failed: bad inputs, insufficient funds/position, CLOSE with no open position)
 *   ACCEPTED → FAILED    (Order Execution Service could not obtain price or commit execution)
 *
 * EXCEPTIONAL STATES (not produced by normal V1 MARKET order execution):
 *   PARTIALLY_FILLED   — must NOT occur in normal V1 execution; retained for schema forward-compatibility
 *   CANCEL_REQUESTED   — only if cancel arrives during exceptional in-flight processing state
 *   CANCELLED          — only if the above cancel request succeeds before execution commits
 */
export type OrderStatus =
  | 'PENDING'            // Order record created; validation and execution dispatch in progress
  | 'ACCEPTED'           // Validation passed; Order Execution Service executing immediately
  | 'FILLED'             // Complete quantity executed at authoritative market price — TERMINAL
  | 'REJECTED'           // Order rejected during validation — TERMINAL
  | 'FAILED'             // Order Execution Service could not obtain price or commit — TERMINAL
  | 'PARTIALLY_FILLED'   // NOT NORMAL IN V1 — retained for forward-compatibility only
  | 'CANCEL_REQUESTED'   // NOT NORMAL IN V1 — exceptional in-flight cancel only
  | 'CANCELLED';         // NOT NORMAL IN V1 — exceptional in-flight cancel only — TERMINAL

export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  'FILLED',
  'CANCELLED',
  'REJECTED',
  'FAILED',
] as const;

/**
 * For CANCELLED, REJECTED, and FAILED:
 * Reserved cash/position units are released back to available_cash.
 * A portfolio.updated WebSocket event confirms the release.
 * The frontend must not assume funds are available until that event is received.
 */

// ---------------------------------------------------------------------------
// POST /api/v1/orders — request headers (documented; not part of JSON body)
// ---------------------------------------------------------------------------
// Required headers:
//   Authorization: Bearer <access_token>
//   Content-Type: application/json
//   Idempotency-Key: <uuid>    — strongly recommended; max 128 chars [a-zA-Z0-9_-]
//   X-Request-ID: <string>     — optional; for logging correlation
//
// Idempotency-Key scope: per participant.
//   Same key + same payload → replayed response, no new order, no new execution.
//   Same key + different payload → 409 CONFLICT.
//   Critical: if execution succeeded but client never received the response (timeout),
//   retrying with the same key returns the original FILLED order — no second execution.

// ---------------------------------------------------------------------------
// POST /api/v1/orders — request body
// ---------------------------------------------------------------------------
export interface CreateOrderRequest {
  /** Client-generated stable order identity. Max 64 chars, [a-zA-Z0-9_-]. Unique per participant. */
  client_order_id: ClientOrderId;
  symbol: string;
  side: OrderSide;
  /**
   * Positive integer. Must be a multiple of the instrument's lot_size.
   * REQUIRED for BUY and SELL.
   * MUST BE ABSENT OR NULL for CLOSE — the system resolves quantity from the current position.
   * For a successfully FILLED V1 order: filled_quantity will equal this value.
   */
  quantity?: number | null;
  order_type: OrderType;
}

// ---------------------------------------------------------------------------
// Order object — returned in all order responses
// ---------------------------------------------------------------------------
export interface Order {
  order_id: OrderId;
  client_order_id: ClientOrderId;
  symbol: string;
  side: OrderSide;
  /** The requested quantity. */
  quantity: number;
  /**
   * For a FILLED V1 MARKET order: equals quantity (complete fill).
   * For PENDING/ACCEPTED: 0 (execution not yet committed).
   */
  filled_quantity: number;
  /**
   * For a FILLED V1 MARKET order: 0.
   * For PENDING/ACCEPTED: equals quantity.
   */
  remaining_quantity: number;
  order_type: OrderType;
  status: OrderStatus;
  /**
   * Null until execution commits.
   * For a FILLED V1 MARKET order: the authoritative market price at time of execution.
   * This is the actual execution price, not a bid/ask or participant-submitted price.
   */
  average_price: DecimalString | null;
  /**
   * Present in GET /orders/{id} response only (not in GET /orders list).
   * For a FILLED V1 MARKET order: exactly one execution covering the full quantity.
   */
  executions?: Execution[];
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// Individual execution record
// ---------------------------------------------------------------------------
export interface Execution {
  execution_id: ExecutionId;
  /** For a normal V1 MARKET order: equals the order's full quantity. */
  quantity: number;
  /** The authoritative market price at which this execution occurred. */
  price: DecimalString;
  executed_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// POST /api/v1/orders/{id}/cancel — response
// ---------------------------------------------------------------------------
export interface CancelOrderResponse {
  order_id: OrderId;
  /**
   * In normal V1 operation, an order is FILLED before a cancel can arrive.
   * This response is only meaningful for exceptional in-flight processing states.
   */
  status: 'CANCEL_REQUESTED' | OrderStatus;
  updated_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// GET /api/v1/orders — query params
// ---------------------------------------------------------------------------
export interface ListOrdersParams {
  status?: OrderStatus;
  symbol?: string;
  client_order_id?: ClientOrderId;
  cursor?: string;
  limit?: number;
}
