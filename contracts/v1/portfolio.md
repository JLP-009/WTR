# Portfolio API Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Overview

The Portfolio API exposes a participant's complete financial state:
- Cash balances (available, reserved)
- Invested value and portfolio value
- P&L breakdowns (realized, unrealized, daily, total)

**Authority:** The Order Execution Service and accounting system are authoritative. These endpoints serve read-only snapshots. The frontend must NOT derive portfolio values independently.

**Disambiguation:** All financial terms are explicitly defined in section 4. There is no room for interpretation.

---

## 2. Full Portfolio Snapshot

```
GET /api/v1/portfolio
```

**Authentication required:** Yes

**Authorization:** Returns only the authenticated participant's portfolio. No participant identifier in the path — the identity comes from the token.

**Request:** No body, no query parameters.

**Response — 200 OK:**
```json
{
  "data": {
    "participant_id": "TRADER001",
    "balance": {
      "available_cash": "850000.00",
      "reserved_cash": "24510.25",
      "total_cash": "874510.25"
    },
    "invested": {
      "cost_basis": "243500.00",
      "market_value": "245102.50"
    },
    "portfolio_value": "1119612.75",
    "pnl": {
      "unrealized_pnl": "1602.50",
      "realized_pnl": "3500.00",
      "total_pnl": "5102.50",
      "daily_pnl": "1200.00",
      "return_percent": "0.46"
    },
    "updated_at": "2026-01-01T10:30:05.000Z"
  },
  "request_id": "req_123"
}
```

---

## 3. Balance Endpoint

```
GET /api/v1/portfolio/balance
```

**Authentication required:** Yes

Returns the cash balance portion only. Useful for lightweight polling without fetching full portfolio.

**Response — 200 OK:**
```json
{
  "data": {
    "available_cash": "850000.00",
    "reserved_cash": "24510.25",
    "total_cash": "874510.25",
    "updated_at": "2026-01-01T10:30:05.000Z"
  },
  "request_id": "req_123"
}
```

---

## 4. P&L Endpoint

```
GET /api/v1/portfolio/pnl
```

**Authentication required:** Yes

Returns P&L breakdown only.

**Response — 200 OK:**
```json
{
  "data": {
    "unrealized_pnl": "1602.50",
    "realized_pnl": "3500.00",
    "total_pnl": "5102.50",
    "daily_pnl": "1200.00",
    "return_percent": "0.46",
    "updated_at": "2026-01-01T10:30:05.000Z"
  },
  "request_id": "req_123"
}
```

---

## 5. Field Definitions (CRITICAL)

These definitions are unambiguous and binding. Any implementation that deviates from them is non-compliant.

### Balance Fields

| Field | Definition |
|-------|------------|
| `available_cash` | Cash the participant can immediately use to place new orders. Excludes reserved amounts. |
| `reserved_cash` | Cash blocked/locked against accepted BUY orders awaiting execution commit. Cannot be used for new orders until released or converted on fill. |
| `total_cash` | `available_cash + reserved_cash`. Total cash held, regardless of lock state. Does NOT include invested value. |

### Invested Fields

| Field | Definition |
|-------|------------|
| `cost_basis` | Total notional entry value of all currently-held positions. Sum of `(quantity × average_entry_price)` across all open positions, regardless of side. |
| `market_value` | Current market value of all held positions. Sum of `(quantity × current_price)` across all open positions, regardless of side. |

### Portfolio Value

| Field | Definition |
|-------|------------|
| `portfolio_value` | `total_cash + market_value`. The participant's complete estimated net worth in the competition. |

### P&L Fields

| Field | Definition |
|-------|------------|
| `unrealized_pnl` | Aggregate directional gain/loss across all open positions. For each position: LONG unrealized = `(current_price - entry_price) × qty`; SHORT unrealized = `(entry_price - current_price) × qty`. Sum across all positions. |
| `realized_pnl` | Total locked-in profit/loss from all fully or partially exited positions since the start of the competition. Permanent. |
| `total_pnl` | `unrealized_pnl + realized_pnl`. Combined gain/loss from starting capital. |
| `daily_pnl` | P&L generated since the start of the current trading day (session). Resets at session open. |
| `return_percent` | `(total_pnl / starting_capital) × 100`. Overall return as a percentage of initial allocated capital. |

**Starting capital** is the initial balance assigned to each participant at competition start. This value is fixed and stored server-side. The frontend does not need to know it to display `return_percent` — it is computed server-side.

---

## 6. Conceptual Balance Relationship

```
Starting Capital
      │
      ├── available_cash      ← can place new orders
      │
      └── reserved_cash       ← locked against pending orders (BUY or SHORT SELL)
             │
             └── converted to invested_value on FILL
                      │
                      └── converted back to cash on position reduction/close (with P&L)

portfolio_value = total_cash + market_value
                = (available_cash + reserved_cash) + (quantity × current_price for each position)
```

