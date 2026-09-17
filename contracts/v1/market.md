# Market API Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Overview

The Market API provides read-only access to:
- Market status (is trading open?)
- Available instruments
- Real-time quotes
- Historical candles (OHLCV)

All market endpoints are **GET** — they do not mutate state.

Market data is sourced from the simulation dataset — a collection of 10-second OHLCV intervals loaded from the master CSV dataset. The API layer caches and serves this data. REST responses here are **point-in-time snapshots**. For continuous real-time updates, clients must use WebSocket (see `websocket.md`).

**Canonical market interval:** 10 seconds. Each committed interval produces one OHLCV candle row. A simulated trading day consists of 72 intervals spanning 12 simulated minutes (09:15:00 – 09:26:50). See `v1/simulation.md` for the complete simulation data model.

**Execution price note:** The authoritative market price used by the Order Execution Service to fill MARKET orders is the **CLOSE of the most recently fully committed 10-second simulation interval**. `last_price` from `GET /market/quote/{symbol}` reflects this value. The exact price used for a given order execution is in the order's `average_price` field and its `executions[].price` — not in the quote endpoint. The frontend displayed price is not authoritative.

---

## 2. Market Status

```
GET /api/v1/market/status
```

**Authentication required:** No (public endpoint — see OD-AUTH-02 in `auth.md`)

**Request:** No body, no query parameters

**Response — 200 OK:**
```json
{
  "data": {
    "status": "OPEN",
    "server_time": "2026-01-01T10:30:00.000Z",
    "next_change_at": "2026-01-01T15:30:00.000Z",
    "message": null,
    "event_status": "RUNNING",
    "simulation_day": 3,
    "configured_total_simulation_days": 5,
    "simulation_time": "09:20:10"
  },
  "request_id": "req_123"
}
```

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `status` | string enum | No | Market status — see states below |
| `server_time` | string (ISO-8601 UTC) | No | Server's current wall-clock time |
| `next_change_at` | string (ISO-8601 UTC) | Yes | Next known state change; null if unknown |
| `message` | string | Yes | Optional operator message (e.g., reason for halt) |
| `event_status` | string enum | No | Current event lifecycle status (`SETUP`, `READY`, `RUNNING`, `PAUSED`, `ENDED`) |
| `simulation_day` | integer | Yes | Current simulation day; null during `SETUP`/`READY` |
| `configured_total_simulation_days` | integer | Yes | Total configured event days; null during `SETUP`/`READY` |
| `simulation_time` | string | Yes | Current simulation time `HH:MM:SS`; null during `SETUP`/`READY` or before simulation starts |

**Market Status States:**

| State | Simulation | Authoritative Price | Participant MARKET Orders |
|-------|-----------|--------------------|-----------------------------|
| `PRE_OPEN` | Not yet started for this day | None (no committed close yet) | Executable if a previous close exists; otherwise rejected |
| `OPEN` | Actively progressing | CLOSE of last fully committed 10-second interval | Always executable |
| `PAUSED` | Frozen | LAST DURABLY COMMITTED CLOSE | Always executable |
| `HALTED` | Frozen | LAST DURABLY COMMITTED CLOSE | Always executable |
| `CLOSED` | Stopped for day | FINAL/LAST DURABLY COMMITTED CLOSE | Always executable |

**Critical rule:** Market status (`PAUSED`, `HALTED`, `CLOSED`) does **NOT** automatically reject valid participant MARKET orders. These states affect simulation progression and the authoritative price source — not order acceptance. See `v1/simulation.md` for the complete execution price model.

**State transitions (valid):**
```
PRE_OPEN → OPEN          (Admin: market open)
OPEN → PAUSED            (Admin: market pause)
PAUSED → OPEN            (Admin: market resume)
OPEN → HALTED            (Admin: market halt)
HALTED → OPEN            (Admin: market resume)
OPEN → CLOSED            (Admin: market close / close-day)
HALTED → CLOSED          (Admin: market close / close-day)
CLOSED → PRE_OPEN        (Admin: next-day)
```

**WebSocket equivalent:** `system.status` event (see `websocket.md`)

---

## 3. List Instruments

```
GET /api/v1/market/instruments
```

**Authentication required:** Yes

**Query Parameters:** None (all instruments returned — count is bounded for this competition environment)

