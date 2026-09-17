# Recovery Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Purpose

This document defines what clients can observe and what behavior they must implement during system failures, reconnections, and ambiguous states.

It does NOT define infrastructure recovery. It defines client-visible behavior.

---

## 2. Guiding Principle

> When in doubt, prefer explicit failure over silent success.

A client that is uncertain whether an order was placed must NOT blindly submit another. A client that loses WebSocket must NOT assume its local state is current. A client that receives a timeout must NOT assume the operation did or did not succeed.

---

## 3. Scenario: API Restart

**What the client observes:**
- HTTP requests return `503 SYSTEM_UNAVAILABLE` or time out during restart window.
- After restart, the API returns normally.

**Client behavior:**
- Retry with exponential backoff (start at 1s, max 30s).
- Do NOT assume any POST that timed out during restart was applied.
- On reconnect, re-fetch state: `GET /portfolio`, `GET /positions`, `GET /orders`.
- For any order submitted during the outage: check `GET /orders?client_order_id=<id>` to confirm whether it exists.

---

## 4. Scenario: WebSocket Disconnection

**What the client observes:**
- WebSocket connection closes (code 1000, 1001, 1011, or network drop).

**Client behavior:**
```
Disconnect detected
      │
      v
Stop processing stale local state
      │
      v
Retry connection with exponential backoff
(1s → 2s → 4s → 8s → max 30s)
      │
      v
Reconnect: send auth message
      │
      v
Re-subscribe to channels
      │
      v
Fetch authoritative REST state:
  GET /api/v1/market/status    ← simulation day, time, event_status, market_status
  GET /api/v1/orders?status=PENDING,ACCEPTED,PARTIALLY_FILLED,CANCEL_REQUESTED
  GET /api/v1/positions
  GET /api/v1/portfolio
  GET /api/v1/leaderboard      (if displayed)
      │
      v
Resume applying incremental WebSocket events
```

Note: participants do NOT call `GET /api/v1/admin/simulation` — that endpoint requires Admin role. Simulation day and simulation time are available in `GET /api/v1/market/status`.

Missed events are NOT replayed (v1). REST re-fetch is the reconciliation mechanism.

---

## 5. Scenario: Order Execution Service Unavailable

**What the client observes:**
- `POST /orders` returns `503 SYSTEM_UNAVAILABLE`
- Orders submitted during the outage are not processed
- `GET /orders/{id}` may return `ACCEPTED` or `PENDING` without transitioning to `FILLED`

**Important:** Because V1 executes orders immediately, a `503` on `POST /orders` means the order was NOT created — the service was unavailable before processing. The client can safely retry after `Retry-After`.

For orders that were in flight when the outage began (status `ACCEPTED` but no `FILLED` event received):
- Poll `GET /orders/{id}` every 5–10 seconds during outage.
- On service recovery: `order.updated` WebSocket events will deliver the final state.
- Do NOT submit a new order while an existing order is in a non-terminal state.

---

## 6. Scenario: Database Temporarily Unavailable

**What the client observes:**
- Read endpoints (`GET /orders`, `GET /positions`, `GET /portfolio`) return `503`.
- Write endpoints (`POST /orders`) return `503`.

**Client behavior:**
- Same as API restart scenario.
- Do NOT treat cached UI values as authoritative during DB outage.
- On recovery, re-fetch all state.

---

## 7. Scenario: Order Submission Timeout

**This is the highest-risk scenario in V1.** Because orders execute immediately, a timeout after submission means the order may already have been fully executed and the `FILLED` state committed to the database — the client simply did not receive the response.

```
Client sends POST /orders
  + Idempotency-Key: idk_xyz789
  + client_order_id: my-order-001
        │
        v
[Network timeout — response never received]
        │
        v
The server may have:
  (a) never received the request → order does not exist
  (b) received and executed the order → order is FILLED in database
  (c) received but failed mid-execution → order is FAILED

The client cannot tell which occurred.
```

**Correct client behavior:**
1. Wait for the backoff window (minimum 2 seconds).
2. Retry `POST /orders` with the **same** `Idempotency-Key` and `client_order_id`.
3. Possible outcomes:
   - `201` returned with `status: "FILLED"` → order was already executed; this is the replayed response. No new order was created.
   - `201` returned with `status: "PENDING"` → order is now in progress; await `order.updated` WebSocket event.
   - `409 DUPLICATE_REQUEST` → order exists; fetch via `GET /orders?client_order_id=my-order-001`.
   - `503` → backend still unavailable; retry with backoff.
4. Do NOT generate a new `client_order_id` for the same intended trade.
5. Do NOT submit a parallel order for the same instrument while the first is unresolved.

