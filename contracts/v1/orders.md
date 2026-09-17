# Orders API Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Overview

The Orders API is the most safety-critical component in this system. Wrong behavior here causes duplicate trades, phantom positions, and balance corruption.

### 1.1 V1 Execution Model

**Warangal Trading Ring V1 is not an exchange and does not match orders between participants.**

There is:
- **No order book**
- **No bid/ask participant matching**
- **No waiting for a counterparty**
- **No matching engine**
- **No price-time priority queue**
- **No partial fills under normal operation**

V1 supports **MARKET orders only**.

Every valid MARKET order is executed **immediately** by the Order Execution Service against the **authoritative market price** available to the trading system at the moment of execution. Execution does not depend on another participant submitting a matching order.

**Normal V1 order lifecycle:**

```
PENDING → ACCEPTED → FILLED
```

**Failure paths (exceptional — not normal operation):**

```
PENDING → REJECTED   (validation failure: bad symbol, invalid quantity, insufficient funds/position, CLOSE with no position)
ACCEPTED → FAILED    (execution service unable to obtain price or commit execution)
```

`PARTIALLY_FILLED`, `CANCEL_REQUESTED`, and `CANCELLED` are retained in the state schema for API completeness but are **not expected in normal V1 MARKET order operation**. See section 2 for full definitions.

**Core principles:**

1. A valid MARKET order that passes all validation is expected to be `FILLED` in a single atomic execution.
2. `filled_quantity` will equal `quantity` for every successfully FILLED order.
3. `remaining_quantity` will be `0` for every successfully FILLED order.
4. Execution price comes from the authoritative market price — not from a participant-submitted price or order book.
5. The idempotency mechanism is non-negotiable. Network timeouts must never cause a second execution.
6. Every state transition is defined. There are no ambiguous intermediate states.

---

## 2. Order Lifecycle State Machine

### 2.1 Normal V1 Path

```
[Client submits POST /orders]
          │
          ▼
       PENDING
  (record created; validation
   and execution in progress)
          │
    ┌─────┴─────┐
    ▼           ▼
ACCEPTED     REJECTED (terminal)
(executing   (validation failed:
 immediately) bad symbol, invalid
              quantity, insufficient
              funds/position, no
              authoritative price)
    │
    ▼
 FILLED (terminal)
(complete quantity executed at
 authoritative market price)
```

Under normal operation, the sequence is `PENDING → ACCEPTED → FILLED` with a single execution record covering the entire quantity.

### 2.2 Failure Path

```
ACCEPTED → FAILED (terminal)
```

`FAILED` occurs when the Order Execution Service accepted the order for processing but could not obtain the authoritative market price or could not commit the execution to the database. This is a system/data failure, not a "no counterparty" condition — there is no counterparty concept in V1.

### 2.3 Exceptional States (Not Normal V1 Operation)

The following states exist in the schema for API completeness but are **not produced by normal V1 MARKET order execution**:

| State | Status | When it can occur |
|-------|--------|-------------------|
| `PARTIALLY_FILLED` | Exceptional | Must NOT occur in normal V1 execution; retained for schema forward-compatibility only |
| `CANCEL_REQUESTED` | Exceptional | Only if a cancel request is received while the order is in an in-flight processing state before execution commits; extremely rare |
| `CANCELLED` | Exceptional | Only if the above cancel request succeeds before execution commits |

**There is no matching-engine cancellation queue.** A successfully accepted MARKET order is expected to be FILLED almost immediately. A cancel request on an already-FILLED order returns `409 CONFLICT`.

### 2.4 Complete State Table

