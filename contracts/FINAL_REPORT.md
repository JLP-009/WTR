# API V1 — Immediate Execution Model — Final Report

STATUS: **DRAFT — READY FOR ARCHITECTURE REVIEW**
Version: **v1**
Hardening pass: 3 (Immediate Execution Model)

---

## 1. Files Modified in This Pass

| File | Changes |
|------|---------|
| contracts/README.md | Added platform description, execution model, architecture overview, renamed Market Engine → Order Execution Service |
| contracts/conventions.md | Added §14 V1 Execution Model Convention table; fixed rounding attribution; removed stale OPEN DECISION label |
| contracts/v1/orders.md | Full rewrite of §1 (overview), §2 (state machine), §3 (order types), §4.3 (validation), §4.4 (success response), §8 (cancel), §9 (execution semantics), §10 (reservation) |
| contracts/v1/recovery.md | Rewrote §5 (execution service unavailable), §7 (timeout — order may already be FILLED), §12 (state ownership), §13 (prohibited behaviors) |
| contracts/v1/websocket.md | Added order.updated progression note for immediate execution |
| contracts/v1/market.md | Fixed overview, bid/ask section, error table, removed Market Engine terminology |
| contracts/v1/portfolio.md | Added §7 post-fill effects (BUY/SELL portfolio impact, WebSocket event sequence); resolved OD-PORT-01/02/03 |
| contracts/v1/positions.md | Fixed authority line |
| contracts/v1/errors.md | Fixed SYSTEM_UNAVAILABLE description |
| contracts/v1/auth.md | Fixed authorization table entry |
| contracts/schemas/order.ts | Full rewrite — immediate execution model, annotated non-normal states, execution invariant comments |
| contracts/schemas/websocket.ts | Fixed QuoteEventPayload comment |

Files NOT modified (already consistent): portfolio.ts, position.ts, market.ts, leaderboard.ts, leaderboard.md, auth.ts, common.ts, websocket.ts (body), positions.md (body)

---

## 2. Exact Changes Made

### orders.md — §1 Overview
**Before:** Generic "core principles" with "Market Engine" references and no execution model statement.
**After:** Explicit V1 execution model section. States: no order book, no matching engine, no counterparty, no partial fills in normal operation. Normal lifecycle: `PENDING → ACCEPTED → FILLED`. PARTIALLY_FILLED/CANCEL_REQUESTED/CANCELLED annotated as exceptional-only.

### orders.md — §2 State Machine
**Before:** Diagram showing PARTIALLY_FILLED as a normal branch; CANCEL_REQUESTED as a normal path; "forwarded to Market Engine" language.
**After:** Diagram shows `PENDING → ACCEPTED → FILLED` as the primary path. Failure paths (`REJECTED`, `FAILED`) are clearly separated. Exceptional states table explicitly marks PARTIALLY_FILLED, CANCEL_REQUESTED, CANCELLED as "Not Normal V1 path."

### orders.md — §3 Order Types
**Before:** "Execute immediately at best available price" (implies matching).
**After:** "Execute immediately at the authoritative market price obtained by the Order Execution Service. No bid/ask spread matching, no order book, no counterparty."

### orders.md — §4.3 Validation
**Before:** Exception note saying funds check "may be evaluated by the Market Engine."
**After:** Removed. Funds check is at API layer (previously resolved). All nine checks happen at the API before any order record is created.

### orders.md — §4.4 Success Response
**Before:** Single example showing PENDING with `filled_quantity: 0`. Warning that PENDING doesn't mean execution.
**After:** Two examples: (1) the HTTP 201 response (PENDING, as the API actually returns), (2) the authoritative FILLED state (from GET /orders/{id} after execution). Execution invariants stated explicitly: `filled_quantity = quantity`, `remaining_quantity = 0`, one execution record, `average_price` not null.

### orders.md — §7 GET Single Order
**Before:** Example showed `status: "PARTIALLY_FILLED"` with half-fill.
**After:** Example shows `status: "FILLED"` with complete fill, single execution record. Normal V1 state.

