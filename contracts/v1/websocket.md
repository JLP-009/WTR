# WebSocket Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Overview

The WebSocket connection delivers real-time events to clients. It is a **push channel**, not the source of truth.

**Core principle:** WebSocket events are updates on top of authoritative REST state. A client that misses events must re-fetch REST endpoints to restore correct state — not attempt to reconstruct state from remembered events.

**Endpoint:**
```
wss://<host>/api/v1/ws
```

The WebSocket server may run as multiple gateway instances. It must NOT rely on process-local memory for routing private events. Redis pub/sub (or equivalent) is assumed for cross-instance event delivery.

---

## 2. Event Envelope

Every event sent by the server uses this envelope:

```json
{
  "event_id": "evt_01ARZ3...",
  "event_type": "order.updated",
  "sequence": 10042,
  "timestamp": "2026-01-01T10:30:01.456Z",
  "payload": { ... }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `event_id` | string | Unique, stable event identifier. Used for deduplication. |
| `event_type` | string | See section 6 for all types |
| `sequence` | integer | Monotonically increasing per-connection sequence number. Gaps indicate missed events. |
| `timestamp` | string (ISO-8601 UTC) | When the event was generated server-side |
| `payload` | object | Event-specific data — see section 7 |

---

## 3. Connection Lifecycle

```
CLIENT                                SERVER
  │                                      │
  │── TCP + TLS handshake ───────────────>│
  │<─ 101 Switching Protocols ───────────│
  │                                      │
  │── { "type": "auth", ... } ──────────>│
  │<─ { "type": "auth.success", ... } ──│  ← or auth.failed → close
  │                                      │
  │── { "type": "subscribe", ... } ─────>│
  │<─ { "type": "subscribed", ... } ────│
  │                                      │
  │<─ events stream ─────────────────────│
  │                                      │
  │── { "type": "ping" } ───────────────>│
  │<─ { "type": "pong" } ───────────────│
  │                                      │
  │── close / disconnect ───────────────>│
