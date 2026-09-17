# Admin API Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Overview

The Admin API controls all lifecycle operations: event management, simulation control, market state, news, participant management, monitoring, and audit.

**Authorization:** All Admin endpoints require server-side authentication with Admin role. A participant-level token on any Admin endpoint returns `403 FORBIDDEN`. Admin credentials must never be embedded in frontend JavaScript.

**Idempotency:** All state-changing Admin commands accept an `Idempotency-Key` header. Same key + same command = same result. Same key + different command/payload = `409 CONFLICT`. This prevents duplicate state transitions from network retries.

**Concurrency:** Concurrent Admin commands serialize against authoritative persisted state. Browser state is never authoritative. Two simultaneous commands produce a deterministic ordering — one commits first, the next evaluates against the resulting state.

**Responses:** State-changing endpoints return the authoritative resulting state — not just `{"success": true}`.

---

## 2. Event Management

### 2.1 Get Event State

```
GET /api/v1/admin/event
```

**Response — 200 OK:**
```json
{
  "data": {
    "event_id": "evt_01ARZ...",
    "event_status": "RUNNING",
    "simulation_status": "RUNNING",
    "day_status": "OPEN",
    "market_status": "OPEN",
    "simulation_day": 3,
    "configured_total_simulation_days": 5,
    "days_remaining": 2,
    "simulation_time": "09:20:10",
    "cursor": {
      "dataset_id": "ds_01ARZ...",
      "dataset_version": "1.0.0",
      "simulation_day": 3,
      "interval_index": 25,
      "simulated_time": "09:20:10"
    },
    "last_committed_close": "105.25",
    "event_symbol_count": 12,
    "dataset_id": "ds_01ARZ...",
    "updated_at": "2026-09-05T10:23:45.000Z"
  },
  "request_id": "req_123"
}
```

### 2.2 Start Event

```
POST /api/v1/admin/event/start
```

**Preconditions:**
- `event_status = READY`
- Configuration validated
- Dataset validated and checksummed

**Request body:** `{}` (optionally with Idempotency-Key header)

**Returns:** Full event state (see §2.1 response shape)

**Errors:**

| Condition | Code |
|-----------|------|
| Event not in READY state | `EVENT_NOT_READY` |
| Configuration not complete | `EVENT_CONFIGURATION_INCOMPLETE` |
| Dataset not valid | `DATASET_NOT_READY` |

### 2.3 Pause Event

```
POST /api/v1/admin/event/pause
```

**Preconditions:** `event_status = RUNNING`

Pauses all activity — simulation, market, and participant order processing.

### 2.4 Resume Event

```
POST /api/v1/admin/event/resume
```

**Preconditions:** `event_status = PAUSED`

### 2.5 End Event

```
POST /api/v1/admin/event/end
```

**Preconditions:** `event_status = RUNNING` or `PAUSED`

Terminal operation. Sets `event_status = ENDED`. Finalizes leaderboard. No recovery.

**Errors:**

| Condition | Code |
|-----------|------|
| Event already ended | `EVENT_ALREADY_ENDED` |

---

## 3. Event Configuration

### 3.1 Get Configuration

```
GET /api/v1/admin/event/config
```

**Response — 200 OK:**
```json
{
  "data": {
    "dataset_id": "ds_01ARZ...",
    "dataset_total_days": 20,
    "dataset_symbol_count": 40,
    "configured_total_simulation_days": 5,
    "event_symbol_count": 12,
    "event_symbols": ["NIFTY", "BANKNIFTY", "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "LT", "ITC", "AXISBANK", "MARUTI"],
    "data_interval_seconds": 10,
    "simulated_day_duration_minutes": 12,
    "simulated_day_duration_seconds": 720,
    "intervals_per_day": 72,
    "simulation_speed": 1,
    "rows_per_day": 864,
    "expected_total_event_rows": 4320,
    "config_locked": false,
    "dataset_checksum": "sha256:abc123...",
    "dataset_validation_status": "VALID"
  },
  "request_id": "req_123"
}
```

### 3.2 Set Configuration

```
PUT /api/v1/admin/event/config
```

**Precondition:** `event_status = SETUP` (configuration is not locked)