### orders.md — §8 Cancel Order
**Before:** Described cancel as a routine racing operation against the engine.
**After:** Explicitly states: in normal V1 operation there is nothing to cancel — order is already FILLED. Cancel endpoint retained for exceptional processing edge cases only. No matching queue. Cancel on FILLED order returns 409.

### orders.md — §9 Execution Semantics
**Before:** Twelve-step table including "Market Engine is matching the order" (step 5) and PARTIALLY_FILLED (step 6).
**After:** Nine-step table with steps 4–6 showing ACCEPTED → execution in progress (no matching) → FILLED. Note that PARTIALLY_FILLED/CANCEL_REQUESTED/CANCELLED steps are absent (not normal V1). Clear prohibited frontend inferences.

### orders.md — §10 Financial Reservation
**Before:** "system reserves" without attribution; implied Market Engine handled reservation release.
**After:** API reserves before forwarding to Order Execution Service. Reservation released on CANCELLED, REJECTED, or FAILED. Portfolio.updated confirms release.

### recovery.md — §5
**Before:** "Market Engine Unavailable" — implied engine was a matching system that queued orders.
**After:** "Order Execution Service Unavailable" — 503 on POST means order was NOT created. Simpler: no queue, no forwarded-but-unprocessed orders to worry about.

### recovery.md — §7 Timeout
**Before:** Described timeout as "client doesn't know if server received request."
**After:** Explicit: because execution is immediate, timeout means the order may already be FULLY EXECUTED and FILLED in the database. The idempotency replay returns the original FILLED response. No second execution occurs.

### market.md
**Before:** "Market data is derived from the Market Engine" (first sentence). Bid/ask described as "order book" data.
**After:** "Market data is sourced from the trading system's market data feed." Added execution price note: the price in executions[].price is the authoritative fill price, not the quote. Bid/ask explicitly labeled as informational market data from external source, not participant order book depth.

### portfolio.md — New §7 Post-Execution Effects
**Added:** BUY fill effects (cash decrease, position increase, cost basis update). SELL fill effects (position decrease, cash increase, realized P&L update). WebSocket event sequence after fill: order.updated → position.updated → portfolio.updated.

### README.md
**Before:** Brief purpose statement; referred to "Market Engine (execution)" in agent responsibilities.
**After:** Full platform description at the top — "not an exchange," immediate execution, no order book. Architecture overview diagram. Agent responsibilities updated: "Order Execution Service (external)" instead of "Market Engine."

### conventions.md — §14 (new)
**Added:** V1 Execution Model Convention table stating all properties: MARKET only, immediate execution, no order book, no matching engine, no counterparty, no partial fills in normal operation. Terminology: "Order Execution Service" used consistently across all contracts.

### schemas/order.ts
**Before:** OrderStatus comments said "forwarded to Market Engine"; PARTIALLY_FILLED had no disclaimer; no execution invariants documented.
**After:** File header states V1 is not an exchange. OrderStatus type has full JSDoc with normal path, failure paths, and exceptional states. PARTIALLY_FILLED, CANCEL_REQUESTED, CANCELLED marked "NOT NORMAL IN V1." Order.quantity, filled_quantity, remaining_quantity have comments stating invariants for FILLED orders. average_price comment states it is the authoritative market price, not a participant-submitted or order-book price.

---

## 3. Final V1 Order Lifecycle

```
POST /orders (with Idempotency-Key + client_order_id)
        │
        v
API validates: auth, symbol, side, quantity, order_type,
               market OPEN, BUY cash check, SELL position check
        │
  ┌─────┴─────┐
  ▼           ▼
REJECTED    Order record created → status: PENDING
(immediate  HTTP 201 returned to client (status: PENDING)
 400 error)         │
                    ▼
             Order Execution Service obtains authoritative market price
             and executes immediately
                    │
              ┌─────┴─────┐
              ▼           ▼
           FILLED       FAILED
           (normal)     (system failure — price unavailable
                         or DB commit failed)
```

**FILLED order invariants:**
- `status = "FILLED"`
- `filled_quantity = quantity`
- `remaining_quantity = 0`
- `average_price` = authoritative market price at execution (non-null, DecimalString)
- `executions` contains exactly one record covering the full quantity
- WebSocket events: order.updated (FILLED) → position.updated → portfolio.updated

