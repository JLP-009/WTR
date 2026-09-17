# Phase 2 database schema

The PostgreSQL migration at `backend/src/db/migrations/0000_phase_two_schema.sql` is the executable source for the Phase 2 schema; `backend/src/db/schema/index.ts` is its Drizzle representation.

## Durable aggregates

* **Identity:** `users` has opaque public IDs and unique participant IDs; `refresh_tokens` stores only token hashes and revocation/expiry state.
* **Market data:** immutable versioned `datasets`, reusable `instruments`, and `dataset_candles` uniquely identify every dataset/symbol/day/10-second interval and protect OHLC invariants.
* **Event lifecycle:** `events`, `event_instruments`, `event_participants`, and one `simulation_states` row per event persist configuration, cursor, and worker lease fields.
* **Financial persistence preparation:** `portfolios`, `positions`, `orders`, `executions`, and `portfolio_ledger_entries` use PostgreSQL `numeric(24,8)` values. They contain no Phase 2 execution behavior.
* **Reliability/audit:** persisted `idempotency_records`, `audit_logs`, `outbox_events`, `news`, and `leaderboard_snapshots` support the later transaction/outbox design.

## Integrity and indices

The migration uses foreign keys, public/client/idempotency uniqueness, checks for positive numeric and quantity values, non-negative cash/cursor/volume values, and constraints for candle OHLC ordering. It includes lookup indices for participant order history, canonical candle retrieval, audit resource history, and unpublished outbox work.

## Seed data

`db:seed` creates a deterministic one-day/72-interval NIFTY development dataset. `seed:admin` and `seed:participant` deliberately require explicit password environment variables and hash them using Argon2. Seeds are idempotent at the database uniqueness boundary.

## Deferred decisions

No financial mutation, worker, authentication endpoint, or order execution is implemented in this phase. SHORT margin/cash treatment, fee/slippage policy, and the contract's async-versus-immediate order-completion inconsistency remain deferred to their designated phases.
