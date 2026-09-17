# Positions API Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Overview

A position represents a participant's current net holding in a specific instrument.

**Authority:** The Order Execution Service and the accounting system are the authoritative source of position data. The API exposes positions as read-only. Positions are never directly mutated by the client — they change only as a result of order executions committed by the Order Execution Service.

**Unrealized P&L** is computed server-side using current market price. The frontend must NOT independently calculate it.

### 1.1 Position Model

V1 supports **LONG and SHORT** positions.

A participant holds exactly **one net position per symbol** at any time. There are no simultaneous LONG + SHORT hedges for the same symbol.

| Field | Value |
|-------|-------|
| `side` | `LONG` or `SHORT` |
| `quantity` | Positive integer — absolute size of the position |

`quantity` is always ≥ 0 and always positive. It is never negative. The `side` field distinguishes direction.

**Flat (no position):** When a position is fully exited, `quantity` becomes 0. Zero-quantity positions are returned only when `include_zero=true`.

### 1.2 Order Side vs Position Side

These are distinct concepts. The order `side` field (`BUY` or `SELL`) describes the executed order direction. The position `side` field (`LONG` or `SHORT`) describes the resulting net position direction.

| Scenario | Order side | Resulting position side |
|----------|-----------|------------------------|
| Open from flat | `BUY` | `LONG` |
| Open from flat | `SELL` | `SHORT` |
| Add to existing long | `BUY` | `LONG` (larger) |
| Reduce existing long | `SELL` | `LONG` (smaller) or flat |
| Close long, open short | `SELL` (qty > long) | `SHORT` |
| Add to existing short | `SELL` | `SHORT` (larger) |
| Reduce existing short | `BUY` | `SHORT` (smaller) or flat |
| Close short, open long | `BUY` (qty > short) | `LONG` |

`BUY` does not always mean "open LONG." `SELL` does not always mean "open SHORT."

---

## 2. List All Positions

```
GET /api/v1/positions
```

**Authentication required:** Yes

**Authorization:** Returns only positions belonging to the authenticated participant. No query parameter can expose another participant's positions.

**Query Parameters:**

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `include_zero` | boolean | No | `false` | Whether to include positions with zero quantity |

**Response — 200 OK (LONG position example):**
```json
{
  "data": [
    {
      "symbol": "NIFTY",
      "side": "LONG",
      "quantity": 10,
      "average_entry_price": "24350.00",
      "current_price": "24510.25",
      "market_value": "245102.50",
      "cost_basis": "243500.00",
      "unrealized_pnl": "1602.50",
      "unrealized_pnl_percent": "0.66",
      "realized_pnl": "500.00",
      "updated_at": "2026-01-01T10:30:01.456Z"
    }
  ],
  "request_id": "req_123"
}
```

**Response — 200 OK (SHORT position example):**
```json
{
  "data": [
    {
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
      "updated_at": "2026-01-01T10:31:00.000Z"
    }
  ],
  "request_id": "req_123"
}
```

No pagination — position count is bounded by instrument count (small in this competition). If the instrument set grows significantly, cursor pagination will be added as a non-breaking change.

---

## 3. Single Position

```
GET /api/v1/positions/{symbol}
```

**Authentication required:** Yes

**Authorization:** Only the authenticated participant's position for this symbol.

**Path Parameters:**

| Param | Type |
|-------|------|
| `symbol` | string — uppercase instrument symbol |

**Response — 200 OK:**
```json
{
  "data": {
    "symbol": "NIFTY",
    "side": "LONG",
    "quantity": 10,
    "average_entry_price": "24350.00",
    "current_price": "24510.25",
    "market_value": "245102.50",
    "cost_basis": "243500.00",
    "unrealized_pnl": "1602.50",
    "unrealized_pnl_percent": "0.66",
    "realized_pnl": "500.00",
    "updated_at": "2026-01-01T10:30:01.456Z"
  },
  "request_id": "req_123"
}
```

**If the participant holds no position in this symbol:**
`404 NOT_FOUND` is returned. A zero-quantity position object is not returned for a symbol the participant has never held.

If the participant previously held a position and has fully exited, call `GET /positions?include_zero=true` to retrieve the zero-quantity record with its `realized_pnl`.

---

## 4. Field Definitions

| Field | Type | Nullable | Definition |
|-------|------|----------|------------|
| `symbol` | string | No | Instrument symbol |
| `side` | string enum | No | `LONG` or `SHORT` — direction of the net position |
| `quantity` | integer | No | Absolute size of the position (always ≥ 0; positive integer; never negative) |
| `average_entry_price` | string (decimal) | No | Volume-weighted average price at which the current position was entered |
| `current_price` | string (decimal) | No | Last market price used to compute unrealized P&L |
| `market_value` | string (decimal) | No | `quantity × current_price` (always positive regardless of side) |
| `cost_basis` | string (decimal) | No | `quantity × average_entry_price` (always positive regardless of side) |
| `unrealized_pnl` | string (decimal) | No | Directional gain/loss — see P&L semantics below |
| `unrealized_pnl_percent` | string (decimal) | No | `(unrealized_pnl / cost_basis) × 100` |
| `realized_pnl` | string (decimal) | No | P&L locked in from closed portions of this position; per-symbol scope |
| `updated_at` | string (ISO-8601 UTC) | No | Timestamp of last position update |

**All decimal values are strings — see `conventions.md` section 2.**

### 4.1 Field Name Change Note

