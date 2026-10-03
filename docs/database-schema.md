# Database Schema Documentation — Warangal Trading Ring

**Database Engine:** PostgreSQL 16+  
**ORM / Schema Definition:** Drizzle ORM (`backend/src/db/schema/index.ts`)  
**Migration Path:** `backend/src/db/migrations/0000_phase_two_schema.sql`  
**Precision Standard:** PostgreSQL `numeric(24, 8)` for all monetary & price fields

---

## 1. Schema Principles & Rules

1. **Zero-Float Financial Policy:** Floating point types (`REAL`, `FLOAT`, `DOUBLE PRECISION`) are completely forbidden for financial and numeric data. All money, prices, quantities, and P&L fields use `numeric(24, 8)` in PostgreSQL and `string` in TypeScript/Drizzle.
2. **Dual-Key Identification:** Every entity possesses a private UUID primary key (`id`) for relational joins and an immutable public prefixed string ID (`public_id`, e.g., `usr_*`, `ord_*`, `exe_*`, `news_*`, `ds_*`, `evt_*`) for external API visibility.
3. **Audit Timestamping:** Every table contains `created_at` and `updated_at` timestamps with UTC timezone (`timestamp with time zone`).

---

## 2. Table Specifications

### 2.1. Authentication & Identity

#### `users`
Stores user credentials, roles, and administrative statuses.
- `id` (UUID, PK, default: `gen_random_uuid()`)
- `public_id` (TEXT, UNIQUE, NOT NULL) — e.g. `usr_01J8...`
- `participant_id` (TEXT, UNIQUE, NOT NULL) — Trader username/identifier (e.g. `TRADER001`, `ADMIN001`)
- `display_name` (TEXT, NOT NULL)
- `password_hash` (TEXT, NOT NULL) — Argon2id hash
- `role` (`user_role` ENUM: `'PARTICIPANT'`, `'ADMIN'`, default: `'PARTICIPANT'`)
- `account_status` (`account_status` ENUM: `'ACTIVE'`, `'DISABLED'`, default: `'ACTIVE'`)
- `created_at` (TIMESTAMPTZ, NOT NULL, default: `NOW()`)
- `updated_at` (TIMESTAMPTZ, NOT NULL, default: `NOW()`)

#### `refresh_tokens`
Manages rotating refresh tokens with cryptographic hashes.
- `id` (UUID, PK, default: `gen_random_uuid()`)
- `user_id` (UUID, FK → `users.id`, NOT NULL)
- `token_hash` (TEXT, UNIQUE, NOT NULL) — SHA-256 hash of refresh token
- `expires_at` (TIMESTAMPTZ, NOT NULL)
- `revoked_at` (TIMESTAMPTZ, NULLABLE)
- `created_at` (TIMESTAMPTZ, NOT NULL, default: `NOW()`)

---

### 2.2. Market Data & Historical Datasets

