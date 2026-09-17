# Simulation, Event, and Lifecycle Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Overview

Warangal Trading Ring operates as a controlled trading simulation/competition. This file defines the complete lifecycle model governing how the simulation progresses, how market prices are determined, and how Admin controls the event.

**Fundamental rule:** Market session status does NOT automatically reject valid participant MARKET orders. Orders remain executable in all states. The state determines which authoritative price is used for execution.

---

## 2. Three Lifecycle Domains

The system maintains three independent but related lifecycle states. They must NOT be collapsed into a single state variable.

### 2.1 Event Status

Controls the overall competition lifecycle.

| Status | Meaning |
|--------|---------|
| `SETUP` | Event is being configured; not yet started |
| `READY` | Configuration complete and validated; awaiting start |
| `RUNNING` | Event is active; simulation may progress |
| `PAUSED` | Event temporarily paused by Admin |
| `ENDED` | Event is permanently ended (terminal) |

**Transitions:**
```
SETUP → READY        (Admin: configuration complete + validated)
READY → RUNNING      (Admin: event start)
RUNNING → PAUSED     (Admin: event pause)
PAUSED → RUNNING     (Admin: event resume)
RUNNING → ENDED      (Admin: event end — terminal)
PAUSED → ENDED       (Admin: event end — terminal)
```

`ENDED` is terminal. No transition out of `ENDED` is permitted.

### 2.2 Simulation Status

Controls simulation clock and data progression within a running event.

| Status | Meaning |
|--------|---------|
| `STOPPED` | Simulation not yet started for this event |
| `RUNNING` | Simulation engine actively consuming intervals |
| `PAUSED` | Simulation clock and cursor are frozen |
| `DAY_CLOSED` | Current simulation day has been closed; awaiting next-day command |

**Transitions:**
```
STOPPED → RUNNING     (Admin: simulation start)
RUNNING → PAUSED      (Admin: simulation pause)
PAUSED → RUNNING      (Admin: simulation resume)
RUNNING → DAY_CLOSED  (Admin: close-day)
DAY_CLOSED → RUNNING  (Admin: next-day → PRE_OPEN → simulation resumes on market open)
```

### 2.3 Day Status

Controls the within-day market state.

| Status | Meaning |
|--------|---------|
| `PRE_OPEN` | Day initialized; market not yet open |
| `OPEN` | Market actively trading; simulation progressing |
| `CLOSING` | Optional graceful close in progress |
| `CLOSED` | Day closed; final close price established |

**Transitions:**
```
PRE_OPEN → OPEN     (Admin: market open)
OPEN → CLOSING      (Optional: Admin initiates graceful close)
CLOSING → CLOSED    (Close process completes)
OPEN → CLOSED       (Admin: close-day directly)
CLOSED → PRE_OPEN   (Admin: next-day)
```

### 2.4 Market Status

Controls the real-time trading state and participant-visible market condition.

| Status | Simulation | Authoritative Price | Participant Orders |
|--------|-----------|--------------------|--------------------|
| `PRE_OPEN` | Not started | No committed close | Executable if previous day close exists |
| `OPEN` | Progressing | Last committed 10s close | Always executable |
| `PAUSED` | Frozen | Last committed close | Always executable |
| `HALTED` | Frozen | Last committed close | Always executable |
| `CLOSED` | Stopped | Final committed close | Always executable |

**Transitions:**
```
PRE_OPEN → OPEN      (Admin: market open)
OPEN → PAUSED        (Admin: market pause)
PAUSED → OPEN        (Admin: market resume)
OPEN → HALTED        (Admin: market halt)
HALTED → OPEN        (Admin: market resume)
OPEN → CLOSED        (Admin: market close or close-day)
HALTED → CLOSED      (Admin: market close or close-day)
CLOSED → PRE_OPEN    (Admin: next-day)
```

---

## 3. State Compatibility Matrix

