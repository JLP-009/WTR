# Admin Operations & Control API Contract Specification

**Version:** v1  
**Prefix:** `/api/v1/admin`  
**Status:** APPROVED & IMPLEMENTED

---

## 1. Overview

Exposes administrative controls for managing simulation events, advancing days, issuing market halts, enabling/disabling participants, and inspecting audit trails.

**Authorization:** All `/api/v1/admin/*` endpoints strictly require a valid JWT with `role: ADMIN`.

---

## 2. Endpoints

### 2.1. Event & Configuration Controls
- `GET /api/v1/admin/event`: Returns active event status, simulation day, cursor, and symbol counts.
- `GET /api/v1/admin/event/config`: Returns dataset configurations, simulation speed, interval lengths, and checksums.
- `POST /api/v1/admin/event/start`: Starts the event and activates live simulation.
- `POST /api/v1/admin/event/pause`: Pauses trading and simulation.
- `POST /api/v1/admin/event/resume`: Resumes paused event.
- `POST /api/v1/admin/event/end`: Concludes the event and terminates market operations.

---

### 2.2. Simulation & Market State
- `POST /api/v1/admin/simulation/next-day`: Advances the simulation cursor to the next trading day (`intervalIndex: 0`, `dayStatus: 'OPEN'`).
- `GET /api/v1/admin/market`: Fetches current quote prices across all active symbols.
- `POST /api/v1/admin/market/halt`: Enacts an emergency trading halt across all symbols.
- `POST /api/v1/admin/market/resume`: Lifts market halt, reopening order execution.

---

### 2.3. System Monitoring & Participant Management
- `GET /api/v1/admin/monitoring`: Real-time system health, database connectivity, WebSocket status, active participant count, today's order count, and error counts.
- `GET /api/v1/admin/participants`: Lists all participants with current cash balances, equity, realized P&L, open positions count, and account statuses.
- `POST /api/v1/admin/participants/:participant_id/enable`: Activates a disabled participant account.
- `POST /api/v1/admin/participants/:participant_id/disable`: Disables a participant account, immediately blocking order submissions and logins.

---

### 2.4. Global Trade & Audit Monitors
- `GET /api/v1/admin/orders`: Global audit monitor listing all submitted orders across participants.
- `GET /api/v1/admin/positions`: Global monitor listing all currently open positions.
- `GET /api/v1/admin/leaderboard`: Administrative leaderboard verification view.
- `GET /api/v1/admin/news`: Historical log of published admin news and alerts.
- `GET /api/v1/admin/audit`: Append-only audit log tracking administrative actions and state transitions.
- `GET /api/v1/admin/datasets`: Metadata and validation checksums for loaded simulation datasets.
