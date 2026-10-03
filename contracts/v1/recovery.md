# Disaster Recovery, Resynchronization & Idempotency Specification

**Version:** v1  
**Status:** APPROVED & IMPLEMENTED

---

## 1. WebSocket Reconnection & State Resync

When a client experiences a temporary network disconnection or dropped WebSocket session:
1. **Exponential Backoff Reconnect:** The client automatically attempts reconnect with exponential backoff (e.g., 1s, 2s, 4s, up to 15s).
2. **Post-Reconnect REST Reconciliation:** Upon reconnection, the client issues parallel REST queries to reconcile authoritative durable state:
   - `GET /api/v1/market/status` → Update simulation day and market status.
   - `GET /api/v1/portfolio` → Re-sync cash balance and equity.
   - `GET /api/v1/positions` → Re-sync active positions and entry prices.
   - `GET /api/v1/orders?limit=10` → Reconcile any in-flight order executions.

---

## 2. Order Submission Idempotency

- Clients transmit an `Idempotency-Key` header with every order submission.
- The server checks PostgreSQL `idempotency_records`.
- If the key exists with an identical request fingerprint, the cached successful 201 response is returned immediately without duplicate execution.
- If the key exists with a differing fingerprint, an `IDEMPOTENCY_CONFLICT` (409) is returned.

---

## 3. Server Crash Recovery

- **Stateless Application Servers:** All mutable state resides in PostgreSQL.
- **Simulation Worker Recovery:** On service restart, the worker re-queries `simulation_states` and resumes from the last committed `simulation_day` and `interval_index`. No state is lost.