| event_status | simulation_status | day_status | market_status | Simulation progressing? | Orders executable? |
|-------------|------------------|------------|---------------|------------------------|-------------------|
| `SETUP` | `STOPPED` | — | — | No | No |
| `READY` | `STOPPED` | — | — | No | No |
| `RUNNING` | `RUNNING` | `OPEN` | `OPEN` | Yes | Yes — at current committed close |
| `RUNNING` | `PAUSED` | `OPEN` | `PAUSED` | No | Yes — at last committed close |
| `RUNNING` | `RUNNING` | `OPEN` | `HALTED` | No | Yes — at last committed close |
| `RUNNING` | `DAY_CLOSED` | `CLOSED` | `CLOSED` | No | Yes — at final committed close |
| `RUNNING` | `STOPPED` | `PRE_OPEN` | `PRE_OPEN` | No | Day 1 only: No (no committed price). Day 2+: Yes — at previous day's final close |
| `PAUSED` | any | any | any | No | Yes — at last committed close (event pause freezes simulation but not order execution) |
| `ENDED` | `STOPPED` | `CLOSED` | `CLOSED` | No | **No** — event is terminal; all new orders rejected |

**Rules overriding the table:**
- Orders are rejected only when: (a) `event_status = ENDED`, (b) `event_status = SETUP` or `READY`, or (c) `market_status = PRE_OPEN` and no authoritative committed price exists (Day 1 before first interval).
- Event PAUSED freezes simulation progression but does NOT block participant order execution. Orders continue using the last committed close.
- Market HALTED, PAUSED, and CLOSED do not block participant order execution. They determine which committed price is used.

---

## 4. Master Dataset Model

### 4.1 Immutability

The master simulation dataset is **immutable**. It is loaded once and never modified during operation. Every event references a specific dataset version via checksum.

### 4.2 Dataset Metadata

```json
{
  "dataset_id": "ds_01ARZ...",
  "dataset_version": "1.0.0",
  "dataset_name": "NSE Simulation Set A",
  "source_type": "CSV",
  "dataset_checksum": "sha256:abc123...",
  "total_dataset_days": 20,
  "dataset_symbol_count": 40,
  "dataset_symbols": ["NIFTY", "BANKNIFTY", "RELIANCE", ...],
  "simulated_day_duration_minutes": 12,
  "simulated_day_duration_seconds": 720,
  "data_interval_seconds": 10,
  "intervals_per_day": 72,
  "timezone": "Asia/Kolkata",
  "total_rows": 57600,
  "first_simulation_day": 1,
  "last_simulation_day": 20,
  "validation_status": "VALID",
  "validation_errors": [],
  "validation_warnings": [],
  "immutable": true,
  "locked": true,
  "created_at": "2026-01-01T00:00:00.000Z",
  "loaded_at": "2026-01-01T00:00:00.000Z"
}
```

### 4.3 Canonical CSV Structure

Each row represents one 10-second OHLCV interval for one symbol:

```
simulation_day,simulation_time,symbol,open,high,low,close,volume
```

Example:
```
1,09:15:00,NIFTY,100.00,100.20,99.90,100.10,1200
1,09:15:10,NIFTY,100.10,100.30,100.00,100.25,1350
```

- `simulation_time` is the **start** of the interval
- Unique key: `(simulation_day, simulation_time, symbol)`
- Timezone: `Asia/Kolkata` (simulation times are in IST simulation context)

### 4.4 Day and Interval Constants

| Constant | Value |
|----------|-------|
| `data_interval_seconds` | 10 |
| `simulated_day_duration_minutes` | 12 |
| `simulated_day_duration_seconds` | 720 |
| `intervals_per_day` | 72 |
| First interval time | `09:15:00` |
| Last interval time | `09:26:50` |

These are fixed for V1. The day boundary is inclusive: `[09:15:00, 09:26:50]`.

### 4.5 Physical CSV Storage

The master dataset may be stored as one file per symbol (up to 40 CSV files) or as a single combined file. Both layouts are acceptable. The logical contract is:

**Logical key:** `(simulation_day, simulation_time, symbol)` — globally unique across all files.

**Per-file layout (40 files):** Each file contains rows for one symbol across all days. Filename maps to symbol (e.g., `NIFTY.csv`). All rows in the file must have a consistent symbol matching the filename.

**Combined layout (1 file):** All symbols and days in a single file, sorted by `(simulation_day, simulation_time, symbol)`.