#### `datasets`
Represents master simulation market datasets.
- `id` (UUID, PK, default: `gen_random_uuid()`)
- `public_id` (TEXT, UNIQUE, NOT NULL)
- `name` (TEXT, NOT NULL)
- `version` (TEXT, NOT NULL)
- `description` (TEXT, NULLABLE)
- `checksum` (TEXT, NOT NULL)
- `validation_status` (`dataset_validation_status` ENUM: `'PENDING'`, `'VALID'`, `'INVALID'`)
- `total_days` (INTEGER, NOT NULL, check: `> 0`)
- `interval_seconds` (INTEGER, NOT NULL, default: 10, check: `> 0`)
- `intervals_per_day` (INTEGER, NOT NULL, default: 72, check: `> 0`)
- `source_uri` (TEXT, NULLABLE)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `instruments`
Tradable financial assets (Indices, Stocks, Futures).
- `id` (UUID, PK, default: `gen_random_uuid()`)
- `symbol` (TEXT, UNIQUE, NOT NULL) — e.g. `NIFTY`, `BANKNIFTY`, `RELIANCE`
- `name` (TEXT, NOT NULL)
- `instrument_type` (`instrument_type` ENUM: `'EQUITY'`, `'INDEX'`, `'FUTURES'`, `'OPTIONS'`)
- `exchange` (TEXT, NOT NULL) — e.g. `NSE`, `BSE`, `WTR`
- `status` (`instrument_status` ENUM: `'ACTIVE'`, `'SUSPENDED'`, `'DELISTED'`)
- `tick_size` (`numeric(24, 8)`, NOT NULL, check: `> 0`)
- `lot_size` (INTEGER, NOT NULL, default: 1, check: `> 0`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `dataset_candles`
Canonical 10-second OHLCV intervals.
- `id` (UUID, PK, default: `gen_random_uuid()`)
- `dataset_id` (UUID, FK → `datasets.id`, NOT NULL)
- `instrument_id` (UUID, FK → `instruments.id`, NOT NULL)
- `trading_day` (INTEGER, NOT NULL, check: `> 0`)
- `interval_index` (INTEGER, NOT NULL, check: `>= 0`)
- `timestamp` (TIMESTAMPTZ, NOT NULL)
- `open`, `high`, `low`, `close` (`numeric(24, 8)`, NOT NULL)
- `volume` (INTEGER, NOT NULL, check: `>= 0`)
- **Constraints:** UNIQUE on `(dataset_id, instrument_id, trading_day, interval_index)`, and Check: `low <= open AND low <= close AND high >= open AND high >= close`.

---

### 2.3. Event Lifecycle & Simulation

#### `events`
Trading ring event instances.
- `id` (UUID, PK, default: `gen_random_uuid()`)
- `public_id` (TEXT, UNIQUE, NOT NULL)
- `dataset_id` (UUID, FK → `datasets.id`)
- `status` (`event_status` ENUM: `'SETUP'`, `'READY'`, `'RUNNING'`, `'PAUSED'`, `'ENDED'`)
- `total_simulation_days` (INTEGER, check: `> 0`)
- `simulation_speed` (INTEGER, default: 1, check: `> 0`)
- `config_locked` (BOOLEAN, default: false)
- `created_at`, `updated_at`, `ended_at` (TIMESTAMPTZ)

#### `simulation_states`
Singleton cursor tracking authoritative simulation progression.
- `event_id` (UUID, PK, FK → `events.id`)
- `status` (`simulation_status` ENUM: `'STOPPED'`, `'RUNNING'`, `'PAUSED'`)
- `day_status` (`day_status` ENUM: `'PRE_OPEN'`, `'OPEN'`, `'CLOSED'`)
- `market_status` (`market_status` ENUM: `'PRE_OPEN'`, `'OPEN'`, `'PAUSED'`, `'HALTED'`, `'CLOSED'`)
- `simulation_day` (INTEGER, default: 0, check: `>= 0`)
- `interval_index` (INTEGER, default: 0, check: `>= 0`)
- `simulated_at` (TIMESTAMPTZ)
- `last_committed_at` (TIMESTAMPTZ)
- `lease_owner` (TEXT)
- `lease_expires_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

### 2.4. Trading, Portfolios & Ledgers

#### `portfolios`
Trader account financial balances and equity.
- `id` (UUID, PK, default: `gen_random_uuid()`)
- `event_id` (UUID, FK → `events.id`, NOT NULL)
- `userId` (UUID, FK → `users.id`, NOT NULL)
- `starting_capital` (`numeric(24, 8)`, NOT NULL, default: `'1000000.00000000'`)
- `available_cash` (`numeric(24, 8)`, NOT NULL, check: `>= 0`)
- `reserved_cash` (`numeric(24, 8)`, NOT NULL, default: `'0.00000000'`, check: `>= 0`)
- `realized_pnl` (`numeric(24, 8)`, NOT NULL, default: `'0.00000000'`)
- `daily_pnl` (`numeric(24, 8)`, NOT NULL, default: `'0.00000000'`)
- `updated_at` (TIMESTAMPTZ)
- **Constraint:** UNIQUE on `(event_id, user_id)`

#### `positions`
Open active asset holdings for traders.
- `id` (UUID, PK, default: `gen_random_uuid()`)
- `event_id` (UUID, FK → `events.id`, NOT NULL)
- `user_id` (UUID, FK → `users.id`, NOT NULL)
- `instrument_id` (UUID, FK → `instruments.id`, NOT NULL)
- `side` (`position_side` ENUM: `'LONG'`, `'SHORT'`)
- `quantity` (INTEGER, NOT NULL, default: 0, check: `>= 0`)
- `average_entry_price` (`numeric(24, 8)`)
- `realized_pnl` (`numeric(24, 8)`, NOT NULL, default: `'0.00000000'`)
- `opened_at`, `updated_at` (TIMESTAMPTZ)
- **Constraint:** UNIQUE on `(event_id, user_id, instrument_id)`

#### `orders`
Submitted market orders.
- `id` (UUID, PK, default: `gen_random_uuid()`)
- `public_id` (TEXT, UNIQUE, NOT NULL)
- `event_id` (UUID, FK → `events.id`, NOT NULL)
- `user_id` (UUID, FK → `users.id`, NOT NULL)
- `instrument_id` (UUID, FK → `instruments.id`, NOT NULL)
- `client_order_id` (TEXT, NOT NULL)
- `side` (`order_side` ENUM: `'BUY'`, `'SELL'`, `'CLOSE'`)
- `quantity` (INTEGER, NOT NULL, check: `> 0`)
- `filled_quantity` (INTEGER, NOT NULL, default: 0, check: `>= 0 AND filled_quantity <= quantity`)
- `order_type` (TEXT, NOT NULL, default: `'MARKET'`)
- `status` (`order_status` ENUM: `'PENDING'`, `'ACCEPTED'`, `'FILLED'`, `'REJECTED'`, `'FAILED'`, `'PARTIALLY_FILLED'`, `'CANCEL_REQUESTED'`, `'CANCELLED'`)
- `average_price` (`numeric(24, 8)`)
- `idempotency_key` (TEXT, NOT NULL)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- **Constraints:** UNIQUE on `(event_id, user_id, client_order_id)` and UNIQUE on `(user_id, idempotency_key)`

#### `executions`
Executed trade fills.
- `id` (UUID, PK, default: `gen_random_uuid()`)
- `public_id` (TEXT, UNIQUE, NOT NULL)
- `order_id` (UUID, FK → `orders.id`, NOT NULL)
- `quantity` (INTEGER, NOT NULL, check: `> 0`)
- `price` (`numeric(24, 8)`, NOT NULL, check: `> 0`)
- `executed_at` (TIMESTAMPTZ, NOT NULL, default: `NOW()`)

#### `portfolio_ledger_entries`
Append-only immutable financial audit trail.
- `id` (UUID, PK, default: `gen_random_uuid()`)
- `portfolio_id` (UUID, FK → `portfolios.id`, NOT NULL)
- `order_id` (UUID, FK → `orders.id`, NULLABLE)
- `reason` (`ledger_reason` ENUM: `'INITIAL_CAPITAL'`, `'ORDER_RESERVATION'`, `'ORDER_RESERVATION_RELEASE'`, `'ORDER_EXECUTION'`, `'REALIZED_PNL'`, `'FEE'`, `'ADMIN_ADJUSTMENT'`)
- `amount` (`numeric(24, 8)`, NOT NULL)
- `balance_after` (`numeric(24, 8)`, NOT NULL)
- `metadata` (JSONB, NOT NULL, default: `{}`)
- `created_at` (TIMESTAMPTZ, NOT NULL, default: `NOW()`)

---

### 2.5. Operational & Audit Tables

#### `idempotency_records`
- `id` (UUID, PK), `user_id` (UUID, FK → `users.id`), `key` (TEXT, UNIQUE with user), `request_fingerprint` (TEXT), `response_status` (INT), `response_body` (JSONB), `expires_at`, `created_at`.

#### `news`
- `id` (UUID, PK), `public_id` (TEXT, UNIQUE), `event_id` (UUID), `author_user_id` (UUID, FK → `users.id`), `type` (TEXT), `title` (TEXT), `body` (TEXT), `audience` (TEXT), `published_at` (TIMESTAMPTZ).

#### `audit_logs`
- `id` (UUID, PK), `actor_user_id` (UUID), `action` (TEXT), `resource_type` (TEXT), `resource_id` (TEXT), `previous_state` (JSONB), `new_state` (JSONB), `request_id` (TEXT), `ip_address`, `user_agent`, `metadata` (JSONB), `created_at` (TIMESTAMPTZ).

#### `leaderboard_snapshots`
- `id` (UUID, PK), `event_id` (UUID), `version` (INT), `simulation_day` (INT), `snapshot` (JSONB), `as_of` (TIMESTAMPTZ).

#### `outbox_events`
- `id` (UUID, PK), `event_type` (TEXT), `aggregate_type` (TEXT), `aggregate_id` (TEXT), `payload` (JSONB), `published_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ).