```

### States
- `CONNECTING`: TCP + TLS established, no auth yet
- `AUTHENTICATING`: auth message sent, awaiting response
- `AUTHENTICATED`: auth accepted
- `SUBSCRIBED`: subscriptions active, events flowing
- `CLOSED`: connection terminated

---

## 4. Authentication

The WebSocket connection requires authentication immediately after opening.

**Auth message (client → server):**
```json
{
  "type": "auth",
  "token": "<access_token>"
}
```

**Auth success (server → client):**
```json
{
  "type": "auth.success",
  "user_id": "usr_01ARZ3...",
  "participant_id": "TRADER001"
}
```

**Auth failure (server → client):**
```json
{
  "type": "auth.failed",
  "code": "AUTHENTICATION_FAILED",
  "message": "Invalid or expired token."
}
```
Server closes the connection immediately after `auth.failed`.

**Timeout:** If the client does not send an `auth` message within 10 seconds of connection, the server closes the connection.

**Private event isolation:** After authentication, the server only pushes private events belonging to the authenticated participant. Private events from other participants must never be delivered to this connection under any circumstances.

---

## 5. Subscriptions

After authentication, the client declares which channels to subscribe to.

**Subscribe message (client → server):**
```json
{
  "type": "subscribe",
  "channels": ["market.quote", "market.candle", "order.updated", "position.updated",
                "portfolio.updated", "leaderboard.updated", "system.status", "news.created"]
}
```

**Subscribed confirmation (server → client):**
```json
{
  "type": "subscribed",
  "channels": ["market.quote", "market.candle", "order.updated", "position.updated",
                "portfolio.updated", "leaderboard.updated", "system.status", "news.created"]
}
```

For channels with sub-scoping (e.g., specific symbols), use:
```json
{
  "type": "subscribe",
  "channels": ["market.quote"],
  "symbols": ["NIFTY", "RELIANCE"]
}
```

If `symbols` is omitted for `market.quote` and `market.candle`, the client receives updates for **all** instruments. Symbol-level filtering is supported but optional — Agent 2 may send all-instruments if the filter is not implemented, which is conformant at this competition scale.

---

## 6. Event Classification and Privacy

### 6.1 Formal Classification Table

| Event Type | Classification | Delivered to | Isolation guarantee |
|------------|---------------|--------------|---------------------|
| `market.quote` | PUBLIC-TO-AUTHENTICATED | All subscribed authenticated participants | No isolation needed |
| `market.candle` | PUBLIC-TO-AUTHENTICATED | All subscribed authenticated participants | No isolation needed |
| `order.updated` | PRIVATE-OWNER-ONLY | The owning participant's connections only | Strict per-participant isolation |
| `position.updated` | PRIVATE-OWNER-ONLY | The owning participant's connections only | Strict per-participant isolation |
| `portfolio.updated` | PRIVATE-OWNER-ONLY | The owning participant's connections only | Strict per-participant isolation |
| `leaderboard.updated` | PUBLIC-TO-AUTHENTICATED | All subscribed authenticated participants | No isolation needed |
| `system.status` | PUBLIC-TO-AUTHENTICATED | All subscribed authenticated participants | No isolation needed |
| `news.created` | PUBLIC-TO-AUTHENTICATED | All subscribed authenticated participants | No isolation needed |

### 6.2 Private Event Isolation Rule

**Private events from participant A must NEVER be delivered to participant B.**

This rule holds unconditionally, including when:
- Multiple WebSocket gateway instances are running.
- The same physical server handles connections from multiple participants.
- Redis pub/sub is used for cross-instance event delivery.

The gateway must filter private events by `user_id` before delivery. The authenticated `user_id` (established during the `auth` step) is the isolation key. No client-controlled parameter may override this isolation.

### 6.3 Authentication Required for All Events

All events require an authenticated connection. No event is delivered on an unauthenticated connection. A connection that fails authentication is closed immediately and receives no events.

---

## 7. Event Payloads

### 7.1 market.quote

```json
{
  "event_id": "evt_001",
  "event_type": "market.quote",
  "sequence": 5001,
  "timestamp": "2026-01-01T10:30:00.123Z",
  "payload": {
    "symbol": "NIFTY",
    "last_price": "24510.25",
    "change": "310.25",
    "change_percent": "1.28",
    "volume": 1252000,
    "quote_timestamp": "2026-01-01T10:30:00.100Z"
  }
}
```

`last_price` is the CLOSE of the most recently fully committed 10-second interval. `quote_timestamp` is when this interval was committed. No `bid_price` or `ask_price` — this platform has no order book.

---

### 7.2 market.candle

```json
{
  "event_id": "evt_002",
  "event_type": "market.candle",
  "sequence": 5002,
  "timestamp": "2026-01-01T10:30:00.123Z",
  "payload": {
    "symbol": "NIFTY",
    "timeframe": "1m",
    "candle": {
      "timestamp": "2026-01-01T10:30:00.000Z",
      "open": "24500.00",
      "high": "24512.00",
      "low": "24498.00",
      "close": "24510.25",
      "volume": 15000,
      "is_complete": false
    }
  }
}
```

`is_complete: false` means the candle interval is still open. `is_complete: true` means the candle interval has closed and will not change.

---

### 7.3 order.updated

```json
{
  "event_id": "evt_003",
  "event_type": "order.updated",
  "sequence": 5003,
  "timestamp": "2026-01-01T10:30:01.456Z",
  "payload": {
    "order_id": "ord_01ARZ3...",
    "client_order_id": "my-order-uuid-001",
    "symbol": "NIFTY",
    "side": "BUY",
    "quantity": 10,
    "filled_quantity": 10,
    "remaining_quantity": 0,
    "order_type": "MARKET",
    "status": "FILLED",
    "average_price": "24510.25",
    "updated_at": "2026-01-01T10:30:01.456Z"
  }
}
```

This event is the mechanism by which the frontend learns execution results. The frontend must not treat HTTP 201 as execution confirmation.

**CLOSE orders:** For a CLOSE order, `side` in the event payload remains `"CLOSE"` — it is not replaced with the resolved `"BUY"` or `"SELL"` direction. `quantity` is populated with the resolved position size. The frontend matches the event to its local order record by `order_id` or `client_order_id`.

---

### 7.4 position.updated

```json
{
  "event_id": "evt_004",
  "event_type": "position.updated",
  "sequence": 5004,
  "timestamp": "2026-01-01T10:30:01.500Z",
  "payload": {
    "symbol": "NIFTY",
    "side": "LONG",
    "quantity": 10,
    "average_entry_price": "24510.25",
    "current_price": "24510.25",
    "market_value": "245102.50",
    "cost_basis": "245102.50",
    "unrealized_pnl": "0.00",
    "unrealized_pnl_percent": "0.00",
    "realized_pnl": "0.00",
    "updated_at": "2026-01-01T10:30:01.500Z"
  }
}
```

SHORT position example:
```json
{
  "event_id": "evt_004b",
  "event_type": "position.updated",
  "sequence": 5010,
  "timestamp": "2026-01-01T10:32:00.000Z",
  "payload": {
    "symbol": "RELIANCE",
    "side": "SHORT",
    "quantity": 50,
    "average_entry_price": "1480.00",
    "current_price": "1460.00",
    "market_value": "73000.00",
    "cost_basis": "74000.00",
    "unrealized_pnl": "1000.00",
    "unrealized_pnl_percent": "1.35",
    "realized_pnl": "0.00",
    "updated_at": "2026-01-01T10:32:00.000Z"
  }
}
```

`quantity` is always a positive integer. `side` carries the direction. `average_entry_price` replaces the former `average_buy_price` field to correctly represent both LONG and SHORT entry prices.

---

### 7.5 portfolio.updated

```json
{
  "event_id": "evt_005",
  "event_type": "portfolio.updated",
  "sequence": 5005,
  "timestamp": "2026-01-01T10:30:01.550Z",
  "payload": {
    "balance": {
      "available_cash": "754897.50",
      "reserved_cash": "0.00",
      "total_cash": "754897.50"
    },
    "invested": {
      "cost_basis": "245102.50",
      "market_value": "245102.50"
    },
    "portfolio_value": "1000000.00",
    "pnl": {
      "unrealized_pnl": "0.00",
      "realized_pnl": "0.00",
      "total_pnl": "0.00",
      "daily_pnl": "0.00",
      "return_percent": "0.00"
    },
    "updated_at": "2026-01-01T10:30:01.550Z"
  }
}
```

---

### 7.6 leaderboard.updated

```json
{
  "event_id": "evt_006",
  "event_type": "leaderboard.updated",
  "sequence": 5006,
  "timestamp": "2026-01-01T10:30:30.000Z",
  "payload": {
    "version": 4822,
    "as_of": "2026-01-01T10:30:29.800Z",
    "total_participants": 312
  }
}
```

The event signals that a new leaderboard snapshot is available. The client fetches `GET /api/v1/leaderboard` to get the full data. The `version` field allows the client to skip fetches if it already has a more recent version. The payload carries version + as_of + total_participants only — not the full snapshot.

---

### 7.7 system.status

Broadcast whenever any lifecycle state changes (market, simulation, event, day).

```json
{
  "event_id": "evt_007",
  "event_type": "system.status",
  "sequence": 5007,
  "timestamp": "2026-09-05T09:15:00.000Z",
  "payload": {
    "event_status": "RUNNING",
    "simulation_status": "RUNNING",
    "day_status": "OPEN",
    "market_status": "OPEN",
    "simulation_day": 1,
    "configured_total_simulation_days": 5,
    "simulation_time": "09:15:00",
    "last_committed_close_by_symbol": {
      "NIFTY": "100.10",
      "RELIANCE": "1452.30"
    },
    "server_time": "2026-09-05T09:15:00.000Z",
    "next_change_at": null,
    "message": null
  }
}
```

Clients must use `GET /api/v1/admin/simulation` or `GET /api/v1/market/status` for authoritative reconciliation after reconnect.

---

### 7.8 market.candle (Simulation Fields)

The `market.candle` event payload includes simulation context for TradingView/chart rendering:

```json
{
  "event_id": "evt_008",
  "event_type": "market.candle",
  "sequence": 5008,
  "timestamp": "2026-09-05T09:15:10.000Z",
  "payload": {
    "symbol": "NIFTY",
    "timeframe": "10s",
    "simulation_day": 1,
    "simulation_time": "09:15:00",
    "interval_index": 0,
    "candle": {
      "timestamp": "2026-09-05T09:15:00.000Z",
      "open": "100.00",
      "high": "100.20",
      "low": "99.90",
      "close": "100.10",
      "volume": 1200,
      "is_complete": true
    },
    "authoritative_price": "100.10"
  }
}
```

`authoritative_price` is the CLOSE of this interval — the price used for participant order execution immediately after this event is received. This field must match the order execution price for orders placed after this interval commits.

---

### 7.9 news.created

```json
{
  "event_id": "evt_009",
  "event_type": "news.created",
  "sequence": 6100,
  "timestamp": "2026-09-05T10:25:00.000Z",
  "payload": {
    "news_id": "news_01ARZ...",
    "type": "CRITICAL",
    "title": "Market Volatility Alert",
    "body": "Significant price movement expected in NIFTY.",
    "created_at": "2026-09-05T10:25:00.000Z"
  }
}
```

Participants who miss this event can recover via `GET /api/v1/news`.

---

## 8. Ping / Pong (Keepalive)

**Client → Server:**
```json
{ "type": "ping", "ts": "2026-01-01T10:30:00.000Z" }
```

**Server → Client:**
```json
{ "type": "pong", "ts": "2026-01-01T10:30:00.000Z" }
```

The server also sends periodic pings. If the client does not respond within 30 seconds, the server closes the connection.

Recommended client ping interval: **20 seconds**.

---

## 9. Reconnect Strategy

Network interruptions are expected. The client must implement reconnect with mandatory REST re-fetch. Events missed during disconnection are not replayed.

```
WebSocket disconnects (network drop, server restart, timeout, code 1001/1011)
        │
        v