| State | Terminal? | Normal V1 path? | Description |
|-------|-----------|-----------------|-------------|
| `PENDING` | No | Yes | Order record created; validation and execution processing in progress |
| `ACCEPTED` | No | Yes | Order passed validation; execution committed to Order Execution Service |
| `FILLED` | Yes | Yes | Complete quantity executed at authoritative market price |
| `REJECTED` | Yes | Failure path | Order rejected during validation (bad symbol, invalid quantity, insufficient funds/position, CLOSE with no position) |
| `FAILED` | Yes | Failure path | Order Execution Service could not obtain price or commit execution |
| `PARTIALLY_FILLED` | No | **No — not normal** | Partial execution; must not occur in normal V1 operation |
| `CANCEL_REQUESTED` | No | **No — not normal** | Cancel requested while order in exceptional in-flight state |
| `CANCELLED` | Yes | **No — not normal** | Order cancelled before execution committed |

**Invalid transitions** (must never occur):
- `FILLED` → any state
- `CANCELLED` → any state
- `REJECTED` → any state
- `FAILED` → any state
- `PENDING` → `PARTIALLY_FILLED` (must pass through `ACCEPTED`)
- `FILLED` → `CANCELLED` (already executed — cannot cancel)

---

## 3. Order Types

V1 supports **MARKET orders only**. LIMIT orders are not supported in v1.

| Type | Description |
|------|-------------|
| `MARKET` | Execute immediately at the authoritative market price obtained by the Order Execution Service |

The participant does not submit a price. The execution price is determined server-side from authoritative market data at the moment of execution. There is no bid/ask spread matching, no order book, and no counterparty involved.

---

## 4. Submit Order

```
POST /api/v1/orders
```

**Authentication required:** Yes

**Idempotency required:** Yes (`Idempotency-Key` header or `client_order_id`)

