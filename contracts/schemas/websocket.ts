/**
 * WebSocket event schemas for Warangal Trading Ring API
 * STATUS: DRAFT — v1
 */

import type { EventId, ISOTimestamp, UserId, DecimalString } from './common';
import type { MarketStatus, Candle, CandleTimeframe } from './market';
import type { Order } from './order';
import type { Position } from './position';
import type { Portfolio } from './portfolio';

// ---------------------------------------------------------------------------
// All event type strings
// ---------------------------------------------------------------------------
export type WsEventType =
  | 'market.quote'
  | 'market.candle'
  | 'order.updated'
  | 'position.updated'
  | 'portfolio.updated'
  | 'leaderboard.updated'
  | 'system.status'
  | 'news.created';

// ---------------------------------------------------------------------------
// Event privacy classification
// ---------------------------------------------------------------------------
// PUBLIC-TO-AUTHENTICATED: delivered to all authenticated subscribers
//   market.quote, market.candle, leaderboard.updated, system.status
//
// PRIVATE-OWNER-ONLY: delivered only to the owning participant's connection
//   order.updated, position.updated, portfolio.updated
//
// Private events from participant A must NEVER be delivered to participant B,
// even across multiple WebSocket gateway instances.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Standard server-push event envelope
// ---------------------------------------------------------------------------
export interface WsEvent<T = unknown> {
  event_id: EventId;       // Stable unique ID. Use for deduplication (in-memory set, connection-scoped).
  event_type: WsEventType;
  /**
   * Monotonically increasing integer. Scope: PER CONNECTION ONLY.
   * Resets to 1 on every new connection (including reconnects).
   * Purpose: gap detection within a single connection.
   * A gap means events were dropped — re-fetch REST state.
   * Does NOT imply replay capability. Does NOT survive reconnect.
   * Do NOT compare sequence numbers across connections.
   */
  sequence: number;
  timestamp: ISOTimestamp; // When the event was generated server-side
  payload: T;
}

// ---------------------------------------------------------------------------
// Client → Server messages
// ---------------------------------------------------------------------------

export interface WsAuthMessage {
  type: 'auth';
  token: string;
}

export interface WsSubscribeMessage {
  type: 'subscribe';
  channels: WsEventType[];
  symbols?: string[];        // Optional symbol filter for market.quote / market.candle
}

export interface WsPingMessage {
  type: 'ping';
  ts: ISOTimestamp;
}

export type WsClientMessage = WsAuthMessage | WsSubscribeMessage | WsPingMessage;

// ---------------------------------------------------------------------------
// Server → Client control messages (not events)
// ---------------------------------------------------------------------------

export interface WsAuthSuccessMessage {
  type: 'auth.success';
  user_id: UserId;
  participant_id: string;
}

export interface WsAuthFailedMessage {
  type: 'auth.failed';
  code: 'AUTHENTICATION_FAILED';
  message: string;
}

export interface WsSubscribedMessage {
  type: 'subscribed';
  channels: WsEventType[];
}

export interface WsPongMessage {
  type: 'pong';
  ts: ISOTimestamp;
}

export interface WsErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export type WsServerControlMessage =
  | WsAuthSuccessMessage
  | WsAuthFailedMessage
  | WsSubscribedMessage
  | WsPongMessage
  | WsErrorMessage;

// ---------------------------------------------------------------------------
// Event payload types — one per event_type
// ---------------------------------------------------------------------------

// market.quote — PUBLIC-TO-AUTHENTICATED
// No bid_price or ask_price — this platform has no order book.
// quote_timestamp is when this interval was committed by the simulation engine.
export interface QuoteEventPayload {
  symbol: string;
  /** CLOSE of last fully committed 10-second interval — authoritative execution price. */
  last_price: DecimalString;
  change: DecimalString | null;
  change_percent: DecimalString | null;
  volume: number;
  quote_timestamp: ISOTimestamp;
}

// market.candle — PUBLIC-TO-AUTHENTICATED
// Includes simulation context for chart rendering and authoritative price tracking.
export interface CandleEventPayload {
  symbol: string;
  timeframe: CandleTimeframe;
  simulation_day: number;
  simulation_time: string;       // HH:MM:SS in simulation timezone (e.g. "09:15:00")
  interval_index: number;        // 0-based; 0 = 09:15:00, 71 = 09:26:50
  candle: Candle;
  /**
   * The authoritative execution price immediately after this interval commits.
   * Equals candle.close. Participant MARKET orders placed after receiving this
   * event will execute at this price (if market_status = OPEN or last committed
   * close for other states).
   */
  authoritative_price: DecimalString;
}

// order.updated — PRIVATE-OWNER-ONLY
// Same shape as the REST Order type. Carries updated_at for staleness comparison.
export type OrderUpdatedPayload = Order;

// position.updated — PRIVATE-OWNER-ONLY
// Same shape as the REST Position type. Carries updated_at for staleness comparison.
export type PositionUpdatedPayload = Position;

// portfolio.updated — PRIVATE-OWNER-ONLY
// Same shape as REST Portfolio minus participant_id. Carries updated_at for staleness comparison.
export type PortfolioUpdatedPayload = Omit<Portfolio, 'participant_id'>;

// leaderboard.updated — PUBLIC-TO-AUTHENTICATED
// Signals that a new snapshot is available. Client fetches GET /api/v1/leaderboard.
// version allows client to skip fetch if it already holds a more recent snapshot.
export interface LeaderboardUpdatedPayload {
  version: number;
  as_of: ISOTimestamp;
  total_participants: number;
}

// system.status — PUBLIC-TO-AUTHENTICATED
// Broadcast on any lifecycle state change (market, simulation, event, day).
export interface SystemStatusPayload {
  event_status: string;                          // EventStatus
  simulation_status: string;                     // SimulationStatus
  day_status: string;                            // DayStatus
  market_status: MarketStatus;
  simulation_day: number;
  configured_total_simulation_days: number;
  simulation_time: string;                       // HH:MM:SS
  last_committed_close_by_symbol: Record<string, DecimalString>;
  server_time: ISOTimestamp;
  next_change_at: ISOTimestamp | null;
  message: string | null;
}

// news.created — PUBLIC-TO-AUTHENTICATED
export interface NewsEventPayload {
  news_id: string;
  type: string;                                  // NewsType from simulation.ts
  title: string;
  body: string;
  created_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// Typed event wrappers for consumer convenience
// ---------------------------------------------------------------------------
export type WsQuoteEvent = WsEvent<QuoteEventPayload>;
export type WsCandleEvent = WsEvent<CandleEventPayload>;
export type WsOrderUpdatedEvent = WsEvent<OrderUpdatedPayload>;
export type WsPositionUpdatedEvent = WsEvent<PositionUpdatedPayload>;
export type WsPortfolioUpdatedEvent = WsEvent<PortfolioUpdatedPayload>;
export type WsLeaderboardUpdatedEvent = WsEvent<LeaderboardUpdatedPayload>;
export type WsSystemStatusEvent = WsEvent<SystemStatusPayload>;
export type WsNewsEvent = WsEvent<NewsEventPayload>;

export type AnyWsEvent =
  | WsQuoteEvent
  | WsCandleEvent
  | WsOrderUpdatedEvent
  | WsPositionUpdatedEvent
  | WsPortfolioUpdatedEvent
  | WsLeaderboardUpdatedEvent
  | WsSystemStatusEvent
  | WsNewsEvent;