**Validation rules for any layout:**
- No duplicate rows: `(simulation_day, simulation_time, symbol)` must be unique
- No missing intervals: every symbol must have exactly 72 rows per day
- No extra symbols beyond the dataset definition
- No partial days: each day must have all 72 intervals present
- Row count verification: `total_rows = dataset_symbol_count × dataset_total_days × 72`

If duplicate or overlapping rows exist, the dataset validation must fail with `DATASET_INVALID`. The system must never silently use the first or last of a duplicate.

### 4.5 OHLC Invariants (Dataset Validation)

Every row must satisfy:

```
high >= max(open, close)
high >= low
low <= min(open, close)
volume >= 0
open > 0
close > 0
```

---

## 5. Event Dataset Selection

An event uses a **logical subset** of the master dataset:

```
event_days = [1 .. configured_total_simulation_days]
event_symbols = [Admin-selected list]
```

### 5.1 Row Count Formula

```
rows_per_day = event_symbol_count × 72
expected_total_event_rows = configured_total_simulation_days × event_symbol_count × 72
```

Example — 5 days, 12 symbols:
```
rows_per_day = 12 × 72 = 864
expected_total_event_rows = 5 × 12 × 72 = 4,320
```

### 5.2 Day Mapping

V1 default mapping is sequential from Day 1:

```
event day 1 → dataset day 1
event day 2 → dataset day 2
...
event day N → dataset day N
```

Days beyond `configured_total_simulation_days` are not consumed by this event.

### 5.3 Symbol Mapping

The event uses exactly the Admin-selected symbols. Unused dataset symbols are not consumed. Unused symbols must not appear as tradable instruments in the event.

---

## 6. Event Configuration

### 6.1 Required Configuration (before START)

Admin must configure:

```json
{
  "dataset_id": "ds_01ARZ...",
  "total_simulation_days": 5,
  "symbols": [
    "NIFTY", "BANKNIFTY", "RELIANCE", "TCS", "INFY",
    "HDFCBANK", "ICICIBANK", "SBIN", "LT", "ITC", "AXISBANK", "MARUTI"
  ]
}
```

The backend derives and validates:

```json
{
  "event_symbol_count": 12,
  "dataset_total_days": 20,
  "dataset_symbol_count": 40,
  "rows_per_day": 864,
  "expected_total_event_rows": 4320
}
```

### 6.2 Configuration Validation

Before `START`, the backend validates:

| Check | Rule |
|-------|------|
| `total_simulation_days` present | Required |
| `total_simulation_days` type | Positive integer ≥ 1 |
| `total_simulation_days` ≤ `dataset_total_days` | Must not exceed dataset |
| `symbols` present | Required |
| `symbols` not empty | At least 1 symbol |
| Every symbol in instrument master | Must exist |
| Every symbol in dataset | Must have data for all selected days |
| No duplicate symbols | Unique only |
| All symbols enabled/valid | Active in instrument master |
| Data completeness | All selected days × symbols × 72 intervals present |
| OHLC invariants | Valid for all selected rows |
| Dataset checksum | Matches stored version |

### 6.3 Configuration Lock

Once `START` is issued, the following become **immutable** for the event lifetime:

- `dataset_id`
- `dataset_version`
- `dataset_checksum`
- `configured_total_simulation_days`
- `event_symbols`
- `event_symbol_count`
- `data_interval_seconds`
- `simulated_day_duration_seconds`
- Simulation speed

These cannot be changed while the event is in any non-`SETUP` state. A new event must be created for different configuration.

---

## 7. Simulation Speed

| Parameter | Value |
|-----------|-------|
| `data_interval_seconds` | 10 (one CSV row = 10 simulated seconds) |
| `simulation_speed` (V1 default) | **1** (1 real second = 1 simulation interval of 10 simulated seconds) |
| `real_seconds_per_interval` | `1.0` at default speed |
| `real_seconds_per_day` | `72` at default speed (72 intervals × 1 real second each) |

**V1 default speed:** 1 canonical simulation interval (10 simulated seconds) takes exactly 1 real second. One complete simulation day (72 intervals) takes 72 real seconds.