The field was previously named `average_buy_price` in earlier contract drafts. It is now `average_entry_price` to correctly represent both LONG and SHORT positions, since SHORT positions are entered via SELL orders, not BUY orders.

**Agent 2 (Backend):** Use `average_entry_price` in all responses.
**Agent 1 (Frontend):** Use `average_entry_price` in all display and API calls.

---

## 5. P&L Semantics

### 5.1 LONG Position

```
unrealized_pnl = (current_price - average_entry_price) × quantity
```

A LONG position gains when price rises.

Example:
- Entry: 24350.00 × 10 units → cost_basis = 243500.00
- Current: 24510.25 × 10 units → market_value = 245102.50
- unrealized_pnl = 245102.50 − 243500.00 = +1602.50

### 5.2 SHORT Position

```
unrealized_pnl = (average_entry_price - current_price) × quantity
```

A SHORT position gains when price falls.

Example:
- Entry: 1480.00 × 50 units → cost_basis = 74000.00
- Current: 1460.00 × 50 units → market_value = 73000.00
- unrealized_pnl = 74000.00 − 73000.00 = +1000.00

### 5.3 Authoritative Computation

Both formulas are computed server-side. The frontend must display the value returned by the API — it must NOT recompute P&L independently.

`current_price` in the position response may lag slightly behind the WebSocket quote stream. The authoritative P&L snapshot is what the REST API returns.

### 5.4 Realized P&L Direction

Realized P&L follows the same directional semantics:

- Closing a LONG position above entry price → positive realized P&L
- Closing a LONG position below entry price → negative realized P&L
- Closing a SHORT position below entry price → positive realized P&L
- Closing a SHORT position above entry price → negative realized P&L

---

## 6. State Transition Matrix

The following documents how each order affects the net position. All transitions are atomic.

| Current position | Order | Result |
|-----------------|-------|--------|
| Flat | BUY 100 | LONG 100 |
| Flat | SELL 100 | SHORT 100 |
| LONG 100 | BUY 50 | LONG 150 |
| LONG 100 | SELL 40 | LONG 60 |
| LONG 100 | SELL 100 | Flat |
| LONG 100 | SELL 150 | SHORT 50 (cross — see §6.1) |
| SHORT 100 | SELL 50 | SHORT 150 |
| SHORT 100 | BUY 40 | SHORT 60 |
| SHORT 100 | BUY 100 | Flat |
| SHORT 100 | BUY 150 | LONG 50 (cross — see §6.1) |
| Flat | CLOSE | REJECTED — no open position |
| LONG 100 | CLOSE | Flat (executes as MARKET SELL 100) |
| SHORT 100 | CLOSE | Flat (executes as MARKET BUY 100) |

### 6.1 Position-Crossing Orders (Atomic)

When a SELL order quantity exceeds the current LONG position, or a BUY order quantity exceeds the current SHORT position, the execution is **atomic**:

1. The existing position is fully closed.
2. A new position on the opposite side is opened for the remainder.
3. The API reflects the final net position only.
4. Realized P&L from the closed portion is locked in.
5. A single execution record covers the entire order quantity.

**`average_entry_price` on position flip:** Because V1 executes at a single authoritative price per order, the new opposing position's `average_entry_price` equals the execution price of the crossing order. Both the close and the open use the same execution price. There is no weighted-average calculation — the new position opens at exactly the execution price.

Example — LONG 100 + SELL 150 at price 105.25:
- Closes LONG 100 → realizes P&L on 100 units at 105.25
- Opens SHORT 50 with `average_entry_price = "105.25"`
- Resulting position: `{ "side": "SHORT", "quantity": 50, "average_entry_price": "105.25" }`
- Single execution: `{ "quantity": 150, "price": "105.25" }`

---

## 7. Zero-Quantity Positions

Positions with `quantity = 0` represent instruments where the participant previously held a position but has fully exited.

- By default, excluded from `GET /positions`.
- Pass `?include_zero=true` to include them (useful for P&L history review).
- `realized_pnl` on a zero-quantity position represents the total locked-in gain/loss from that instrument.
- `side` on a zero-quantity position reflects the most recently held side before exit.

---

## 8. Real-Time Updates

Position data changes as orders fill. Clients requiring live position updates must subscribe to WebSocket `position.updated` events.

Recommended pattern:
1. Fetch initial state via `GET /positions` on login.
2. Apply incremental updates from `position.updated` WebSocket events.
3. On WebSocket reconnect: re-fetch `GET /positions` to resync authoritative state.

---

## 9. Error Responses

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Not authenticated | 401 | `AUTHENTICATION_REQUIRED` |
| Symbol not found (instrument) | 404 | `NOT_FOUND` |
| No position for symbol | 404 | `NOT_FOUND` |

---

## 10. Resolved Decisions

| ID | Decision | Resolution |
|----|----------|------------|
| OD-POS-01 | Response when participant has no position for a symbol | **404 NOT_FOUND** |
| OD-POS-02 | SHORT positions | **Supported in v1.** Both `LONG` and `SHORT` are valid position sides. |
| OD-POS-03 | `realized_pnl` scope | **Per symbol** — total locked-in P&L for that instrument across competition history |
| OD-POS-04 | Quantity representation for SHORT | **Always positive integer.** `side: "SHORT"` carries the direction. Negative quantities are forbidden. |
| OD-POS-05 | Field rename | `average_buy_price` renamed to `average_entry_price` to support both LONG and SHORT. Breaking change. |
