# Warangal Trading Ring — Backend Architecture Documentation

**Version:** 1.0.0 (Production / Implemented)  
**Status:** Implemented & Verified  
**Runtime:** Node.js (ESM, TypeScript) with Fastify 5  
**Database:** PostgreSQL 16+ via Drizzle ORM  
**Real-Time:** Native WebSocket Gateway (`ws`)

---

## 1. Architectural Overview

Warangal Trading Ring (WTR) backend is a high-throughput, low-latency trading simulation engine designed to support 300+ concurrent algorithmic and manual traders. The backend serves both RESTful API endpoints and real-time bidirectional WebSocket event streams.

```
                   ┌─────────────────────────────────────────────────────────┐
                   │                     Client Layer                        │
                   │   React 19 Frontend (Trader Dashboard / Admin App)      │
                   └───────────────────────────┬─────────────────────────────┘
                                               │ HTTPS REST & WSS
                                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Fastify Web Server                                       │
│                                                                                            │
│  Plugins:                                                                                  │
│  ├── Helmet (Security Headers)              ├── JWT Authentication (Bearer)                │
│  ├── CORS (Cross-Origin Resource Sharing)   ├── Request-ID Tracing (req_*)                 │
│  └── Global Error Handler (Sanitized JSON)  └── Native WebSocket Plugin (@fastify/websocket)│
│                                                                                            │
│  Route Modules (/api/v1):                                                                  │
│  ├── /auth        (Register, Login, Refresh, Logout, Me, Password Reset)                  │
│  ├── /market      (Status, Instruments, Quotes, 10s OHLCV Candles)                        │
│  ├── /orders      (Immediate MARKET Execution, History, Details, Cancel)                   │
│  ├── /positions   (Open Positions, P&L, Symbol Lookups, Position Flipping)                 │
│  ├── /portfolio   (Balance Breakdown, Realized/Unrealized P&L, Equity)                    │
│  ├── /leaderboard (Live Dynamic Equity Ranking, User Rank & Stats)                         │
│  ├── /news        (Market & Admin Lifecycle Announcements)                                 │
│  └── /admin       (Event Control, Simulation Steps, Market Halts, User Bans, Audits)      │
└──────────────────────────────┬───────────────────────────────┬─────────────────────────────┘
                               │                               │
                               │ Service Layer                 │ Real-Time Broadcasts
                               ▼                               ▼
┌─────────────────────────────────────────────────┐   ┌──────────────────────────────────────┐
│                Domain Services                  │   │          WebSocket Gateway           │
│                                                 │   │                                      │
│  • AuthService (Argon2, Dual-Token Rotation)    │   │  • Connection Lifecycle & Handshake  │
│  • MarketService (10s Candles, Price Cache)     │   │  • Auth Binding (JWT Verification)   │
│  • OrderService (Atomic Txn Execution Engine)   │   │  • Channel Subscriptions             │
│  • PortfolioService (Real-Time Equity & P&L)    │   │  • Targeted & Global Broadcasts      │
│  • SimulationWorker (PostgreSQL Advisory Locks) │   └──────────────────────────────────────┘
└──────────────────────────────┬──────────────────┘
                               │
                               │ Drizzle ORM Queries & ACID Transactions
                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                PostgreSQL 16 Database                                      │
│                                                                                            │
│  Tables:                                                                                   │
│  ├── users, refresh_tokens (Auth & Identity)                                               │
│  ├── datasets, instruments, dataset_candles (Master 10s Market Data)                       │
│  ├── events, event_instruments, simulation_states (Simulation Cursor & State)              │
│  ├── portfolios, positions, portfolio_ledger_entries (Financial Aggregates)                │
│  ├── orders, executions, idempotency_records (Atomic Transaction Logs)                     │
│  └── news, leaderboard_snapshots, audit_logs, outbox_events (Audit & Comms)                │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems & Service Boundaries

### 2.1. Authentication & Security Subsystem (`backend/src/modules/auth/`)
- **Password Hashing:** Argon2id with secure salt generation.
- **JWT Architecture:** Short-lived access tokens (15m expiration) signed with HMAC-SHA256, carrying user role (`ADMIN` or `PARTICIPANT`), `user_id`, and `participant_id`.
- **Refresh Token Rotation:** Long-lived refresh tokens (7d expiration) stored as cryptographic SHA-256 hashes in PostgreSQL `refresh_tokens` table. Reuse or revocation immediately invalidates existing sessions.
- **Role Enforcement:** Strict Fastify preHandler hooks (`app.authenticate`, `app.requireAdmin`, `app.optionalAuthenticate`) isolate administrative mutating endpoints from trader endpoints.

### 2.2. Market Data & 10-Second Simulation Engine (`backend/src/modules/market/` & `backend/src/modules/simulation/`)
- **Canonical Dataset Model:** Real-world trading sessions partitioned into 10-second OHLCV intervals (72 intervals per 12-minute simulated day, across multiple days and symbols).
- **In-Memory Price Cache (`PriceCache`):** Microsecond quote retrieval during active trading ticks, backed by durable `dataset_candles`.
- **Authoritative Cursor:** `simulation_states` stores the global `simulation_day`, `interval_index`, `market_status` (`OPEN`, `PAUSED`, `HALTED`, `CLOSED`), and `day_status`.
- **Simulation Worker (`SimulationWorker`):** Background worker utilizing PostgreSQL session-level advisory locks (`pg_try_advisory_lock`) to guarantee singleton cursor tick advancement across multi-instance deployments without double-stepping.

### 2.3. Immediate Market Execution Engine (`backend/src/modules/orders/`)
- **Execution Model:** Pure MARKET order execution. No order book matching or counterparty search. Valid orders fill immediately at the authoritative 10-second candle close price.
- **Atomic Transaction Isolation:** Every order submission runs inside a PostgreSQL `SERIALIZABLE` or strict row-locked transaction:
  1. Validates market state (`OPEN`, event `RUNNING`).
  2. Acquires row-level locks on `portfolios` and `positions` (`FOR UPDATE`).
  3. Checks cash balance and buying power.
  4. Resolves authoritative execution price.
  5. Inserts `orders` row (`status = 'FILLED'`) and corresponding `executions` record.
  6. Updates portfolio balances (deducts cash for BUY, credits cash for SELL) and appends to `portfolio_ledger_entries`.
  7. Updates or flips `positions` records (with precise weighted average entry price for additions, and full P&L realization on reductions/flips).
  8. Commits transaction and triggers WebSocket notification (`order.updated`, `position.updated`, `portfolio.updated`).

### 2.4. Position Lifecycle & Flipping Mechanics (`backend/src/modules/positions/`)
- **Position Tracking:** Supports both `LONG` and `SHORT` positions.
- **Position Flip Protocol:** If a trader is LONG 50 units and submits SELL 80 units:
  - Step A: 50 units are closed at the execution price, realizing P&L against the previous entry price.
  - Step B: Remaining 30 units open a new `SHORT` position with average entry price equal to the fill price. No blending of entry prices across zero.
- **Zero-Float Precision:** All monetary amounts, prices, equity, cash, and P&L are computed using `decimal.js` with arbitrary precision (up to 24 digits, 8 decimal places) and persisted as PostgreSQL `numeric(24,8)` strings. Floating-point arithmetic is strictly prohibited.

### 2.5. Real-Time WebSocket Gateway (`backend/src/modules/websocket/`)
- **Handshake & Auth:** Immediate `connection.established` handshake; clients authenticate via `{ "action": "auth", "token": "<JWT>" }`.
- **Channels:** `market`, `news`, `portfolio`, `positions`, `leaderboard`, `orders`.
- **Broadcast Isolation:** Public events (quotes, market status, news, leaderboard) are broadcast globally; private events (order fills, portfolio updates, private position alerts) are delivered exclusively to the authenticated user's socket connection.

---

## 3. Production Readiness & Concurrency

| Dimension | Target | Architecture Provision |
|---|---|---|
| Concurrent Users | 300+ Active Traders | Asynchronous Fastify event loop, connection pooling (`max: 50`), in-memory price caching |
| Order Throughput | 50+ orders/sec | Immediate single-trade execution without order book depth search |
| Data Integrity | Zero Lost Updates | PostgreSQL ACID transactions with `FOR UPDATE` row locks |
| Crash Recovery | Zero State Loss | State strictly persisted in PostgreSQL; simulation worker re-syncs cursor on startup |
| Financial Precision | 100% Exact | `numeric(24,8)` database columns + `decimal.js` calculations |