Halt all UI updates from cached/stale local state
        │
        v
Client waits [exponential backoff: 1s → 2s → 4s → 8s → 16s → max 30s]
        │
        v
Client reconnects to wss://<host>/api/v1/ws
        │
        v
Client sends auth message with current access token
  └── If 4001 (token expired): POST /auth/refresh first, then reconnect
        │
        v
Client re-subscribes to channels
        │
        v
Client MUST re-fetch authoritative REST state (mandatory — not optional):
  GET /api/v1/market/status
  GET /api/v1/orders?status=PENDING,ACCEPTED,PARTIALLY_FILLED,CANCEL_REQUESTED
  GET /api/v1/positions
  GET /api/v1/portfolio
  GET /api/v1/leaderboard    (if displayed)
        │
        v
Client replaces local state with REST responses
        │
        v
Client discards the in-memory event_id dedup set (it was connection-scoped)
        │
        v
Client resumes processing new WebSocket events
```

**The REST fetch step is mandatory without exception.** There is no event replay. Missed events cannot be recovered by any other means.

**Sequence numbers reset on each connection.** Do not compare sequence numbers from the new connection against those from the previous connection.

---

## 10. Duplicate Event Handling

Events may be delivered more than once (at-least-once delivery). The client must tolerate duplicates.

**Deduplication strategy using `event_id`:**
```
On receiving event:
  if event_id already in seen-set → discard silently
  else → process event and add event_id to seen-set