**Request body:**
```json
{
  "dataset_id": "ds_01ARZ...",
  "total_simulation_days": 5,
  "symbols": ["NIFTY", "BANKNIFTY", "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "LT", "ITC", "AXISBANK", "MARUTI"],
  "simulation_speed": 1
}
```

The backend validates and derives `event_symbol_count`, `rows_per_day`, `expected_total_event_rows`. It does NOT trust a client-submitted `symbol_count`.

**Errors:**

| Condition | Code |
|-----------|------|
| Configuration locked (already started) | `EVENT_CONFIGURATION_LOCKED` |
| `total_simulation_days > dataset_total_days` | `VALIDATION_ERROR` |
| Unknown symbol | `VALIDATION_ERROR` |
| Symbol not in dataset | `DATASET_NOT_READY` |
| Duplicate symbol | `VALIDATION_ERROR` |
| Data completeness failure | `DATASET_INVALID` |

---

## 4. Simulation Control

### 4.1 Get Simulation State

```
GET /api/v1/admin/simulation
```

**Response — 200 OK:**
```json
{
  "data": {
    "simulation_status": "RUNNING",
    "simulation_day": 3,
    "simulation_time": "09:20:10",
    "interval_index": 25,
    "next_interval": "09:20:20",
    "intervals_remaining_today": 46,
    "simulation_speed": 1,
    "real_seconds_per_interval": 1.0,
    "cursor": {
      "simulation_day": 3,
      "interval_index": 25,
      "simulated_time": "09:20:10"
    },
    "last_commit_at": "2026-09-05T10:23:45.000Z"
  },
  "request_id": "req_123"
}
```

### 4.2 Start Simulation

```
POST /api/v1/admin/simulation/start
```

**Preconditions:** `event_status = RUNNING`, `simulation_status = STOPPED`, `day_status = PRE_OPEN`

**Errors:**

| Condition | Code |
|-----------|------|
| Simulation already running | `SIMULATION_ALREADY_RUNNING` |

### 4.3 Pause Simulation

```
POST /api/v1/admin/simulation/pause
```

**Preconditions:** `simulation_status = RUNNING`

**Errors:**

| Condition | Code |
|-----------|------|
| Simulation not running | `SIMULATION_NOT_RUNNING` |

### 4.4 Resume Simulation

```
POST /api/v1/admin/simulation/resume
```

Continues from next unconsumed interval. Does not catch up on elapsed wall-clock time.

**Preconditions:** `simulation_status = PAUSED`

### 4.5 Close Day

```
POST /api/v1/admin/simulation/close-day
```

**Preconditions:** `simulation_status = RUNNING` or `PAUSED`, `day_status = OPEN`

**Errors:**

| Condition | Code |
|-----------|------|
| Day already closed | `DAY_ALREADY_CLOSED` |

Returns full state including final committed close and leaderboard snapshot confirmation.

### 4.6 Next Day

```
POST /api/v1/admin/simulation/next-day
```

**Preconditions:** `day_status = CLOSED`, `simulation_day < configured_total_simulation_days`

**Errors:**

| Condition | Code |
|-----------|------|
| Day not closed | `DAY_NOT_CLOSED` |
| No next day available | `NO_NEXT_DAY` |

Returns state with new `simulation_day`, `day_status = PRE_OPEN`, `market_status = PRE_OPEN`.

---

## 5. Market Control

### 5.1 Get Market State

```
GET /api/v1/admin/market
```

**Response — 200 OK:**
```json
{
  "data": {
    "market_status": "OPEN",
    "day_status": "OPEN",
    "last_committed_close_by_symbol": {
      "NIFTY": "105.25",
      "RELIANCE": "1452.30"
    },
    "last_committed_at": "2026-09-05T10:23:45.000Z",
    "simulation_time": "09:20:10"
  },
  "request_id": "req_123"
}
```

### 5.2 Open Market

```
POST /api/v1/admin/market/open
```

**Preconditions:** `market_status = PRE_OPEN`, `event_status = RUNNING`

**Errors:**

| Condition | Code |
|-----------|------|
| Market already open | `MARKET_ALREADY_OPEN` |
| Invalid state | `INVALID_STATE_TRANSITION` |

