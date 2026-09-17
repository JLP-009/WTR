# Backend architecture (Phase 1)

## Module boundaries

`backend/src/app.ts` composes cross-cutting plugins and routes. `routes.ts` stays thin; Phase 2+ routes validate transport input and call module services. Each domain module (`auth`, `users`, `events`, `simulation`, `market`, `datasets`, `instruments`, `portfolio`, `positions`, `orders`, `executions`, `leaderboard`, `news`, `admin`, `audit`, `websocket`) will expose schemas, service operations, and repositories. Cross-module business orchestration belongs in services, never a route handler or repository.

## Database and repository architecture

PostgreSQL is the durable authority. Drizzle configuration and a `postgres` client factory are present; Phase 2 will add the contract-derived schema, foreign keys, numeric columns, indexes, migrations, seed data, and repositories. Database records use internal keys; serializer services create public prefixed IDs and response envelopes. Decimal.js is the calculation boundary and PostgreSQL `numeric` is the persistence boundary.

## Transaction boundaries

A single transaction will cover each financial or administrative mutation: lock account/position rows; validate authoritative lifecycle state and idempotency; mutate order, execution, position, portfolio, and append-only ledger/audit records; persist an outbox event; commit. Publishers run only after commit (or consume the durable outbox). DB uniqueness protects idempotency and client-order identity; row locks protect cash and positions. Lifecycle changes use a single state row plus transactional conditional transition; simulation uses PostgreSQL advisory locks or durable leases.

## HTTP, security, and errors

Fastify has a 1 MiB body limit, Pino logging, CORS, Helmet, rate limiting, request IDs, and a global sanitized error handler. The request-ID plugin accepts only contract-valid client IDs or generates `req_` IDs, echoes the header, and all route/error bodies carry `request_id`. Zod will validate headers, params, query, and body. Auth will issue short access JWTs and rotated persisted refresh tokens; authorization middleware will enforce user ownership and ADMIN role independently of frontend visibility. Passwords use Argon2 in Phase 3; tokens, secrets and credentials are never logged.

## WebSocket architecture

A Fastify-compatible WebSocket gateway will require an auth message immediately, validate subscriptions, emit connection-scoped sequences, and clean connections on close. A publisher abstraction—not repositories—will route post-commit outbox events. Private routing must use a shared broker or durable routing mechanism for multi-instance deployment; local connection maps may only be an edge cache. Reconnect uses REST resynchronization because v1 does not replay events.

## Simulation worker and recovery

A worker obtains a durable DB lease/advisory lock per event, advances exactly one fully transactional 10-second interval, commits cursor/current candle/market state atomically, then publishes. It never treats process memory as authority. On restart, it reloads cursor/state and follows contract restrictions rather than auto-resuming a forbidden state. Interval IDs and conditional cursor updates prevent duplicate day or interval advancement.

## Idempotency and recovery

The idempotency repository stores actor, key, request fingerprint, status, canonical response, and expiry in PostgreSQL. Same key/same request returns the saved result; same key/different request is conflict. Client order ID has a distinct unique anchor. A transactional outbox closes the commit-to-publish gap. Database/service outages produce sanitized `503 SYSTEM_UNAVAILABLE` with recovery-safe behavior; clients resolve ambiguity through the documented REST lookups and same keys.

## Phase 2 schema implementation

The Phase 2 migration creates the durable entities identified in the mapping: identities and refresh-token records; immutable dataset metadata, instruments and canonical candles; event configuration and simulation cursor/lease state; participant portfolios/positions; the future order/execution/ledger/idempotency structures; plus news, leaderboard snapshots, audit logs and a transactional outbox. Database checks protect positive quantities, prices, cash and cursor values, candle OHLC invariants, and unique identities/idempotency keys. The schema deliberately stores numeric financial values as `numeric(24,8)` and maps them to string values in Drizzle; no money field is a floating-point column. Order rows and ledger tables are persistence preparation only in this phase—no execution service is implemented.