```

Clients should maintain an in-memory set of recently seen `event_id` values (last ~1000 events is sufficient for this scale).

**This set is connection-scoped.** It is discarded on disconnect. On reconnect, the set starts empty because REST re-fetch replaces all state.

---

## 10a. Stale Event Handling

Events may arrive delayed, out of order, or after the client has already received newer state via REST.

**Rule: a stale event must never overwrite newer known state.**

An event is stale if its `payload.updated_at` (for private events) or `payload.quote_timestamp` (for market events) is older than the timestamp of the state the client already holds.

**Deterministic staleness rule for v1:**

For every event type that carries an `updated_at` or equivalent timestamp in the payload:

```
On receiving event:
  event_time = payload.updated_at (or payload.quote_timestamp)
  local_time = locally known updated_at for this resource

  if event_time < local_time:
    discard event — local state is newer
  else:
    apply event — update local state
```

For events that do not carry a payload timestamp (e.g., `system.status`): apply unconditionally and use the envelope `timestamp` to assess recency.

**Sequence numbers do not substitute for timestamp comparison.** Sequence numbers are for gap detection only, not for staleness checks.

---

## 11. Sequence Number Semantics

### 11.1 Scope

`sequence` is a **per-connection, monotonically increasing integer**. It starts at 1 on each new connection and increments with every event delivered on that connection.

- It is **not** a global event ID.
- It is **not** durable across reconnections.
- It **resets to 1** on every new WebSocket connection (including reconnects).
- It does **not** imply replay capability. Missed events from a previous connection cannot be recovered using a prior sequence number.

### 11.2 Purpose

`sequence` has exactly one purpose: **gap detection within a single connection**.

If the client receives sequence 100 then sequence 103, events 101 and 102 were dropped within the current connection. This indicates the client's local state is potentially stale.

On a gap: immediately re-fetch authoritative REST state (see section 9). Do not attempt to infer the missing events.

### 11.3 What sequence Does NOT Guarantee

- It does not guarantee global ordering across all event types.
- It does not guarantee causal ordering between events from different subsystems (e.g., a `portfolio.updated` may arrive before an `order.updated` for the same fill).
- It does not guarantee exactly-once delivery — events may be duplicated (use `event_id` for deduplication).
- It does not provide a mechanism for replaying events from a prior connection.

### 11.4 Event Replay

**There is no event replay in v1.** The WebSocket is a push channel, not a durable event log.

On reconnect: discard all cached events from the previous connection. Use REST re-fetch (section 9) to restore authoritative state. Resume processing new WebSocket events after REST fetch completes.

### 11.5 Per-Participant Private Event Ordering

For private events (`order.updated`, `position.updated`, `portfolio.updated`) delivered on the same connection, the server makes a best-effort guarantee that events for the same participant are delivered in causal order within that connection. This is not a hard guarantee under multi-gateway deployments.

**The client must not depend on private event ordering for financial correctness.** Use REST state as the truth, and apply WebSocket events as updates.

---

## 12. Error Messages (Server → Client)

```json
{
  "type": "error",
  "code": "SUBSCRIBE_FAILED",
  "message": "Invalid channel name: market.invalid"
}
```

These are WebSocket-layer errors, not HTTP errors. They use the same error code vocabulary as the REST API where applicable.

---

## 13. Connection Close Codes

| Code | Reason |
|------|--------|
| 1000 | Normal closure |
| 1001 | Server going away (restart) |
| 1008 | Auth failure |
| 1011 | Server error |
| 4000 | Auth timeout |
| 4001 | Token expired (client must refresh and reconnect) |

On receiving `4001`, the client must refresh the access token via `POST /auth/refresh` before reconnecting.

---

## 14. Resolved Decisions

| ID | Decision | Resolution |
|----|----------|------------|
| OD-WS-02 | Event replay on reconnect | **No replay in v1.** REST re-fetch is the reconciliation mechanism. This is final for v1. |

## 15. Remaining Implementation Decisions

These do not affect the public API contract.

| ID | Decision | Default | Notes |
|----|----------|---------|-------|
| OD-WS-01 | Per-symbol subscriptions | All instruments default; `symbols` filter supported but optional | Agent 2 may implement filter or ignore it and send all — either is conformant for this competition scale |
| OD-WS-03 | Candle push for all timeframes or filtered | All active timeframes | Agent 2 decision |