### 5.3 Pause Market

```
POST /api/v1/admin/market/pause
```

**Preconditions:** `market_status = OPEN`

### 5.4 Resume Market

```
POST /api/v1/admin/market/resume
```

**Preconditions:** `market_status = PAUSED` or `HALTED`

### 5.5 Halt Market

```
POST /api/v1/admin/market/halt
```

**Preconditions:** `market_status = OPEN`

Immediately halts simulation progression. Does NOT reject participant orders.

**Errors:**

| Condition | Code |
|-----------|------|
| Market already halted | `MARKET_ALREADY_HALTED` |

### 5.6 Close Market

```
POST /api/v1/admin/market/close
```

**Preconditions:** `market_status = OPEN` or `HALTED`

Triggers day-close sequence. Equivalent to `close-day`.

---

## 6. News and Announcements

### 6.1 Get News (Admin)

```
GET /api/v1/admin/news
```

Returns all news items with full metadata including delivery status.

**Query Parameters:**

| Param | Type | Notes |
|-------|------|-------|
| `cursor` | string | Pagination cursor |
| `limit` | integer | Default 50, max 200 |

### 6.2 Create News

```
POST /api/v1/admin/news
```

**Request body:**
```json
{
  "type": "CRITICAL",
  "title": "Market Volatility Alert",
  "body": "Significant price movement expected in NIFTY.",
  "audience": "ALL_PARTICIPANTS"
}
```

| Field | Type | Values |
|-------|------|--------|
| `type` | string enum | `INFO`, `WARNING`, `CRITICAL`, `MARKET_UPDATE`, `EVENT_UPDATE` |
| `title` | string | Required, max 200 chars |
| `body` | string | Required, max 2000 chars |
| `audience` | string enum | `ALL_PARTICIPANTS` (V1 only value) |

**Response — 201 Created:**
```json
{
  "data": {
    "news_id": "news_01ARZ...",
    "type": "CRITICAL",
    "title": "Market Volatility Alert",
    "body": "Significant price movement expected in NIFTY.",
    "audience": "ALL_PARTICIPANTS",
    "created_by": "admin_01ARZ...",
    "created_at": "2026-09-05T10:25:00.000Z"
  },
  "request_id": "req_123"
}
```

News creation is durable. A `news.created` WebSocket event is broadcast to all authenticated participants. Creating news does NOT automatically change market state (HALT must be a separate command).

---

## 7. Participant Management

### 7.1 List Participants

```
GET /api/v1/admin/participants
```

**Query Parameters:** `cursor`, `limit`, `status` filter (`ACTIVE`, `DISABLED`)

### 7.2 Get Participant

```
GET /api/v1/admin/participants/{participant_id}
```

Returns participant details, current balance, P&L, position summary, and order history link.

### 7.3 Enable Participant

```
POST /api/v1/admin/participants/{participant_id}/enable
```

### 7.4 Disable Participant

```
POST /api/v1/admin/participants/{participant_id}/disable
```

Disabled participants cannot submit orders (`ACCOUNT_DISABLED` error). Existing open positions remain until CLOSE.

**Admin cannot:**
- Modify participant balance
- Modify participant P&L
- Modify trade prices or quantities
- Force-execute trades
- Change position quantities

---

## 8. Monitoring

### 8.1 System Overview

```
GET /api/v1/admin/monitoring/system
```

**Response includes:**
```json
{
  "data": {
    "event_status": "RUNNING",
    "simulation_status": "RUNNING",
    "market_status": "OPEN",
    "day_status": "OPEN",
    "simulation_day": 3,
    "simulation_time": "09:20:10",
    "last_interval_commit_at": "2026-09-05T10:23:45.123Z",
    "intervals_committed_today": 25,
    "cursor_healthy": true,
    "database_healthy": true,
    "websocket_healthy": true,
    "dataset_id": "ds_01ARZ...",
    "dataset_checksum": "sha256:abc123...",
    "total_participants": 312,
    "active_participants": 298,
    "orders_today": 1847,
    "errors_last_hour": 0
  },
  "request_id": "req_123"
}
```