**Exceptional states not in normal flow:**
- PARTIALLY_FILLED: must not occur in normal V1 execution
- CANCEL_REQUESTED / CANCELLED: only for exceptional in-flight edge cases

---

## 4. Final Execution Semantics

| Property | Value |
|----------|-------|
| Platform type | Trading competition — NOT an exchange |
| Order types | MARKET only |
| Execution mechanism | Order Execution Service — immediate, against authoritative market price |
| Order book | Does not exist |
| Participant-to-participant matching | Does not exist |
| Counterparty | Does not exist |
| Partial fills (normal operation) | Do not occur |
| Price source | Authoritative market data feed |
| Participant submits price? | No |
| Fill quantity | Always = requested quantity (for FILLED orders) |

---

## 5. Idempotency and Timeout Behavior

### Two mechanisms
- **Idempotency-Key header:** Per-attempt. Server stores for 24h. Same key + same payload → replayed response, no new execution. Same key + different payload → 409 CONFLICT.
- **client_order_id field:** Stable order identity. Duplicate → 409 DUPLICATE_REQUEST.

### Critical timeout scenario
Because execution is immediate, a timeout after POST /orders means **the order may already be FILLED** in the database. The client simply did not receive the response.

Correct behavior:
1. Retry with the same Idempotency-Key and client_order_id.
2. Server returns original FILLED response — no second execution occurs.
3. Never generate a new client_order_id after a timeout.

### HTTP 500 after submission
Treat as timeout. Retry with same key. Backend must write idempotency key atomically with order creation.

### HTTP 503 on POST /orders
Order was NOT created (service unavailable before processing). Safe to retry after Retry-After.

---

## 6. WebSocket Behavior

| Property | Value |
|----------|-------|
| Connection | `wss://<host>/api/v1/ws` |
| Authority | NOT authoritative — notification channel only |
| Private events | order.updated, position.updated, portfolio.updated (owner only) |
| Public events | market.quote, market.candle, leaderboard.updated, system.status |
| Sequence | Per-connection only; resets to 1 on reconnect; gap → re-fetch REST |
| Replay | No replay in v1 |
| Reconnect | Mandatory REST re-fetch before resuming |
| Deduplication | By event_id (connection-scoped in-memory set) |
| Stale events | Discard if payload.updated_at < locally known timestamp |
| Matching events | Do not exist (no matching engine) |

**Normal order event flow:**
```
order.updated { ACCEPTED }
→ order.updated { FILLED }
→ position.updated
→ portfolio.updated
```

The ACCEPTED event may not always appear before FILLED if execution is very fast.

---

## 7. Remaining Genuinely Unresolved Decisions

All decisions that affected the public API contract have been resolved. The following are implementation/configuration details that do not change observable API behavior:

| ID | Decision | Recommended | Agent |
|----|----------|-------------|-------|
| OD-AUTH-03 | Login rate limit thresholds | Aggressive; per-IP + per-participant | Agent 2 |
| OD-AUTH-04 | Refresh token rotation | Yes | Agent 2 |
| OD-ORDER-05 | Maximum order quantity | Per competition rules | Human architect |
| OD-MARKET-04 | Exact instruments list | Per competition design | Human architect + Agent 4 |
| OD-WS-01 | Symbol-level subscription filter | Support but not required | Agent 2 |

---

## 8. Confirmation: No Matching Engine in V1

**Confirmed. V1 does not have a matching engine.**

The following concepts do not exist in Warangal Trading Ring V1:
- Order book
- Bid/ask participant matching
- Counterparty
- Price-time priority
- Matching queue
- Partial fills (under normal execution)
- Liquidity providers
- NO_COUNTERPARTY error
- NO_LIQUIDITY error
- ORDER_NOT_MATCHED error
- MATCHING_TIMEOUT error

A MARKET order is submitted, validated, immediately executed against the authoritative market price by the Order Execution Service, and committed. The result is a completely FILLED order. This is the only normal outcome.