**Response — 200 OK:**
```json
{
  "data": [
    {
      "symbol": "NIFTY",
      "name": "Nifty 50 Index",
      "instrument_type": "INDEX",
      "exchange": "NSE",
      "status": "ACTIVE",
      "tick_size": "0.05",
      "lot_size": 1
    },
    {
      "symbol": "RELIANCE",
      "name": "Reliance Industries Ltd",
      "instrument_type": "EQUITY",
      "exchange": "NSE",
      "status": "ACTIVE",
      "tick_size": "0.05",
      "lot_size": 1
    }
  ],
  "request_id": "req_123"
}
```

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `symbol` | string | No | Unique trading symbol; primary key for instrument |
| `name` | string | No | Human-readable name |
| `instrument_type` | string enum | No | `EQUITY`, `INDEX`, `FUTURES`, `OPTIONS` |
| `exchange` | string | No | e.g., `NSE`, `BSE` |
| `status` | string enum | No | `ACTIVE`, `SUSPENDED`, `DELISTED` |
| `tick_size` | string (decimal) | No | Minimum price movement |
| `lot_size` | integer | No | Minimum tradeable quantity |

Notes:
- Internal database instrument IDs are NOT exposed. `symbol` is the public identifier.
- The list is expected to be small (tens of instruments in a competition environment). No pagination required. If this changes, pagination will be added as a non-breaking change.

---

## 4. Single Instrument

```
GET /api/v1/market/instruments/{symbol}
```

**Authentication required:** Yes

**Path Parameters:**

| Param | Type | Rules |
|-------|------|-------|
| `symbol` | string | Uppercase alphanumeric, e.g., `NIFTY`, `RELIANCE` |

**Response — 200 OK:**
```json
{
  "data": {
    "symbol": "NIFTY",
    "name": "Nifty 50 Index",
    "instrument_type": "INDEX",
    "exchange": "NSE",
    "status": "ACTIVE",
    "tick_size": "0.05",
    "lot_size": 1
  },
  "request_id": "req_123"
}
```

**Error Responses:**

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Symbol not found | 404 | `NOT_FOUND` |

---

## 5. Quote

```
GET /api/v1/market/quote/{symbol}
```

**Authentication required:** Yes

**Path Parameters:**

| Param | Type | Rules |
|-------|------|-------|
| `symbol` | string | Must be a valid instrument symbol |

**Response — 200 OK:**
```json
{
  "data": {
    "symbol": "NIFTY",
    "last_price": "24510.25",
    "open_price": "24100.00",
    "high_price": "24600.00",
    "low_price": "24050.00",
    "close_price": "24200.00",
    "change": "310.25",
    "change_percent": "1.28",
    "volume": 1250000,
    "timestamp": "2026-01-01T10:29:58.123Z"
  },
  "request_id": "req_123"
}
```

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `symbol` | string | No | |
| `last_price` | string (decimal) | No | CLOSE of last fully committed 10-second interval |
| `open_price` | string (decimal) | Yes | First committed close of current session; null before first interval |
| `high_price` | string (decimal) | Yes | Highest committed close of current session |
| `low_price` | string (decimal) | Yes | Lowest committed close of current session |
| `close_price` | string (decimal) | Yes | Previous session's final committed close |
| `change` | string (decimal) | Yes | `last_price - close_price`; null if no previous close |
| `change_percent` | string (decimal) | Yes | `(change / close_price) × 100` |
| `volume` | integer | No | Total simulated volume for current session |
| `timestamp` | string (ISO-8601 UTC) | No | When this quote was last updated |

**Note:** `bid_price` and `ask_price` are not part of the V1 quote schema. This platform has no order book and no participant matching. There are no bid/ask prices to display. Do not generate synthetic bid/ask values.

**Important:** REST quotes are point-in-time. Clients requiring live prices must subscribe via WebSocket `market.quote` events.

**Error Responses:**

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Symbol not found | 404 | `NOT_FOUND` |
| Order Execution Service unavailable | 503 | `SYSTEM_UNAVAILABLE` |

---

## 6. Candles (OHLCV)

```
GET /api/v1/market/candles/{symbol}
```

**Authentication required:** Yes

**Path Parameters:**

| Param | Type | Rules |
|-------|------|-------|
| `symbol` | string | Must be a valid instrument symbol |

**Query Parameters:**