### 8.2 Orders Monitor

```
GET /api/v1/admin/monitoring/orders
```

Returns recent orders across all participants with status, execution price, quantity, symbol, and timestamps.

**Query Parameters:** `cursor`, `limit`, `symbol`, `status`, `participant_id`

### 8.3 Positions Monitor

```
GET /api/v1/admin/monitoring/positions
```

Returns current positions across all participants with quantity, average entry price, unrealized P&L.

### 8.4 Leaderboard Monitor

```
GET /api/v1/admin/monitoring/leaderboard
```

Returns current leaderboard state (same as participant `GET /api/v1/leaderboard` but available to Admin at all times).

---

## 9. Audit Log

```
GET /api/v1/admin/audit
```

**Query Parameters:** `cursor`, `limit`, `action`, `actor`, `from`, `to`

**Response — 200 OK:**
```json
{
  "data": [
    {
      "audit_id": "aud_01ARZ...",
      "actor_id": "admin_01ARZ...",
      "action": "MARKET_HALTED",
      "target": "market",
      "previous_state": { "market_status": "OPEN" },
      "new_state": { "market_status": "HALTED" },
      "request_id": "req_abc123",
      "idempotency_key": "idk_xyz789",
      "reason": "Suspicious price movement",
      "metadata": {},
      "timestamp": "2026-09-05T10:25:00.000Z"
    }
  ],
  "next_cursor": "cursor_abc...",
  "request_id": "req_123"
}
```

**Audited actions:**
- `EVENT_STARTED`, `EVENT_PAUSED`, `EVENT_RESUMED`, `EVENT_ENDED`
- `SIMULATION_STARTED`, `SIMULATION_PAUSED`, `SIMULATION_RESUMED`
- `DAY_CLOSED`, `NEXT_DAY`
- `MARKET_OPENED`, `MARKET_PAUSED`, `MARKET_RESUMED`, `MARKET_HALTED`, `MARKET_CLOSED`
- `DATASET_SELECTED`, `EVENT_CONFIG_CHANGED`
- `PARTICIPANT_ENABLED`, `PARTICIPANT_DISABLED`
- `NEWS_CREATED`
- `SYSTEM_ERROR`, `DATA_ERROR`, `INTERVAL_COMMIT_FAILED`

Audit logs are append-only from the Admin interface.

---

## 10. Admin Response Shape

All state-changing Admin endpoints return the full authoritative state:

```json
{
  "data": {
    "event_id": "evt_01ARZ...",
    "event_status": "RUNNING",
    "simulation_status": "RUNNING",
    "day_status": "OPEN",
    "market_status": "OPEN",
    "simulation_day": 1,
    "simulation_time": "09:15:00",
    "cursor": { ... },
    "authoritative_price_by_symbol": { "NIFTY": "100.10" },
    "updated_at": "2026-09-05T09:15:00.000Z"
  },
  "request_id": "req_123"
}
```

---

## 11. Admin Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `EVENT_NOT_READY` | 409 | Event is not in READY state |
| `EVENT_ALREADY_STARTED` | 409 | Event already started |
| `EVENT_ALREADY_ENDED` | 409 | Event is ENDED — terminal |
| `EVENT_CONFIGURATION_LOCKED` | 409 | Configuration cannot be changed after start |
| `EVENT_CONFIGURATION_INCOMPLETE` | 409 | Required configuration missing |
| `SIMULATION_ALREADY_RUNNING` | 409 | Simulation is already running |
| `SIMULATION_NOT_RUNNING` | 409 | Simulation is not running |
| `DAY_NOT_CLOSED` | 409 | Current day must be closed first |
| `DAY_ALREADY_CLOSED` | 409 | Day is already closed |
| `NO_NEXT_DAY` | 409 | All configured days have been completed |
| `MARKET_ALREADY_OPEN` | 409 | Market is already open |
| `MARKET_ALREADY_HALTED` | 409 | Market is already halted |
| `INVALID_STATE_TRANSITION` | 409 | Requested transition is not valid from current state |
| `DATASET_NOT_READY` | 409 | Dataset not loaded or not validated |
| `DATASET_INVALID` | 409 | Dataset fails validation |
