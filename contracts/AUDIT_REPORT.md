# Adversarial Audit Report — Warangal Trading Ring API Contract

STATUS: **DRAFT**
Audit date: 2026-09-15
Auditors: Backend, Frontend, Simulation Engine, Database, QA (persona-based review)

---

## Methodology

Every contract file was read in full. Issues are concrete gaps, contradictions, or undefined behaviors — not design preferences. Each issue identifies the affected file(s), the specific gap, and the minimal correction required.

---

## ISSUE 1 — CLOSE order: `quantity` field undefined in FILLED response

**Persona:** Backend / Frontend  
**Files:** `orders.md`, `schemas/order.ts`  
**Severity:** High — Frontend cannot render the FILLED order card for a CLOSE without knowing what was filled.

**Gap:** `orders.md §4.6` states that `quantity` must be absent or null in a CLOSE request. The contract never states what value `quantity`, `filled_quantity`, and `remaining_quantity` carry in the `FILLED` response for a CLOSE order. The `Order` schema has `quantity: number` (non-optional). Frontend receives a FILLED order with no quantity guidance.

**Proposed correction:**

Add to `orders.md §4.6` after the CLOSE request example:

> **CLOSE order FILLED response:** The server populates `quantity` with the position size that was resolved and executed (the full size of the closed position). `filled_quantity` equals `quantity`. `remaining_quantity` is `0`. `side` in the response remains `CLOSE` — it is NOT changed to `BUY` or `SELL`. The `executions[0].quantity` equals the resolved position size.

Add to `schemas/order.ts` on the `quantity` field of `Order`:

```typescript
/**
 * For CLOSE orders: populated with the resolved position size at execution time.
 * Never null in a FILLED response, even for CLOSE orders.
 */
quantity: number;
```

---

## ISSUE 2 — `order.updated` WebSocket event: `side` field undefined for CLOSE orders

**Persona:** Frontend / QA  
**Files:** `websocket.md §7.3`, `schemas/websocket.ts`  
**Severity:** High — Frontend cannot correctly map an `order.updated` event to its local order record if `side` is ambiguous.

**Gap:** The `order.updated` payload is typed as `Order`. For a CLOSE order, the `side` could be `"CLOSE"` (as submitted) or the resolved `"BUY"`/`"SELL"` direction. The contract is silent. The frontend has no way to know whether to render "CLOSE" or the resolved direction.

**Proposed correction:**

Add to `websocket.md §7.3`:

> For CLOSE orders, `side` in the `order.updated` event payload remains `"CLOSE"` — it is not replaced with `"BUY"` or `"SELL"`. The frontend matches the event to the local order by `order_id`/`client_order_id` and uses `side: "CLOSE"` as submitted.

---

## ISSUE 3 — `average_entry_price` recalculation formula undefined for position flip

**Persona:** Backend / Database  
**Files:** `positions.md §6.1`  
**Severity:** High — Agent 2 must implement the accounting formula. Without it, two implementations will produce different `average_entry_price` values.

**Gap:** `positions.md §6.1` describes atomic position cross ("LONG 100 + SELL 150 → SHORT 50") but never defines how `average_entry_price` of the new SHORT position is calculated. Is it the same execution price as the close? That seems correct for an immediate-execution model, but it is not stated.

**Proposed correction:**

Add to `positions.md §6.1`:

> **`average_entry_price` on position flip:** Because V1 is an immediate-execution model with a single authoritative price per order, the new opposing position's `average_entry_price` equals the execution price of the crossing order. Both the closed portion and the new position use the same execution price. There is no weighted-average calculation across multiple fills for the opening portion — it opens at the single execution price.

---

## ISSUE 4 — `news.created` missing from WebSocket subscribe message channel list

**Persona:** Frontend / QA  
**Files:** `websocket.md §5`  
**Severity:** Medium — Frontend will not know to subscribe to `news.created`; it is absent from the subscribe message example.

**Gap:** `websocket.md §5` shows the subscribe message with channels `["market.quote", "market.candle", "order.updated", "position.updated", "portfolio.updated", "leaderboard.updated", "system.status"]`. `news.created` was added to the classification table (§6.1) and event payloads (§7.9) but never added to the subscribe example.

**Proposed correction:**

Update the subscribe message example in `websocket.md §5`:

```json
{
  "type": "subscribe",
  "channels": ["market.quote", "market.candle", "order.updated", "position.updated",
                "portfolio.updated", "leaderboard.updated", "system.status", "news.created"]
}
```

And the subscribed confirmation example to match.

---

## ISSUE 5 — Admin lifecycle error codes absent from `common.ts` ErrorCode union

**Persona:** Backend / QA  
**Files:** `schemas/common.ts`, `v1/errors.md §9`  
**Severity:** Medium — `errors.md §9` defines 15 admin error codes. None exist in `common.ts`. Agent 1 consuming `common.ts` for error handling will not have types for admin errors, producing `any` fallbacks.