| Param | Type | Required | Default | Rules |
|-------|------|----------|---------|-------|
| `timeframe` | string enum | Yes | — | `10s` (canonical), `1m`, `5m`, `15m`, `1H`, `1D` |
| `from` | string (ISO-8601 UTC) | No | depends | Start of range (inclusive) |
| `to` | string (ISO-8601 UTC) | No | depends | End of range (inclusive) |
| `limit` | integer | No | 100 | Max candles to return; capped at 500 |

**Default behavior when `from`/`to` omitted:**
- If neither provided: returns the most recent `limit` candles up to now.
- If only `from` provided: returns candles from `from` up to `limit` candles or now.
- If only `to` provided: returns `limit` candles ending at `to`.

**Maximum range per timeframe:**

| Timeframe | Max Range | Notes |
|-----------|-----------|-------|
| `10s` | 1 day | Canonical simulation interval |
| `1m` | 7 days | Derived from 10s aggregation |
| `5m` | 30 days | Derived |
| `15m` | 60 days | Derived |
| `1H` | 1 year | Derived |
| `1D` | 5 years | Derived |

Higher timeframes (`1m`, `5m`, etc.) are derived deterministically from the canonical 10-second data. The frontend must not fabricate missing candles.

If the requested range exceeds the max, the server returns an error `VALIDATION_ERROR` with a details field explaining the constraint.

**Example request:**
```
GET /api/v1/market/candles/NIFTY?timeframe=5m&from=2026-01-01T09:00:00Z&to=2026-01-01T10:00:00Z
```

**Response — 200 OK:**
```json
{
  "data": {
    "symbol": "NIFTY",
    "timeframe": "5m",
    "candles": [
      {
        "timestamp": "2026-01-01T09:00:00.000Z",
        "open": "24100.00",
        "high": "24150.25",
        "low": "24090.00",
        "close": "24130.50",
        "volume": 45000,
        "is_complete": true
      },
      {
        "timestamp": "2026-01-01T09:05:00.000Z",
        "open": "24130.50",
        "high": "24200.00",
        "low": "24125.00",
        "close": "24180.75",
        "volume": 52000,
        "is_complete": false
      }
    ]
  },
  "request_id": "req_123"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `symbol` | string | |
| `timeframe` | string | The requested timeframe |
| `candles` | array | Ordered **ascending** by `timestamp` (oldest first) |
| `candles[].timestamp` | string (ISO-8601 UTC) | Start of the candle interval |
| `candles[].open` | string (decimal) | |
| `candles[].high` | string (decimal) | |
| `candles[].low` | string (decimal) | |
| `candles[].close` | string (decimal) | |
| `candles[].volume` | integer | |
| `candles[].is_complete` | boolean | `true` = interval closed, values are final. `false` = interval still open, values may change. |

**Ordering:** Always ascending by `timestamp`. Clients that need descending can reverse client-side.

**Incomplete candles:** The current (live) candle at the end of a range is included with `is_complete: false`. Its OHLCV values are the current in-progress values and will change as more trades occur. When the interval closes, `is_complete` becomes `true` and the values are final.

The WebSocket `market.candle` event uses the same `Candle` type with the same `is_complete` field. The REST and WebSocket candle schemas are identical.

**Error Responses:**

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Symbol not found | 404 | `NOT_FOUND` |
| Invalid timeframe | 400 | `VALIDATION_ERROR` |
| Range too large | 400 | `VALIDATION_ERROR` |
| `from` after `to` | 400 | `VALIDATION_ERROR` |

---

## 7. Resolved Decisions

| ID | Decision | Resolution |
|----|----------|------------|
| OD-MARKET-01 | `is_complete` on candles | **Yes — included in both REST and WebSocket candle responses.** `true` = final; `false` = live interval. |
| OD-MARKET-02 | Auth required on `GET /market/status` | **No auth required.** Public endpoint. Simplifies client bootstrap before login. |

## 8. Bid/Ask — Not in V1

This platform has no order book and no participant matching engine. There are no bid/ask prices to expose.

`bid_price` and `ask_price` fields are **not present** in V1 quote responses or WebSocket quote events. Do not add these fields. Do not generate synthetic spread values.

Any reference to bid/ask in earlier contract drafts is superseded by this rule.

## 9. Remaining Implementation Decisions

| ID | Decision | Notes |
|----|----------|-------|
| OD-MARKET-03 | Bid/ask availability | **Resolved: not in V1.** No bid/ask fields. |
| OD-MARKET-04 | Exact instruments list | Agent 4 database seeding; does not affect API contract |