---

## 7. Post-Execution Portfolio Effects

After a successfully `FILLED` order, the portfolio updates as follows. All values are based on the authoritative execution price, not the quote price or any client-estimated price.

**BUY order fills:**
- `available_cash` decreases by `execution_price × quantity`
- `reserved_cash` returns to 0 (reservation converted to fill)
- Position quantity increases
- `cost_basis` increases by `execution_price × quantity`
- `market_value` increases (based on current market price)
- `unrealized_pnl` adjusts accordingly
- `portfolio_value` reflects the new state

**SELL order fills:**
- Position quantity decreases
- `available_cash` increases by `execution_price × quantity`
- `cost_basis` decreases proportionally
- `realized_pnl` increases (or decreases) by the gain/loss on the sold quantity
- `unrealized_pnl` adjusts accordingly
- `portfolio_value` reflects the new state

**Sequence of WebSocket events after a FILL:**
1. `order.updated` with `status: "FILLED"` and `average_price` populated
2. `position.updated` with new quantity and P&L values
3. `portfolio.updated` with updated balances and P&L

The frontend must apply these events and must not display updated values before the events arrive.

---

## 8. Authoritative vs Display Values

| Value | Authority | Frontend responsibility |
|-------|-----------|------------------------|
| `available_cash` | Backend/accounting | Display only |
| `reserved_cash` | Backend/accounting | Display only |
| `unrealized_pnl` | Backend (uses market price) | Display only |
| `realized_pnl` | Backend/accounting | Display only |
| `return_percent` | Backend | Display only |
| `portfolio_value` | Backend | Display only |

The frontend **must not** recompute any of these values from raw position data. The API response is the truth.

---

## 8. Real-Time Updates

Portfolio values change when:
- An order fills (balance, invested value, realized P&L change)
- Market prices move (unrealized P&L, market value change)
- An order is accepted (reserved_cash changes)
- An order is cancelled (reserved_cash released)

Clients should subscribe to WebSocket `portfolio.updated` events for live updates.

On WebSocket reconnect: re-fetch `GET /portfolio` to restore authoritative state.

---

## 9. Error Responses

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Not authenticated | 401 | `AUTHENTICATION_REQUIRED` |
| Order Execution Service data temporarily unavailable | 503 | `SYSTEM_UNAVAILABLE` |

---

## 10. Resolved and Implementation Decisions

| ID | Decision | Resolution |
|----|----------|------------|
| OD-PORT-01 | `daily_pnl` reset point | **Session open** — resets when market transitions to `OPEN` state, not midnight UTC |
| OD-PORT-02 | `starting_capital` in response | Not exposed in v1 — `return_percent` is computed server-side; client does not need starting capital |
| OD-PORT-03 | `portfolio_value` time-series | Not in v1 — non-breaking addition if added later |

## 11. Unresolved: SHORT Position Cash and Margin Model

**OD-SHORT-01 — Cash treatment for SHORT positions**

When a participant opens a SHORT position (SELL while flat or increasing an existing SHORT), the API contract does not yet fully define:

1. **Cash reservation:** Is cash reserved when opening a SHORT? If so, how much (full notional, a percentage, or zero)?
2. **`available_cash` impact:** Does opening a SHORT reduce `available_cash`? A SHORT SELL in a simulation platform does not involve borrowing stock, but may conceptually reserve buying power.
3. **`market_value` treatment for SHORT:** The current definition `quantity × current_price` produces a positive number regardless of side. For a SHORT position, rising `market_value` means increasing losses — does the portfolio summary need a directional `market_value` field or a separate `short_market_value`?
4. **`portfolio_value` with mixed LONG and SHORT:** If a participant holds LONG positions in some symbols and SHORT positions in others, how does `portfolio_value` aggregate? Current definition: `total_cash + market_value`. With SHORT positions, `market_value` may not correctly reflect net exposure.

**Why this is unresolved:** These are financial simulation design decisions that require product authority input. Inventing margin/borrowing rules that don't match the intended simulation model would cause incorrect P&L accounting.

**What agents must NOT do before this is resolved:**
- Agent 2 must not invent a cash reservation formula for SHORT
- Agent 1 must not calculate portfolio value with SHORT positions independently

**Proposed minimum resolution needed from product authority:**
- Does opening a SHORT reserve cash equal to the notional value? (simplest: yes, reserves 100% notional)
- Or is no cash reserved and only buying power is tracked differently?

Until OD-SHORT-01 is resolved, the `INSUFFICIENT_FUNDS` check for SHORT orders and the exact `reserved_cash` / `available_cash` behavior for SHORT are **OPEN**. Agent 2 should block on this decision before implementing SHORT order execution logic.