**Gap:** `common.ts` ErrorCode union contains only participant-facing codes. Admin-only codes (`EVENT_NOT_READY`, `SIMULATION_ALREADY_RUNNING`, `DATASET_INVALID`, etc.) are defined in `errors.md` and `simulation.ts/AdminErrorCode` but not in `common.ts`.

**Proposed correction:**

Add to `common.ts` ErrorCode (or note that `AdminErrorCode` from `simulation.ts` should be used for admin-endpoint error handling):

```typescript
// Admin lifecycle error codes (returned only by /api/v1/admin/* endpoints)
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

// Combined type for any API error response
export type AnyErrorCode = ErrorCode | AdminErrorCode;
```

Add a note in `errors.md §9` pointing to `schemas/simulation.ts AdminErrorCode` as the TypeScript source.

---

## ISSUE 6 — `ACCOUNT_DISABLED` missing from `POST /orders` error table

**Persona:** Backend / Frontend  
**Files:** `orders.md §4.5`  
**Severity:** Medium — A disabled participant attempting to submit an order receives no documented response code.

**Gap:** `errors.md` defines `ACCOUNT_DISABLED` (HTTP 403). `auth.md` mentions disabled accounts. But `orders.md §4.5` error table has no row for `ACCOUNT_DISABLED`. Agent 2 will either invent behavior or omit the check. Agent 1 won't handle the response.

**Proposed correction:**

Add to `orders.md §4.5` error table:

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Participant account disabled | 403 | `ACCOUNT_DISABLED` |

---

## ISSUE 7 — In-flight PENDING orders at Event END: behavior undefined

**Persona:** Backend / QA  
**Files:** `simulation.md §10.6`, `orders.md`  
**Severity:** Medium — Agent 2 has no instruction on what to do with orders in `PENDING` or `ACCEPTED` state when `event_status` transitions to `ENDED`.

**Gap:** `simulation.md §10.6` states new orders are rejected after ENDED and reads remain available. But it never defines the disposition of orders that were already submitted and are in `PENDING` or `ACCEPTED` state at the moment END is issued. These orders have reserved funds.

**Proposed correction:**

Add to `simulation.md §10.6` after "No recovery from ENDED":

> **In-flight orders at END:** Any order in `PENDING` or `ACCEPTED` state at the moment `event_status` transitions to `ENDED` must be forced to `FAILED` (not `CANCELLED`, since cancellation is a participant action). Reserved funds from those orders are released. A `portfolio.updated` WebSocket event is delivered for each affected participant confirming the fund release. An `order.updated` event with `status: "FAILED"` is delivered for each such order.

---

## ISSUE 8 — Recovery scenario missing: Event ENDED during client session

**Persona:** Frontend  
**Files:** `recovery.md`  
**Severity:** Medium — No guidance for what the frontend does when it receives a `system.status` event with `event_status: "ENDED"` mid-session.

**Gap:** `recovery.md` covers API restart, WebSocket disconnect, token expiry, stale state, and order timeouts. It has no scenario for the event terminating while the client is active.

**Proposed correction:**

Add to `recovery.md` as a new section:

> **Scenario: Event ENDED during active session**
>
> **What the client observes:** A `system.status` WebSocket event with `event_status: "ENDED"`, or a `503 SYSTEM_UNAVAILABLE` with `details.event_status: "ENDED"` on a POST /orders.
>
> **Client behavior:**
> - Display a permanent "trading event has ended" state — not a transient error.
> - Stop attempting to submit orders.
> - Re-fetch `GET /positions`, `GET /portfolio`, `GET /leaderboard` for final state.
> - All read endpoints remain available. Do not hide them.
> - Do NOT retry order submission — ENDED is terminal and retries will continue to fail.

---

## ISSUE 9 — Leaderboard missing `simulation_day` scoping

**Persona:** Frontend / QA  
**Files:** `leaderboard.md`  
**Severity:** Low-Medium — The leaderboard `as_of` field is a wall-clock timestamp. During a multi-day event, the frontend has no way to know which simulation day the snapshot covers.

**Gap:** `leaderboard.md` exposes `as_of` (wall-clock UTC) and `version` but not `simulation_day`. The Admin close-day command is documented to "create a leaderboard snapshot" but the snapshot contract doesn't say which day it represents. An end-of-Day-3 snapshot vs an end-of-Day-4 snapshot are indistinguishable from the public API.

**Proposed correction:**

Add `simulation_day: number` to the leaderboard response object and the `LeaderboardEntry` / `LeaderboardResponse` schema in `schemas/leaderboard.ts`:

```json
{
  "entries": [...],
  "total_participants": 312,
  "simulation_day": 3,
  "as_of": "2026-09-05T10:29:55.000Z",
  "version": 4822
}
```

Add to `leaderboard.md §2`: "`simulation_day` is the simulation day this snapshot represents. For the live running leaderboard, this is the current simulation day."

---

## ISSUE 10 — State diagram in `orders.md §2.1` still contains "market closed" in REJECTED branch text