This is expressed as `simulation_speed = 1` meaning "1 real second per interval." Speed is configurable as a positive number: `simulation_speed = 2` means each interval takes 0.5 real seconds (2× faster), `simulation_speed = 0.5` means each interval takes 2 real seconds (half speed).

**Speed is stored as an explicit event configuration field** — `simulation_speed` in `EventConfig`. It is immutable after START. The simulation engine uses `real_seconds_per_interval = 1.0 / simulation_speed` to determine its scheduling interval.

Sub-second scheduling is required at `simulation_speed > 1`. The implementation must use a timer mechanism capable of the required precision. **IMPLEMENTATION DECISION REQUIRED:** Choice of scheduler/timer technology (e.g., asyncio, APScheduler, system timer). The contract defines the behavior; the implementation decides the mechanism.

---

## 8. Simulation Cursor

The cursor is the authoritative record of simulation progression.

### 8.1 Cursor Fields

```json
{
  "dataset_id": "ds_01ARZ...",
  "dataset_version": "1.0.0",
  "simulation_day": 3,
  "interval_index": 25,
  "simulated_time": "09:19:10",
  "last_committed_close": "105.25",
  "committed_at": "2026-09-05T10:23:45.123Z"
}
```

`interval_index` is 0-based. Interval 0 = `09:15:00`, interval 71 = `09:26:50`.

### 8.2 Cursor Semantics

- The cursor represents the **last fully committed** interval.
- The next interval to process is `interval_index + 1`.
- The cursor advances **only after** the complete interval is durably committed.
- All event symbols advance together — there is no per-symbol cursor.
- The cursor is persisted to the database before any downstream state updates.

### 8.3 Interval Atomicity

A simulation interval commit is **all-or-nothing**:

```
INTERVAL NOT COMMITTED
        or
FULLY COMMITTED
```

Never partially committed. A complete interval commit must maintain consistency between:
- OHLC data for all event symbols
- Authoritative price
- Simulation time and day
- Simulation cursor
- Market state (WebSocket broadcast)

If the server crashes **before** commit: interval can safely be retried.
If the server crashes **after** commit: interval must NOT execute again. The committed cursor prevents double-commit.

---

## 9. Authoritative Price by Market State

The authoritative execution price for participant MARKET orders:

| Market Status | Condition | Authoritative Price | Order result |
|---------------|-----------|--------------------|-|
| `OPEN` | Normal operation | CLOSE of last fully committed 10-second interval | FILLED |
| `PAUSED` | Simulation frozen | LAST DURABLY COMMITTED CLOSE | FILLED |
| `HALTED` | Admin halt | LAST DURABLY COMMITTED CLOSE | FILLED |
| `CLOSED` | Day ended | FINAL/LAST DURABLY COMMITTED CLOSE | FILLED |
| `PRE_OPEN` | Day 2+ (previous day close exists) | Previous day's FINAL DURABLY COMMITTED CLOSE | FILLED |
| `PRE_OPEN` | Day 1 (no committed close exists anywhere) | **None** | REJECTED — `NO_AUTHORITATIVE_PRICE` |
| `ENDED` (event) | Event is terminal | N/A | REJECTED — event-ended error |

**NO_AUTHORITATIVE_PRICE:** If no interval has ever been committed (Day 1 PRE_OPEN before simulation starts), participant orders are rejected because there is no durable price to execute against. This is the only state-based order rejection other than EVENT ENDED. All other state combinations have an authoritative price available.

**LAST DURABLY COMMITTED CLOSE:** The `close` value from the most recently fully committed 10-second simulation interval. Must never be:
- A half-written candle
- Uncommitted in-memory data
- Frontend state or browser cache
- An incomplete candle marked `is_complete: false`

**Example (HALT):**
```
Last committed interval: Day 3, 09:20:10, close = 105.25
Admin issues HALT.
Participant BUY 100 NIFTY → executes at 105.25
Participant SELL 50 NIFTY → executes at 105.25
Price remains 105.25 regardless of elapsed real-world time.
```

**Example (Event PAUSED):**
```
Last committed interval: Day 2, 09:18:30, close = 102.00
Admin pauses event.
Simulation stops progressing.
Participant BUY 50 NIFTY → executes at 102.00 (last committed close)
Event pause does not block participant orders.
```

