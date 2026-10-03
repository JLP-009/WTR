# Warangal Trading Ring — Backend Service

High-throughput, real-time trading simulation backend built with **Fastify 5**, **PostgreSQL 16**, **Drizzle ORM**, **WebSockets**, and **Decimal.js**.

---

## 1. Quick Start

### 1.1. Environment Configuration
```bash
cp .env.example .env
npm install
```

### 1.2. PostgreSQL Database Setup
```bash
# In project root:
docker compose up postgres -d

# Push Drizzle schema to database
npm run db:push

# Seed admin credentials & sample datasets
npm run seed:admin
npm run import:csv
```

### 1.3. Start Development Server
```bash
npm run dev
```
- **REST API Base:** `http://localhost:3000/api/v1`
- **Health Check:** `http://localhost:3000/health`
- **WebSocket Gateway:** `ws://localhost:3000/api/v1/ws`

---

## 2. Architecture & Modules

The backend implements all v1 domain modules under `src/modules/`:
- **`auth`**: User registration, Argon2id hashing, Jose JWT access/refresh token rotation, password reset.
- **`market`**: Canonical 10-second OHLCV candles, instrument listings, in-memory price cache.
- **`orders`**: Immediate MARKET order execution with PostgreSQL row-level locks, zero-float decimal precision, position flipping, and idempotency checks.
- **`positions`**: Real-time position tracking across LONG and SHORT holdings with realized & unrealized P&L.
- **`portfolio`**: Cash balances, buying power, equity calculations, and append-only ledger entries.
- **`leaderboard`**: Dynamic equity-based participant rankings, return percentages, and win rates.
- **`news`**: Market alerts and administrative announcements with real-time WebSocket broadcast.
- **`admin`**: Administrative control center for simulation lifecycle, day advancing, market halts, trader suspensions, and system audit logs.
- **`simulation`**: Multi-instance safe simulation ticker worker utilizing PostgreSQL session-level advisory locks.
- **`websocket`**: Native Fastify WebSocket gateway for public market ticks and private trader updates.

---

## 3. Scripts & Verification

```bash
# Typecheck
npm run typecheck

# Run unit tests
npm run test:unit

# Database schema generation & migration
npm run db:generate
npm run db:migrate
npm run db:push

# Data Seeding
npm run seed:admin
npm run seed:participant
npm run import:csv
```
