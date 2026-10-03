# Simulation Engine & Cursor Lifecycle Contract Specification

**Version:** v1  
**Status:** APPROVED & IMPLEMENTED

---

## 1. Simulation Progression & Worker

The simulation worker (`backend/src/modules/simulation/simulation.worker.ts`) operates on a continuous 10-second interval cycle:

1. **Advisory Lock Acquisition:** The worker executes `SELECT pg_try_advisory_lock(12345678)` on PostgreSQL to guarantee a single authoritative ticker process across clustered backend replicas.
2. **Cursor Evaluation:** Reads `simulation_states` row (`simulation_day`, `interval_index`).
3. **Tick Advancement:**
   - Loads the canonical 10-second candle from `dataset_candles` matching the cursor.
   - Updates `PriceCache` in memory.
   - Atomically increments `interval_index` in `simulation_states`.
   - Broadcasts real-time quote updates via `WebSocketGateway.broadcast('market', ...)`.
4. **Day Rollover:** When `interval_index` reaches 72 (the end of a 12-minute simulated day), the day status transitions to `CLOSED` until an administrator issues `POST /api/v1/admin/simulation/next-day` or automated schedule advances.

---

## 2. State Machine Rules

```
Event Lifecycle:
  SETUP ──► READY ──► RUNNING ◄──► PAUSED ──► ENDED

Day Lifecycle:
  PRE_OPEN ──► OPEN ──► CLOSED

Market Lifecycle:
  PRE_OPEN ──► OPEN ◄──► PAUSED ──► HALTED ──► CLOSED
```