---

## 10. Admin Lifecycle Commands

### 10.1 Halt

`POST /api/v1/admin/market/halt`

Effects:
- Stops simulation progression immediately
- Freezes simulation cursor
- Freezes simulation clock
- Preserves last committed close as authoritative price
- Persists state durably
- Broadcasts `system.status` WebSocket event
- Creates audit record
- Survives server restart

Does NOT reject participant MARKET orders.

### 10.2 Pause (Simulation)

`POST /api/v1/admin/simulation/pause`

Effects: Same as HALT but at simulation level. Simulation clock and cursor frozen. Last committed close is authoritative.

Does NOT reject participant MARKET orders.

### 10.3 Resume

`POST /api/v1/admin/market/resume` / `POST /api/v1/admin/simulation/resume`

Effects:
- Restarts simulation progression
- Continues from **NEXT UNCONSUMED INTERVAL** (`cursor.interval_index + 1`)
- Does NOT catch up based on elapsed wall-clock time
- Does NOT replay committed intervals
- Does NOT invent skipped intervals

**Critical example:**
```
Halt at:     Day 3, 09:20:10 (interval_index = 25)
1 hour elapses in real time.
Resume.
Next interval: Day 3, 09:20:20 (interval_index = 26)
NOT:           Day 3, 10:20:10
```

### 10.4 Close Day

`POST /api/v1/admin/simulation/close-day`

Effects (ordered):
1. Stop new interval progression
2. Resolve any in-flight interval according to authoritative transaction boundary
3. Finalize day market state
4. Finalize daily P&L for all participants
5. Create leaderboard snapshot
6. Persist final cursor
7. Persist final close
8. Set `day_status = CLOSED`, `simulation_status = DAY_CLOSED`, `market_status = CLOSED`
9. Broadcast state via WebSocket
10. Create audit record

Does NOT automatically close participant positions.
Does NOT reject participant MARKET orders (orders use final committed close).
Is idempotent — repeated calls with same Idempotency-Key produce same result.

### 10.5 Next Day

`POST /api/v1/admin/simulation/next-day`

Precondition: `day_status = CLOSED`
Precondition: `current_day < configured_total_simulation_days`

Effects:
- Increments `simulation_day` to `N + 1`
- Sets `day_status = PRE_OPEN`, `market_status = PRE_OPEN`
- Initializes simulation clock to start of new day (`09:15:00`)
- Does NOT automatically open market — Admin must issue `market/open`

Rejected if `current_day == configured_total_simulation_days` (event must end — see §10.6).

Idempotent — repeated calls with same Idempotency-Key do not advance day twice.

### 10.6 End Event

`POST /api/v1/admin/event/end`

Terminal operation. Effects:
- Stops all simulation
- Sets `event_status = ENDED`
- Finalizes leaderboard permanently
- Preserves all trades, balances, positions, P&L (all readable via REST)
- Persists final state (survives restart)
- Creates audit record

`ENDED → any state` is **forbidden**. No recovery from ENDED. No automatic resume is possible.

**In-flight orders at END:** Any order in `PENDING` or `ACCEPTED` state at the moment `event_status` transitions to `ENDED` is forced to `FAILED` (not `CANCELLED` — cancellation is a participant action; this is a system termination). Reserved funds from those orders are released. An `order.updated` WebSocket event with `status: "FAILED"` is delivered to each affected participant. A `portfolio.updated` event confirming fund release follows.

**After ENDED — participant order behavior:**
All new participant order submissions are rejected. The system returns:
```json
{
  "error": {
    "code": "SYSTEM_UNAVAILABLE",
    "message": "The trading event has ended. No further orders can be submitted.",
    "details": { "event_status": "ENDED" }
  }
}
```

**After ENDED — reads remain available:**
- `GET /api/v1/orders` — readable
- `GET /api/v1/positions` — readable
- `GET /api/v1/portfolio` — readable
- `GET /api/v1/leaderboard` — readable (final state)
- All historical trade and P&L data remains accessible

---

## 11. Overnight Positions