**Why this is safe:** The idempotency key guarantees that even if the first request executed and committed a `FILLED` order, the retry returns the original response without triggering a second execution. The participant's cash was debited once, their position updated once.

**Wrong client behavior (must be avoided):**
- Generating a fresh `client_order_id` after a timeout — this creates a second order.
- Assuming timeout means the order failed — it may already be FILLED.
- Assuming timeout means the order succeeded — it may not have been received.

---

## 8. Scenario: Unknown Order Execution Result

After a network issue, the client may not know if an order has filled.

**Detection:**
- Order is in state `ACCEPTED` or `PENDING` but no `order.updated` WebSocket event was received.

**Correct client behavior:**
1. Poll `GET /orders/{order_id}` periodically (every 3–5 seconds).
2. Wait for terminal state: `FILLED`, `CANCELLED`, `REJECTED`, `FAILED`.
3. Do NOT assume the order state from WebSocket events alone during an outage.

---

## 9. Scenario: Token Expiry During Session

**What the client observes:**
- HTTP request returns `401 AUTHENTICATION_REQUIRED`.
- WebSocket closes with code `4001`.

**Client behavior:**
```
On HTTP 401:
  POST /auth/refresh
    ├── Success → retry original request with new token
    └── Failure → force logout + redirect to login

On WebSocket 4001:
  POST /auth/refresh
    ├── Success → reconnect WebSocket with new token
    └── Failure → force logout + redirect to login
```

---

## 10. Scenario: Stale Client State

**Condition:** Client's local UI state diverges from server state (e.g., due to missed WebSocket events, long session, or reconnect).

**Detection:**
- `sequence` gap in WebSocket events.
- Long period without any WebSocket event (>60 seconds during OPEN market).
- User reports incorrect balance or position display.

**Correct client behavior:**
- On any detected sequence gap: immediately re-fetch `GET /portfolio` and `GET /positions`.
- Implement a periodic full-state refresh (suggested: every 5 minutes) as a background safety net, regardless of WebSocket health.
- Never display locally cached values as current if WebSocket has been disconnected for more than 30 seconds without reconnect.

---

## 11. Scenario: Duplicate WebSocket Events

**Condition:** The same event is received more than once (at-least-once delivery).

**Client behavior:**
- Maintain an in-memory set of recently seen `event_id` values.
- On receiving an event: check if `event_id` is in the set.
  - If yes: discard event silently.
  - If no: process event and add `event_id` to set.
- The set does not need to survive reconnect; REST re-fetch on reconnect handles reconciliation.

---

## 12. State Ownership Summary

| State | Authority | Client should re-fetch after disruption? |
|-------|-----------|------------------------------------------|
| Order list/status | Backend (durable) | Yes |
| Position data | Backend/accounting (durable) | Yes |
| Portfolio/balance | Backend/accounting (durable) | Yes |
| Market status | Order Execution Service | Yes |
| Quote prices | Market data system (live) | Yes (or resume WebSocket) |
| Leaderboard | Derived read model | Yes |
| UI display state | Frontend | N/A (derive from above) |
| WebSocket session | Gateway | Reconnect and re-auth |

---

## 12a. Scenario: Event ENDED During Active Session

**What the client observes:**
- A `system.status` WebSocket event with `event_status: "ENDED"`.
- Or a `503 SYSTEM_UNAVAILABLE` with `details.event_status: "ENDED"` on `POST /orders`.
- Or `GET /api/v1/market/status` returns `event_status: "ENDED"` after reconnect.

**Client behavior:**
- Display a permanent "trading event has ended" state — not a transient error.
- Stop attempting to submit orders. Do NOT retry — ENDED is terminal.
- Re-fetch `GET /positions`, `GET /portfolio`, `GET /leaderboard` for final state.
- All read endpoints remain available indefinitely after ENDED.
- Any orders in `PENDING`/`ACCEPTED` state at ENDED will arrive as `order.updated` with `status: "FAILED"` — apply them and release locally reserved balances on receipt of `portfolio.updated`.

---

## 13. What Clients Must NOT Do

| Prohibited behavior | Reason |
|---------------------|--------|
| Treat HTTP 201 on order as execution confirmation | 201 carries `PENDING` state; execution commits asynchronously after the HTTP response |
| Display balance changes before `portfolio.updated` WebSocket event | Balance is authoritative server-side |
| Submit a new order after a timeout without retrying with same Idempotency-Key | Causes duplicate execution; original order may already be FILLED |
| Reconstruct P&L or portfolio value from local calculations | Risk of divergence from server truth |
| Ignore `sequence` gaps in WebSocket | Leads to stale state |
| Continue displaying cached position data after 30s+ WebSocket disconnection | Data may be outdated by fills |
| Submit cancel request expecting to cancel an in-flight matching process | There is no matching process; orders execute immediately |