### 4.1 Request Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
X-Request-ID: req_abc123        (optional, for logging)
Idempotency-Key: idk_xyz789     (recommended)
```

### 4.2 Request Body

```json
{
  "client_order_id": "my-order-uuid-001",
  "symbol": "NIFTY",
  "side": "BUY",
  "quantity": 10,
  "order_type": "MARKET"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `client_order_id` | string | Yes | `[a-zA-Z0-9_-]`, max 64 chars; unique per participant |
| `symbol` | string | Yes | Must be a valid, active instrument symbol |
| `side` | string enum | Yes | `BUY`, `SELL`, or `CLOSE` — see §4.6 |
| `quantity` | integer | Conditional | Required for `BUY` and `SELL`; **must be omitted or null for `CLOSE`** |
| `order_type` | string enum | Yes | `MARKET` |

### 4.3 Validation Rules

The API validates in this order before creating any order record:

1. Authentication token valid
2. `client_order_id` format valid
3. `symbol` exists and is `ACTIVE`
4. `side` is `BUY`, `SELL`, or `CLOSE`
5. For `BUY`/`SELL`: `quantity` > 0 and is a multiple of instrument `lot_size`
6. For `CLOSE`: `quantity` field must be absent or null; participant must have an open position in this symbol
7. `order_type` is supported
8. For `BUY`: available cash ≥ estimated order value (reserve check at API layer)
9. For `SELL` opening or increasing a SHORT: available cash ≥ estimated margin requirement (see OD-SHORT-01)
10. For `SELL` reducing or closing a LONG: participant holds sufficient LONG position quantity
11. Authoritative committed price exists (fails only on Day 1 PRE_OPEN before first interval is committed)
12. `event_status ≠ ENDED` (terminal — all orders rejected)

If any check fails, the order record is **not created** and an error is returned immediately. No order reaches the Order Execution Service unless all checks pass.

**Market status and order acceptance:**

The market session status (`OPEN`, `CLOSED`, `PAUSED`, etc.) is informational. A `CLOSED` market status does **not** automatically reject participant MARKET orders. Orders may execute against the latest authoritative simulated market price available at execution time regardless of session status.

The market status check has been removed from validation. The `MARKET_CLOSED` error code is retained for administrative operations that specifically require the market to be in `OPEN` state, but it is not returned for standard participant MARKET order submissions.

### 4.4 Success Response — 201 CREATED

The HTTP response for a successfully submitted order carries the **initial order state** at the moment the API responds. Because execution is asynchronous relative to the HTTP response (the API creates the order record and initiates execution, but the HTTP 201 is returned before execution commits), the response will typically show `PENDING`.

**HTTP 201 response (what the API returns immediately):**
```json
{
  "data": {
    "order_id": "ord_01ARZ3...",
    "client_order_id": "client-123",
    "symbol": "RELIANCE",
    "side": "BUY",
    "quantity": 10,
    "filled_quantity": 0,
    "remaining_quantity": 10,
    "order_type": "MARKET",
    "status": "PENDING",
    "average_price": null,
    "created_at": "2026-09-05T06:30:00.000Z",
    "updated_at": "2026-09-05T06:30:00.000Z"
  },
  "request_id": "req_abc123"
}
```

**The authoritative completed order state (what `GET /orders/{id}` returns after execution):**
```json
{
  "data": {
    "order_id": "ord_01ARZ3...",
    "client_order_id": "client-123",
    "symbol": "RELIANCE",
    "side": "BUY",
    "quantity": 10,
    "filled_quantity": 10,
    "remaining_quantity": 0,
    "order_type": "MARKET",
    "status": "FILLED",
    "average_price": "1452.30",
    "executions": [
      {
        "execution_id": "exe_01ABC...",
        "quantity": 10,
        "price": "1452.30",
        "executed_at": "2026-09-05T06:30:00.123Z"
      }
    ],
    "created_at": "2026-09-05T06:30:00.000Z",
    "updated_at": "2026-09-05T06:30:00.123Z"
  },
  "request_id": "req_abc123"
}
```

**Execution invariants for a successfully FILLED V1 MARKET order:**
- `status` = `FILLED`
- `filled_quantity` = `quantity` (complete fill)
- `remaining_quantity` = `0`
- `average_price` is not null
- `executions` contains exactly one execution record covering the full quantity
- Execution price is the authoritative market price at time of execution

**The 201 response's `status: "PENDING"` does NOT mean the trade is done.** The client must await the WebSocket `order.updated` event with `status: "FILLED"` or poll `GET /orders/{id}` for the authoritative completed state.

### 4.5 Error Responses

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Missing/invalid token | 401 | `AUTHENTICATION_REQUIRED` |
| Participant account disabled | 403 | `ACCOUNT_DISABLED` |
| Validation failure | 400 | `VALIDATION_ERROR` |
| Symbol not found or inactive | 400 | `INVALID_ORDER` |
| Insufficient funds for BUY or SHORT open | 400 | `INSUFFICIENT_FUNDS` |
| Insufficient LONG position for directional SELL | 400 | `INSUFFICIENT_POSITION` |
| CLOSE with no open position | 400 | `NO_OPEN_POSITION` |
| No committed simulation price exists (Day 1 PRE_OPEN) | 400 | `NO_AUTHORITATIVE_PRICE` |
| Event has ended (terminal) | 503 | `SYSTEM_UNAVAILABLE` (with `event_status: "ENDED"` in details) |
| Duplicate `client_order_id` | 409 | `DUPLICATE_REQUEST` |
| Duplicate `Idempotency-Key` (same payload) | 200 (replayed) | — |
| Duplicate `Idempotency-Key` (different payload) | 409 | `CONFLICT` |
| Service unavailable | 503 | `SYSTEM_UNAVAILABLE` |

**Note:** `MARKET_CLOSED` is no longer returned for standard participant MARKET order submissions. Market session status does not block order execution in V1. See §4.3.

### 4.6 CLOSE Order

`CLOSE` is a semantic order action that closes the participant's entire open position in the given symbol. The participant does not specify a quantity — the system determines it from the current position.

| Current position | CLOSE executes as |
|-----------------|-------------------|
| LONG Q | MARKET SELL Q |
| SHORT Q | MARKET BUY Q |
| Flat (no position) | Rejected — `NO_OPEN_POSITION` |

**CLOSE request example:**
```json
{
  "client_order_id": "close-nifty-001",
  "symbol": "NIFTY",
  "side": "CLOSE",
  "order_type": "MARKET"
}
```

`quantity` must be absent or null for `CLOSE` orders. The API resolves quantity from the participant's authoritative position at execution time.

**CLOSE order FILLED response:** The server populates `quantity` with the position size resolved and executed (the full size of the closed position at execution time). `filled_quantity` equals `quantity`. `remaining_quantity` is `0`. `side` in the response remains `"CLOSE"` — it is not changed to `"BUY"` or `"SELL"`. `executions[0].quantity` equals the resolved position size.

CLOSE is idempotent in intent but NOT in execution — if the position has already been closed, a subsequent CLOSE returns `NO_OPEN_POSITION`. Use `client_order_id` and `Idempotency-Key` as usual for retry safety.

### 4.7 Order Side vs Position Side — Transition Semantics

`side` (`BUY`/`SELL`) describes the order direction. The resulting position `side` (`LONG`/`SHORT`) depends on the current net position. These are distinct concepts.

| Current position | Order | Resulting position |
|-----------------|-------|-------------------|
| Flat | BUY Q | LONG Q |
| Flat | SELL Q | SHORT Q |
| LONG Q | BUY X | LONG (Q + X) |
| LONG Q | SELL X (X < Q) | LONG (Q − X) |
| LONG Q | SELL Q | Flat |
| LONG Q | SELL X (X > Q) | SHORT (X − Q) — atomic cross |
| SHORT Q | SELL X | SHORT (Q + X) |
| SHORT Q | BUY X (X < Q) | SHORT (Q − X) |
| SHORT Q | BUY Q | Flat |
| SHORT Q | BUY X (X > Q) | LONG (X − Q) — atomic cross |

**Atomic cross:** When a SELL exceeds the current LONG (or a BUY exceeds the current SHORT), the entire order is executed in a single execution record. The existing position is closed and a new opposing position is opened in one atomic operation. The realized P&L from the closed portion is locked in. The API reflects only the final net position.
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": {
      "fields": [
        { "field": "quantity", "reason": "Must be a positive integer." }
      ]
    }
  },
  "request_id": "req_abc123"
}
```

---

## 5. Idempotency (CRITICAL)

### 5.1 Two Mechanisms and Their Distinct Purposes

**`Idempotency-Key` header** (strongly recommended):
- Client-provided unique string per submission *attempt* (not per order — see below).
- Scope: per participant. Two different participants may use the same key independently.
- Stored by backend for 24 hours (implementation detail for Agent 2, but the behavioral guarantee is fixed by this contract).
- **Purpose: safe retry.** When the client doesn't know if the server received the request, it retries with the same key. The server replays the original response without creating a new order.
- Format: `[a-zA-Z0-9_-]`, max 128 chars. Recommended: UUID v4.

**`client_order_id` field** (always required):
- Always present in the request body.
- Scope: unique per participant across all time (not just per session).
- **Purpose: stable order identity.** Once an order exists with this ID, any further `POST /orders` with the same ID signals a duplicate submission.
- Unlike `Idempotency-Key`, it does NOT replay the original response — it returns `409 DUPLICATE_REQUEST`.
- The client uses `GET /orders?client_order_id=<id>` to retrieve the existing order.
- Format: `[a-zA-Z0-9_-]`, max 64 chars. Recommended: UUID v4.

**Key difference:** Use `Idempotency-Key` for safe retry of a single attempt. Use `client_order_id` as the stable business identity of an order. Both must be included on every submission.

### 5.2 Behavior Matrix

| Scenario | `Idempotency-Key` | `client_order_id` | Server behavior |
|----------|-------------------|-------------------|-----------------|
| A. First submission | fresh key | fresh ID | Create order → `201` |
| B. Same key + same payload (retry) | same | same | Replay original `201` — **no new order created** |
| C. Same key + different payload | same | different | `409 CONFLICT` — signals client programming error |
| D. Different key + same `client_order_id` | different | same | `409 DUPLICATE_REQUEST` — order already exists |
| E. Network timeout (no response received) | same | same | Retry with same key+ID → scenario B |
| F. HTTP 500 received | same | same | Retry with same key+ID; if key stored → scenario B; if not → may be new attempt |
| G. HTTP 503 received | same | same | Retry with same key+ID and backoff; backend uses key to deduplicate |
| H. Execution result unknown | — | — | Use `GET /orders?client_order_id=<id>` to check state — **do not submit new order** |

### 5.3 Retry Flow (Timeout Example)

```
Client sends POST /orders
  + Idempotency-Key: idk_uuid-abc
  + client_order_id: ord-uuid-001
        │
        v