Positions carry overnight by default. `CLOSE DAY` does not automatically close participant positions.

**Overnight valuation:**
- At day close: positions are marked to the final committed close of the day.
- When next day opens: positions are revalued at the next day's first committed close.
- Unrealized P&L updates as new intervals commit.

**LONG overnight:**
- Held at day close entry price
- Revalued at next day's first authoritative price
- P&L adjusts accordingly

**SHORT overnight:**
- Same mechanics, inverted P&L direction
- `unrealized_pnl = (entry_price - current_price) × quantity`

No overnight financing costs in V1 (see §12).

---

## 12. Fees and Slippage

**V1 decision:** No fees, no slippage, no transaction costs.

```
execution_price = authoritative_price
slippage = 0
transaction_cost = 0
```

If the existing project defines an authoritative fee model, it takes precedence. If not, this V1 definition applies.

---

## 13. Crash and Failure Recovery

### 13.1 Server Restart

On restart, the backend recovers from persisted state:
- `event_status`, `simulation_status`, `day_status`, `market_status`
- `simulation_day`, `simulated_time`
- `cursor` (last committed interval)
- `last_committed_close`
- `dataset_id`, `dataset_version`, `dataset_checksum`
- Event symbol selection and configured days

The system does **NOT** automatically resume if it was `PAUSED`, `HALTED`, `CLOSED`, or `ENDED`. Explicit Admin action is required.

### 13.2 Crash During Interval

If the server crashes before interval commit: interval is safely retried on recovery.
If the server crashes after interval commit: interval must NOT execute again — the cursor prevents double-commit.

Invariants that must never be violated:
- No duplicate interval commit
- No skipped committed interval
- No inconsistent cursor
- No duplicate market event for the same interval

### 13.3 Database Failure

If database persistence cannot be guaranteed:
- Simulation must NOT advance its cursor
- Order FILLED status must NOT be set without durable accounting commit
- System enters `SYSTEM_UNAVAILABLE` state
- Admin is notified via monitoring

### 13.4 Simulation Engine Failure

If the engine cannot obtain or commit the next valid interval:
- Do not invent data
- Do not use random prices
- Do not skip the interval
- Do not advance the cursor
- Freeze simulation safely
- Preserve last committed close
- Notify Admin via monitoring
- Create audit record for the failure

Valid participant MARKET orders continue using the last committed close if accounting/database is healthy.

---

## 14. Event Isolation

Each event maintains its own:
- Participants, orders, trades, positions, balances
- Leaderboard
- Simulation cursor and state
- Selected symbols and days
- News (where event-scoped)

The master dataset is shared and immutable across events.

One event must not mutate another event's simulation state.

---

## 15. Simulation Invariants

The following rules must never be violated:

1. **Participant orders do not advance simulation.** Cursor, simulation_day, interval_index, and simulated_time advance only through the simulation engine.
2. **Participant orders do not consume CSV data.** CSV intervals are consumed only by the simulation engine.
3. **Participant orders do not move the market.** Price is determined solely by committed simulation intervals.
4. **Simulation does not catch up on wall-clock time.** Pausing for 1 hour does not skip 1 hour of simulation.
5. **No partial interval commits.** An interval is either fully committed or not committed.
6. **The cursor never goes backward.** No rewind, no replay, no skip.
7. **Final day enforcement.** After `configured_total_simulation_days` is reached, `NEXT DAY` is rejected.
8. **Dataset immutability.** The master CSV is never modified during event operation.
9. **Checksum enforcement.** Events validate the dataset checksum at start and may validate periodically.
10. **No random/generated prices.** All prices come from committed simulation dataset rows.
11. **Incomplete candles are display-only.** A candle with `is_complete: false` is a real-time preview for UI purposes only. It must never determine the execution price for participant orders. Only `is_complete: true` candles (fully committed) are authoritative price sources.
12. **No authoritative price = order rejection.** If no interval has ever been committed (Day 1 PRE_OPEN), participant orders are rejected. The system must not fabricate a starting price.
13. **Event ENDED = permanent order rejection.** Once `event_status = ENDED`, all new order submissions are rejected. No recovery path exists.