**Persona:** QA  
**Files:** `orders.md §2.1`  
**Severity:** Low — A direct contradiction with the finalized rule that market status does not cause order rejection.

**Gap:** The ASCII state diagram at `orders.md §2.1` reads:

```
(validation failed:
 market closed, bad
 symbol, insufficient
 funds/position)
```

The prose in §4.3 correctly removes market-closed rejection. The diagram contradicts it.

**Proposed correction:**

Update the diagram text to:

```
(validation failed:
 bad symbol, invalid
 quantity, insufficient
 funds/position, no
 authoritative price)
```

---

## ISSUE 11 — `recovery.md §4` reconnect flow fetches wrong simulation endpoint

**Persona:** Frontend  
**Files:** `recovery.md §4`, `websocket.md §9`  
**Severity:** Low — Inconsistency between the two reconnect flow documents.

**Gap:** `recovery.md §4` lists `GET /market/status` as the reconnect REST fetch. `websocket.md §9` lists `GET /api/v1/market/status` (correct). But neither specifies that the frontend also needs `GET /api/v1/admin/simulation` — which is an Admin-only endpoint. A participant client cannot call that endpoint. The `system.status` WebSocket event is the participant-facing simulation state source after reconnect.

**Proposed correction:**

Update `recovery.md §4` reconnect flow. Replace:

```
GET /market/status
```

With:

```
GET /api/v1/market/status    ← participant-accessible simulation/market state
```

And add a note: "Simulation day and time are carried in the `system.status` WebSocket event and the `GET /market/status` response — participants do not call `GET /api/v1/admin/simulation`."

Update `GET /api/v1/market/status` response in `market.md` to include `simulation_day` and `simulation_time` fields so participants have this context after reconnect.

---

## ISSUE 12 — `GET /api/v1/market/status` response missing simulation context

**Persona:** Frontend / Backend  
**Files:** `market.md §2`  
**Severity:** Medium — Consequence of Issue 11. The participant's primary endpoint for market state carries none of the simulation lifecycle fields that the client needs after reconnect.

**Gap:** `market.md §2` response only contains `status`, `server_time`, `next_change_at`, `message`. It has no `simulation_day`, `simulation_time`, `event_status`, `last_committed_close`, or `configured_total_simulation_days`. After a WebSocket reconnect, the participant frontend must call `GET /market/status` to restore state, but that response doesn't give enough information to render the simulation day display or current price.

**Proposed correction:**

Extend `GET /market/status` response:

```json
{
  "data": {
    "status": "OPEN",
    "server_time": "2026-09-05T09:20:10.000Z",
    "next_change_at": null,
    "message": null,
    "simulation_day": 3,
    "configured_total_simulation_days": 5,
    "simulation_time": "09:20:10",
    "event_status": "RUNNING"
  },
  "request_id": "req_123"
}
```

Add these fields to `MarketStatusResponse` in `schemas/market.ts`:

```typescript
simulation_day: number | null;                  // null during SETUP/READY
configured_total_simulation_days: number | null; // null during SETUP/READY
simulation_time: string | null;                  // HH:MM:SS; null during SETUP/READY
event_status: string;                           // EventStatus from simulation.ts
```

---

## Summary Table

| # | Issue | Severity | Files | Type |
|---|-------|----------|-------|------|
| 1 | CLOSE order FILLED response: quantity field behavior undefined | High | orders.md, order.ts | Missing field definition |
| 2 | order.updated WS: side field for CLOSE undefined | High | websocket.md, websocket.ts | Undefined behavior |
| 3 | average_entry_price recalculation on position flip undefined | High | positions.md | Missing business rule |
| 4 | news.created missing from subscribe channel list | Medium | websocket.md | Contract inconsistency |
| 5 | Admin error codes absent from common.ts | Medium | common.ts, errors.md | Schema gap |
| 6 | ACCOUNT_DISABLED missing from orders error table | Medium | orders.md | Missing error |
| 7 | In-flight orders at Event END undefined | Medium | simulation.md, orders.md | Undefined state |
| 8 | Recovery: Event ENDED scenario missing | Medium | recovery.md | Missing scenario |
| 9 | Leaderboard missing simulation_day context | Low-Med | leaderboard.md, leaderboard.ts | Missing field |
| 10 | State diagram still says "market closed" rejects orders | Low | orders.md | Contradiction |
| 11 | Reconnect flow: wrong simulation endpoint for participants | Low | recovery.md, websocket.md | Incorrect instruction |
| 12 | GET /market/status missing simulation context for reconnect | Medium | market.md, market.ts | Missing fields |

---

## Issues Intentionally Not Raised

- **OD-SHORT-01 (SHORT cash model):** Already documented as an unresolved product decision. Not raised as a new finding.
- **Scheduler timer technology:** Already documented as implementation decision.
- **Exact `lot_size` values per instrument:** Dataset seeding detail, not a contract gap.
- **Leaderboard refresh interval:** Already documented as Agent 2 configuration decision.
- **`PARTIALLY_FILLED` removal:** Intentionally retained for forward-compatibility; documented as such.