No response received (network timeout)
        │
        v
Client waits 2+ seconds (backoff)
        │
        v
Client retries POST /orders
  + Idempotency-Key: idk_uuid-abc   ← SAME KEY — mandatory
  + client_order_id: ord-uuid-001   ← SAME ID — mandatory
        │
        v
Possible outcomes:
  ├── 201 (replayed)       → order exists; read data.status
  ├── 409 DUPLICATE_REQUEST → order exists; GET /orders?client_order_id=ord-uuid-001
  └── 503                  → backend still unavailable; retry with backoff
```

**The client must NOT generate a new `client_order_id` for the same intended trade until the previous one is confirmed terminal.**

### 5.4 HTTP 500 Recovery

A `500 INTERNAL_ERROR` response may or may not indicate that the order was persisted before the error occurred.

The client must treat HTTP 500 the same as a timeout:
1. Retry with the same `Idempotency-Key` and `client_order_id`.
2. If the key was stored before the error: `201` replayed — no duplicate.
3. If the key was not stored: a new order may be created. This is an acceptable risk at the backend level and must be handled by the backend's internal idempotency store. Agent 2 must write the idempotency key atomically with order creation.

### 5.5 HTTP 503 Recovery

A `503 SYSTEM_UNAVAILABLE` response guarantees the order was NOT created (the system was unavailable before processing). The client may safely retry with the same `Idempotency-Key` and `client_order_id` after the `Retry-After` window.

### 5.6 Key Expiry

Idempotency keys expire after 24 hours. After expiry, the same key is treated as a fresh request. The client must not reuse keys across sessions or retry windows that exceed 24 hours. Using UUID v4 as keys prevents accidental reuse.

---

## 6. List Orders

```
GET /api/v1/orders
```

**Authentication required:** Yes

**Authorization:** Returns only orders belonging to the authenticated participant.

**Query Parameters:**

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `status` | string enum | No | (all) | Filter by status |
| `symbol` | string | No | (all) | Filter by symbol |
| `client_order_id` | string | No | — | Lookup by client-generated ID |
| `cursor` | string | No | — | Pagination cursor |
| `limit` | integer | No | 50 | Max 200 |

**Response — 200 OK:**
```json
{
  "data": [
    {
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
      "created_at": "2026-01-01T10:30:00.123Z",
      "updated_at": "2026-01-01T10:30:01.456Z"
    }
  ],
  "next_cursor": null,
  "request_id": "req_123"
}
```

**Ordering:** Descending by `created_at` (most recent first). This is fixed for v1.

---

## 7. Get Single Order

```
GET /api/v1/orders/{order_id}
```

**Authentication required:** Yes

**Authorization:** Participant can only fetch their own orders. If `order_id` belongs to another participant: `404 NOT_FOUND` (not 403 — do not reveal existence of other participants' orders).

**Path Parameters:**

| Param | Type |
|-------|------|
| `order_id` | string — `ord_<id>` format |

**Response — 200 OK (normal FILLED order):**
```json
{
  "data": {
    "order_id": "ord_01ARZ3...",
    "client_order_id": "client-123",
    "symbol": "RELIANCE",
    "side": "BUY",
    "quantity": 10,
    "filled_quantity": 10,
    "remaining_quantity": 0,
    "order_type": "MARKET",
    "status": "FILLED",
    "average_price": "1452.30",
    "executions": [
      {
        "execution_id": "exe_01ABC...",
        "quantity": 10,
        "price": "1452.30",
        "executed_at": "2026-09-05T06:30:00.123Z"
      }
    ],
    "created_at": "2026-09-05T06:30:00.000Z",
    "updated_at": "2026-09-05T06:30:00.123Z"
  },
  "request_id": "req_123"
}
```

For a successfully FILLED V1 MARKET order: `filled_quantity` = `quantity`, `remaining_quantity` = `0`, `executions` contains exactly one record covering the full quantity. The execution price is the authoritative market price at time of execution.

`executions` is present in `GET /orders/{id}` responses. It is absent from `GET /orders` list responses.

**Error Responses:**

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Not found or wrong participant | 404 | `NOT_FOUND` |

---

## 8. Cancel Order

```
POST /api/v1/orders/{order_id}/cancel
```

**Authentication required:** Yes

**Authorization:** Participant can only cancel their own orders.

**Request body:** Empty `{}`

**V1 cancellation behavior:**

Because V1 MARKET orders are executed immediately, a successfully accepted order is expected to be `FILLED` within milliseconds. **In normal operation, there is nothing to cancel** — by the time a cancel request arrives, the order has already executed.

The cancel endpoint is retained for API completeness and to handle exceptional processing edge cases. Its behavior:

- If the order is already in a terminal state (`FILLED`, `REJECTED`, `FAILED`, `CANCELLED`): returns `409 CONFLICT`.
- If the order is in an exceptional in-flight processing state (not yet committed): the cancel request is accepted and the order may transition to `CANCELLED`.
- There is no matching-engine queue to remove the order from. There is no waiting for a counterparty.
- The cancel endpoint must NOT be used expecting to cancel an order before it matches — matching does not exist in V1.

**Success Response — 200 OK:**
```json
{
  "data": {
    "order_id": "ord_01ARZ3...",
    "status": "CANCEL_REQUESTED",
    "updated_at": "2026-01-01T10:31:00.000Z"
  },
  "request_id": "req_123"
}
```

**Error Responses:**

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Order not found or wrong participant | 404 | `NOT_FOUND` |
| Order already in terminal state (including FILLED) | 409 | `CONFLICT` |
| Order already `CANCEL_REQUESTED` | 200 | (idempotent; returns current state) |

---

## 9. Order Submission and Execution Semantics

This is the most important distinction in the entire API. It must be enforced by the frontend without exception.

### 9.1 Stage-by-Stage Breakdown

The following stages are distinct. Each step has a specific meaning. No step implies the one after it.

| Step | What happened | Observable signal |
|------|--------------|-------------------|
| 1. **HTTP request received** | TCP delivered the request to the server | TCP ACK (transport level only) |
| 2. **Request accepted** | HTTP 201 returned | HTTP 201 with `status: "PENDING"` |
| 3. **Order PENDING** | Order record created; validation and execution dispatch in progress | `data.status == "PENDING"` in 201 response |
| 4. **Order ACCEPTED** | Validation passed; Order Execution Service is executing immediately | `order.updated` WS event with `status: "ACCEPTED"` or `GET /orders/{id}` |
| 5. **Execution in progress** | Order Execution Service obtaining authoritative market price and committing | No distinct API signal; order remains `ACCEPTED` briefly |
| 6. **FILLED** | Complete quantity executed at authoritative market price; committed to database | `order.updated` WS event with `status: "FILLED"` (terminal) |
| 7. **REJECTED** | Order rejected during validation (bad inputs, insufficient funds/position, CLOSE with no position) | `400` error on POST, or `order.updated` WS event with `status: "REJECTED"` (terminal) |
| 8. **FAILED** | Order Execution Service could not obtain price or commit execution | `order.updated` WS event with `status: "FAILED"` (terminal) |
| 9. **Unknown result** | Client received no HTTP response (timeout, network failure) | No response received; must use idempotency recovery |

Steps 4–6 happen rapidly in sequence under normal operation. The expected observable path is:

```
POST /orders → 201 (PENDING) → WS order.updated (ACCEPTED) → WS order.updated (FILLED)
```

Steps outside the normal path (REJECTED, FAILED, Unknown) are covered in section 5 and `recovery.md`.

**Note:** `PARTIALLY_FILLED`, `CANCEL_REQUESTED`, and `CANCELLED` are not shown above because they are not expected in normal V1 operation. They exist in the schema for API forward-compatibility only.

### 9.2 Prohibited Frontend Inferences

**The frontend must NEVER:**
- Display "trade executed" on receiving HTTP 201 (step 2 only — execution has not yet committed)
- Assume available balance has changed until a `portfolio.updated` WebSocket event is received
- Assume position has changed until a `position.updated` WebSocket event is received
- Assume `FAILED` means funds are still available until `portfolio.updated` confirms the reservation was released
- Submit a new order because the first one's result is unknown (step 9) — use idempotency recovery

### 9.3 Execution Confirmation Sources (in priority order)

1. `GET /orders/{order_id}` with `status: "FILLED"` — **authoritative**
2. WebSocket `order.updated` event with `status: "FILLED"` — **authoritative when received**
3. WebSocket `portfolio.updated` event — **confirms financial impact**
4. HTTP 201 response — **not execution confirmation**

---

## 10. Financial Reservation

When a `BUY` order is accepted:
- The API reserves (`blocks`) an estimated cash amount from `available_cash` before forwarding to the Order Execution Service.
- `reserved_cash` increases correspondingly.
- This prevents overselling cash before execution commits.

When a `SELL` order is accepted:
- The API reserves the position units.

When an order is `FILLED`:
- Reservation is converted to the actual executed trade value at the authoritative market price.
- `portfolio.updated` and `position.updated` WebSocket events confirm the change.

When an order is `CANCELLED`, `REJECTED`, or `FAILED`:
- Reservation is released back to `available_cash`.
- A `portfolio.updated` WebSocket event is delivered to confirm the release.
- The frontend must not assume funds are available until this event is received.

The API exposes the result via `portfolio.available_cash` and `portfolio.reserved_cash`.

---

## 11. Resolved Decisions

The following were previously open. They are now resolved for v1.

| ID | Decision | Resolution | Rationale |
|----|----------|------------|-----------|
| OD-ORDER-01 | LIMIT order type support | **No** — MARKET only in v1 | Scope control; LIMIT adds significant state and validation complexity |
| OD-ORDER-02 | Funds check location | **API layer** — immediate `400 INSUFFICIENT_FUNDS` before order is created | Faster feedback; avoids orders reaching `REJECTED` state for preventable reasons |
| OD-ORDER-04 | Execution embedding | **Embedded** in `GET /orders/{id}` | Simpler for Agent 1; breaking to change later — locked in |

## 12. Remaining Implementation Decisions

These do not affect the public API contract. They are for Agent 2.

| ID | Decision | Default | Notes |
|----|----------|---------|-------|
| OD-ORDER-03 | Idempotency key TTL | 24 hours | Agent 2 internal; contract behavior is defined in section 5.6 |
| OD-ORDER-05 | Maximum order quantity | Per trading rules | Results in `VALIDATION_ERROR` with `details.fields`; exact limit is competition configuration |
