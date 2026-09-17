# Contract, frontend, and backend mapping (Phase 1)

**Inspection date:** 2026-09-17. **Contract status:** draft, version v1. This report records the contract rather than changing it.

## Frontend application structure

`frontend/` is the Vite/React 19 application (`frontend/package.json`). `src/App.tsx` chooses the participant pages (Dashboard, Positions, Chart, P&L, Balance, Leaderboard) or `src/admin/AdminApp.tsx` for an ADMIN role. Participant UI components are under `src/components/{dashboard,positions,chart,pnl,balance,leaderboard,login}`; admin pages are under `src/components/admin/pages`. There is no shared HTTP client and no deployed environment file, Docker file, README, database code, or WebSocket client in the frontend.

Authentication is memory-only React state in `src/contexts/AuthContext.tsx`; `login()` currently calls the mock adapter. It uses legacy camelCase UI contracts that conflict with the repository v1 contracts (see inconsistencies).

## Frontend API service functions and mocks

| Service | Functions | Current implementation / mock functions |
|---|---|---|
| `lib/api/auth.ts` | `login` | `mockLogin` |
| `lib/api/market.ts` | `getMarketState`, `getMarketData` | `mockGetMarketState`, `mockGetMarketData` |
| `lib/api/portfolio.ts` | `getPortfolioSummary` | `mockGetPortfolioSummary` |
| `lib/api/orders.ts` | `submitOrder` | inline timeout and fabricated response (not an adapter) |
| `lib/api/positions.ts` | `getPositions`, `closePosition` | `mockGetPositions`, `mockClosePosition` |
| `lib/api/admin.ts` | event, simulation, market, participant, monitoring, news, audit and dataset functions listed below | 31 `mock*` exports in `mocks/adminMockData.ts` |
| `mocks/leaderboard.ts` | no current service wrapper | `mockGetLeaderboard` |

Admin functions are: event get/start/pause/resume/end; config get/set (set deliberately throws NOT_IMPLEMENTED); simulation get/start/pause/resume/close-day/next-day; market get/open/pause/resume/halt/close; participant list/get/enable/disable; monitoring system/orders/positions/leaderboard; news list/create; audit list; datasets list. Mocks are retained until real adapters are introduced.

## Contract endpoint inventory and frontend mapping

| Area | Required v1 endpoints | Frontend status |
|---|---|---|
| Auth | `POST /auth/login`, `/auth/logout`, `/auth/refresh`; `GET /auth/me` | Login mock only; logout/refresh/me missing |
| Market | `GET /market/status`, `/market/instruments`, `/market/instruments/{symbol}`, `/market/quote/{symbol}`, `/market/candles/{symbol}` | legacy market mock only |
| Orders | `POST /orders`; `GET /orders`, `/orders/{order_id}`; `POST /orders/{order_id}/cancel` | fabricated submit only |
| Positions | `GET /positions`, `/positions/{symbol}` | legacy list/close mock; close is an order action under v1 |
| Portfolio | `GET /portfolio`, `/portfolio/balance`, `/portfolio/pnl` | legacy summary mock |
| Leaderboard | `GET /leaderboard`, `/leaderboard/me` | mock exists but lacks service |
| News | `GET /news` | no participant API adapter |
| Admin | `GET /admin/event`, `/event/config`, `/simulation`, `/market`, `/news`, `/participants`, `/participants/{participant_id}`, `/monitoring/system`, `/monitoring/orders`, `/monitoring/positions`, `/monitoring/leaderboard`, `/audit`; mutation routes documented in `contracts/v1/admin.md` | all mock-backed |
| WebSocket | `/api/v1/ws` | no client implementation |

All listed API paths are prefixed `/api/v1`. Admin mutations: `POST /admin/event/{start,pause,resume,end}`, `PUT /admin/event/config`, `POST /admin/simulation/{start,pause,resume,close-day,next-day}`, `POST /admin/market/{open,pause,resume,halt,close}`, `POST /admin/news`, and `POST /admin/participants/{participant_id}/{enable,disable}`.

## Request/response, authentication, and authorization

Every endpoint uses JSON, snake_case payloads, UTC ISO-8601 `Z` timestamps, string decimals, public prefixed IDs, `X-Request-ID`, and `{data,request_id}` / collection / error envelopes. Cursor pagination applies to orders; offset pagination applies to leaderboard. Auth is bearer access token plus refresh token: login accepts `participant_id` and password; refresh is body token; logout and me authenticate. Only login, refresh, and market status are anonymous. All other participant data is identity-scoped. Every `/admin` route requires authenticated ADMIN authorization; client routing is never sufficient. State-changing orders and admin commands require persisted idempotency support.

## WebSocket event requirements

The protocol authenticates immediately then subscribes to `market`, `orders`, `portfolio`, `leaderboard`, `system`, or `news` (with optional symbols). Server events are `market.quote`, `market.candle`, `order.updated`, `position.updated`, `portfolio.updated`, `leaderboard.updated`, `system.status`, and `news.created`. Envelopes include connection-scoped sequence and `evt_` event IDs. `order`, `position`, and `portfolio` are private; all events require authentication. Ping/pong, auth timeout, subscription acknowledgements, close codes, reconnect and REST reconciliation are contract requirements. No v1 replay exists.

## Required durable entities

Users, refresh sessions, events/configuration, event participants, datasets/versions/instruments/candles, simulation cursor and day state, market state, portfolios, ledger entries, positions (including zero history), orders, executions, persisted idempotency records, news, leaderboard snapshots, audit logs, and simulation worker leases/advisory-lock coordination are required. PostgreSQL—not process memory—is authoritative.

## State machines and financial requirements

Event: `SETUP → READY → RUNNING ↔ PAUSED → ENDED`; ENDED is terminal. Simulation: `STOPPED → RUNNING ↔ PAUSED`; day: `PRE_OPEN → OPEN → CLOSED`; market: `PRE_OPEN → OPEN ↔ PAUSED`, `OPEN/PAUSED → HALTED`, and close only through the documented day-close process. Invalid commands use the documented admin conflict codes.

Orders are MARKET-only and immediate against the latest committed 10-second candle close: `PENDING → ACCEPTED → FILLED`, with failure/exception states in the contract. No order book or participant matching. CLOSE validates a position and contract excess rule. Positions transition LONG/SHORT by side and crossing quantity; flips first realize/close then open the residual at the execution price without average-price blending. Portfolio needs cash, available/reserved cash, equity, buying power, invested/market value, realized/unrealized/total P&L, ledger and history. Decimal.js and PostgreSQL numeric columns are mandatory. The contract explicitly leaves the SHORT cash/margin model open.

## Contract inconsistencies and unresolved assumptions

1. Contracts declare an external Order Execution Service in `contracts/README.md`, while the requested implementation demands an in-backend transaction engine. Phase 2+ must record the boundary decision before implementing orders.
2. `orders.md` says the 201 create response is PENDING and execution is asynchronous; the conventions say valid orders fully fill immediately, while the user request specifies transaction-time execution. The durability/publishing sequence must be reconciled before Phase 7.
3. The frontend's `src/contracts/v1/*` are a separate legacy camelCase/number-based contract: different login fields/response, MARKET statuses, decimal types, order body, and position close semantics. It cannot be directly wired to the repository contract without deliberate adapter changes.
4. `admin.ts` frontend says config update is pending despite `PUT /admin/event/config` being in the contract.
5. Contract documents are DRAFT, not approved. No endpoint semantics should be silently finalized.
6. The contract identifies fees/slippage and SHORT cash/margin as remaining implementation decisions; these must be isolated and documented in Phase 6.

## Phase 2 implementation record

Phase 2 adds the executable PostgreSQL migration, matching Drizzle schema, sample dataset seed, explicit password-gated user seeds, and schema artifact tests. It deliberately does **not** implement endpoint behavior, authentication, a simulation worker, financial mutations, or order execution. See `docs/database-schema.md`.

## Recommended implementation order

1. Phase 2: Drizzle schema/migrations, DB health, seed foundation and transaction/repository primitives.
2. Phase 3: users, token rotation, authorization, audit foundation, frontend HTTP client migration.
3. Phase 4–5: dataset validation, lifecycle state, worker lease and read-only market APIs.
4. Phase 6–7: financial model, ledger/positions, then idempotent transaction-safe orders after resolving execution ambiguity.
5. Phase 8: WebSocket publisher and gateway after durable state exists.
6. Phase 9: leaderboard/news/admin monitoring and controls.
7. Phase 10: replace each compatible mock gradually; add contract, integration, recovery, and concurrency tests.
