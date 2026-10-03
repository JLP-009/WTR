# Graph Report - WTR-codex-implement-backend-with-frontend-integration  (2026-10-03)

## Corpus Check
- 162 files · ~97,334 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: .csv 12, (none) 4, .example 1)

## Summary
- 1032 nodes · 2333 edges · 84 communities (56 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03fd6d13`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ChartPage.tsx
- api/admin.ts
- schema/index.ts
- frontend/package.json
- ErrorState
- SkeletonCard
- react
- PnlPage.tsx
- auth.service.ts
- ISOTimestamp
- types/admin.ts
- schemas/websocket.ts
- WebSocketGateway
- AuthContext.tsx
- DecimalString
- AdminApp.tsx
- Backend Dependencies & Scripts
- backend/package.json
- scripts
- env.ts
- shared.ts
- Portfolio API Contract v1
- App.tsx
- dependencies
- AppError
- compilerOptions
- API Contracts Shared Communication Layer
- common.ts
- order.ts
- LeaderboardPage.tsx
- dataset.ts
- Simulation, Event, and Lifecycle Contract v1
- ParticipantsPage.tsx
- 0000_phase_two_schema.sql
- WebSocketClient
- schemas/auth.ts
- Header.tsx
- NewsPage.tsx
- adminMockData.ts
- migrate-news-type.ts
- OrdersPage.tsx
- POST /api/v1/orders Submission & Validation Pipeline
- Recovery & Failure Scenarios Contract v1
- schema.test.ts
- SimulationPage.tsx
- market.service.ts
- order.service.ts
- AdminDashboard.tsx
- position.ts
- Fastify Backend Service
- Public Logo PNG Asset
- MetricCard.tsx
- Warangal Trading Ring Master Frontend Spec
- Graphify Query and Graph Update Rules
- Warangal Trading Ring 2.0 System Audit & Capacity Plan
- Fastify Backend Application Container
- Backend Container Services Compose Config
- EventControlPage.tsx
- Issue 1: CLOSE Order Quantity Field Invariants
- Issue 12: Reconnect Market Status Simulation Context
- GET /api/v1/news Participant Endpoint
- Frontend Agent & Tooling Instructions
- Chart Page Specification
- Graphify Knowledge Graph Architecture
- 300 Active Traders Worst-Case Stress Simulation
- Adversarial Audit Report on API Contract
- Public Identifiers & ULID/UUID Conventions
- No-Matching-Engine Immediate Fill Semantics
- Multi-Agent System Architectural Boundaries
- Immutable Administrative Action Audit Log
- Admin Event Lifecycle Controls
- Admin Simulation Interval & Day Controls
- JWT Access Token & Sliding Refresh Token Scheme
- Admin Command Center & Simulation Speed Control
- TradingView Lightweight Charts & 2-Second Micro-Ticks
- Fastify 5 + PostgreSQL 16 + React 19 Stack
- MarketPage.tsx
- auth.types.ts
- AuditLogPage.tsx
- api/client.ts

## God Nodes (most connected - your core abstractions)
1. `ErrorState()` - 39 edges
2. `ISOTimestamp` - 37 edges
3. `SkeletonCard()` - 35 edges
4. `react` - 32 edges
5. `delay()` - 31 edges
6. `lucide-react` - 28 edges
7. `AppError` - 25 edges
8. `DecimalString` - 23 edges
9. `StatusBadge()` - 20 edges
10. `scripts` - 19 edges

## Surprising Connections (you probably didn't know these)
- `LONG & SHORT UI Model & Position Flip Warning` --conceptually_related_to--> `Position State Transitions & Flipping`  [INFERRED]
  frontend/src/imports/pasted_text/frontend-ui-refinement.md → contracts/v1/positions.md
- `Immediate Market Execution Engine` --conceptually_related_to--> `PENDING-ACCEPTED-FILLED Order Lifecycle State Machine`  [INFERRED]
  README.md → contracts/v1/orders.md
- `Durable Schema Aggregates` --shares_data_with--> `Master Simulation Dataset Model (10s OHLCV)`  [INFERRED]
  docs/database-schema.md → contracts/v1/simulation.md
- `Simulation Worker with Advisory Locks` --conceptually_related_to--> `Authoritative Simulation Cursor`  [INFERRED]
  docs/backend-architecture.md → contracts/v1/simulation.md
- `Zero-Float & Concurrency Security Audit Checklist` --references--> `Zero-Float Decimal String Financial Precision`  [INFERRED]
  AUDIT_REPORT.md → contracts/conventions.md

## Import Cycles
- None detected.

## Communities (84 total, 28 thin omitted)

### Community 0 - "ChartPage.tsx"
Cohesion: 0.07
Nodes (46): RFC-4122, ChartPage(), fmt(), FlipWarning(), FlipWarningProps, LWChart(), LWChartProps, PositionLineData (+38 more)

### Community 1 - "api/admin.ts"
Cohesion: 0.14
Nodes (24): AdminApiError, closeMarket(), disableParticipant(), enableParticipant(), getAdminLeaderboard(), getAdminMarket(), getAdminOrders(), getAdminPositions() (+16 more)

### Community 2 - "schema/index.ts"
Cohesion: 0.05
Nodes (41): accountStatus, AuditLog, auditLogs, Dataset, DatasetCandle, datasetValidationStatus, dayStatus, Event (+33 more)

### Community 3 - "frontend/package.json"
Cohesion: 0.05
Nodes (37): dependencies, lightweight-charts, lucide-react, react, react-dom, react-is, recharts, devDependencies (+29 more)

### Community 4 - "ErrorState"
Cohesion: 0.27
Nodes (9): AdminLeaderboardPage(), fmtCur(), medalFor(), pnlColor(), Props, State, ErrorState(), ErrorStateProps (+1 more)

### Community 5 - "SkeletonCard"
Cohesion: 0.20
Nodes (14): DatasetPage(), fmt(), ValidationIcon(), fmtCur(), pnlColor(), pnlPrefix(), PositionsPage(), EmptyState() (+6 more)

### Community 6 - "react"
Cohesion: 0.18
Nodes (13): Route, DaySessionTimerProps, DashboardPage(), DashboardPageProps, fmt(), NewsItem, HeaderProps, BottomNavigationProps (+5 more)

### Community 7 - "PnlPage.tsx"
Cohesion: 0.22
Nodes (15): BalancePage(), BalanceRow(), BalanceRowProps, fmt(), fmt(), PERF_DATA, PnlPage(), StatRow() (+7 more)

### Community 8 - "auth.service.ts"
Cohesion: 0.15
Nodes (19): generateRefreshToken(), hashRefreshToken(), signAccessToken(), TokenPayload, verifyAccessToken(), hashPassword(), verifyPassword(), fastify (+11 more)

### Community 9 - "ISOTimestamp"
Cohesion: 0.09
Nodes (27): ISOTimestamp, LeaderboardEntry, LeaderboardQueryParams, LeaderboardResponse, MyLeaderboardResponse, AdminErrorCode, AuditRecord, CreateNewsRequest (+19 more)

### Community 10 - "types/admin.ts"
Cohesion: 0.08
Nodes (28): AnyStatus, STATUS_CONFIG, StatusBadgeProps, AdminHeaderProps, ADMIN_ERROR_MESSAGES, AdminDataset, AdminEventState, AdminLeaderboard (+20 more)

### Community 11 - "schemas/websocket.ts"
Cohesion: 0.09
Nodes (24): EventId, MarketStatus, AnyWsEvent, OrderUpdatedPayload, PortfolioUpdatedPayload, PositionUpdatedPayload, SystemStatusPayload, WsAuthFailedMessage (+16 more)

### Community 12 - "WebSocketGateway"
Cohesion: 0.26
Nodes (4): SimulationWorker, WebSocketGateway, FastifyInstance, websocketPlugin

### Community 13 - "AuthContext.tsx"
Cohesion: 0.19
Nodes (16): AuthContext, AuthContextValue, AuthProvider(), AuthState, LoginRequest, LoginResponse, Participant, UserRole (+8 more)

### Community 14 - "DecimalString"
Cohesion: 0.16
Nodes (17): DecimalString, Candle, CandleQueryParams, CandleResponse, CandleTimeframe, Instrument, InstrumentStatus, InstrumentType (+9 more)

### Community 15 - "AdminApp.tsx"
Cohesion: 0.20
Nodes (10): AdminApp(), AdminRoute, ROUTE_META, AdminHeader(), AdminLayout(), AdminLayoutProps, AdminSidebar(), AdminSidebarProps (+2 more)

### Community 16 - "Backend Dependencies & Scripts"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+10 more)

### Community 17 - "backend/package.json"
Cohesion: 0.09
Nodes (21): engines, node, @types/node, typescript, name, private, type, version (+13 more)

### Community 18 - "scripts"
Cohesion: 0.07
Nodes (26): devDependencies, drizzle-kit, tsx, @types/node, @types/ws, typescript, vitest, scripts (+18 more)

### Community 19 - "env.ts"
Cohesion: 0.14
Nodes (19): db, db, env, resetTradeLogs(), db, env, buildApp(), Environment (+11 more)

### Community 20 - "shared.ts"
Cohesion: 0.18
Nodes (12): importPath(), parseCSVLine(), users, db, db, ADMIN_PARTICIPANT_ID, env, PARTICIPANT_ID (+4 more)

### Community 21 - "Portfolio API Contract v1"
Cohesion: 0.12
Nodes (13): GET /api/v1/portfolio/balance, Portfolio API Contract v1, Portfolio Financial Field Definitions, GET /api/v1/portfolio/pnl, GET /api/v1/portfolio Snapshot, Positions API Contract v1, GET /api/v1/positions, LONG & SHORT Position Model (+5 more)

### Community 22 - "App.tsx"
Cohesion: 0.19
Nodes (13): App(), AppContent(), SIDEBAR_ITEMS, PageContainer(), PageContainerProps, AuthMode, LoginPage(), LoginPageProps (+5 more)

### Community 23 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, argon2, decimal.js, drizzle-orm, fastify, @fastify/cors, @fastify/helmet, fastify-plugin (+6 more)

### Community 24 - "AppError"
Cohesion: 0.15
Nodes (15): AppError, adminRoutes(), authRoutes(), leaderboardRoutes(), marketRoutes(), MarketService, createNewsSchema, newsRoutes() (+7 more)

### Community 25 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, rootDir, skipLibCheck (+5 more)

### Community 26 - "API Contracts Shared Communication Layer"
Cohesion: 0.14
Nodes (13): API Global Conventions & Protocols, V1 Execution Model Convention, Immediate Execution Model Architecture Final Report, API Contracts Shared Communication Layer, Admin API Contract Specification, Authentication & Authorization Contract Specification, Error Handling & Standard Error Envelope, Leaderboard API Contract Specification (+5 more)

### Community 27 - "common.ts"
Cohesion: 0.14
Nodes (13): AdminErrorCode, AnyErrorCode, ApiCollectionResponse, ApiError, ApiErrorResponse, ApiOffsetResponse, ApiResponse, CursorPaginationParams (+5 more)

### Community 28 - "order.ts"
Cohesion: 0.21
Nodes (12): ClientOrderId, ExecutionId, OrderId, CancelOrderResponse, CreateOrderRequest, Execution, ListOrdersParams, Order (+4 more)

### Community 29 - "LeaderboardPage.tsx"
Cohesion: 0.26
Nodes (11): EntryRow(), EntryRowProps, fmt(), LeaderboardPage(), LeaderboardPageProps, LeaderboardEntry, LeaderboardResponse, BackendLeaderboardEntry (+3 more)

### Community 30 - "dataset.ts"
Cohesion: 0.33
Nodes (4): datasetCandles, datasets, instruments, db

### Community 31 - "Simulation, Event, and Lifecycle Contract v1"
Cohesion: 0.15
Nodes (13): Admin Lifecycle Commands, Authoritative Price Resolution Mechanism, Simulation, Event, and Lifecycle Contract v1, Three Simulation Lifecycle Domains, Master Simulation Dataset Model (10s OHLCV), Authoritative Simulation Cursor, Backend Architecture (Phase 1), PostgreSQL Idempotency & Transactional Outbox (+5 more)

### Community 32 - "ParticipantsPage.tsx"
Cohesion: 0.33
Nodes (8): ConfirmDialog(), ConfirmDialogProps, ActionType, fmtCur(), ParticipantsPage(), pnlColor(), disableAdminParticipant, enableAdminParticipant

### Community 33 - "0000_phase_two_schema.sql"
Cohesion: 0.19
Nodes (23): "audit_logs", audit_logs_resource_idx, "dataset_candles", dataset_candles_lookup_idx, "datasets", "event_instruments", "event_participants", "events" (+15 more)

### Community 35 - "schemas/auth.ts"
Cohesion: 0.14
Nodes (15): AccountStatus, AuthenticatedUser, LoginRequest, LoginResponse, LogoutResponse, MeResponse, RefreshRequest, RefreshResponse (+7 more)

### Community 36 - "Header.tsx"
Cohesion: 0.20
Nodes (11): ClubLogo(), ClubLogoProps, Header(), NewsItem, relTime(), TYPE_STYLES, ThemeToggle(), Theme (+3 more)

### Community 37 - "NewsPage.tsx"
Cohesion: 0.29
Nodes (9): INITIAL_FORM, NewsPage(), rel(), TYPE_COLORS, TYPE_LABELS, createAdminNews(), generateIdempotencyKey(), getAdminNews() (+1 more)

### Community 38 - "adminMockData.ts"
Cohesion: 0.12
Nodes (25): getAdminParticipant(), getAdminParticipants(), delay(), _eventState, MOCK_AUDIT, MOCK_DATASETS, MOCK_ORDERS, MOCK_PARTICIPANTS (+17 more)

### Community 39 - "migrate-news-type.ts"
Cohesion: 0.50
Nodes (4): env, main(), sql, postgres

### Community 40 - "OrdersPage.tsx"
Cohesion: 0.43
Nodes (6): fmtCur(), fmtTime(), OrdersPage(), SIDES, STATUSES, getAdminOrdersMonitor

### Community 41 - "POST /api/v1/orders Submission & Validation Pipeline"
Cohesion: 0.25
Nodes (4): Comprehensive API & Admin Error Codes Reference, Canonical 10-Second OHLCV Candles & Timeframe Aggregation, Authoritative Market Quotes & Execution Price Derivation, POST /api/v1/orders Submission & Validation Pipeline

### Community 42 - "Recovery & Failure Scenarios Contract v1"
Cohesion: 0.25
Nodes (8): API Restart & Exponential Backoff Recovery, Recovery & Failure Scenarios Contract v1, Order Submission Timeout & Idempotency, WebSocket Disconnection & REST Reconciliation, WebSocket Connection Lifecycle, WebSocket Contract v1, Public vs Private Event Isolation, WebSocket Reconnect & State Resync Strategy

### Community 43 - "schema.test.ts"
Cohesion: 0.33
Nodes (4): idempotencyRecords, orders, portfolios, simulationStates

### Community 44 - "SimulationPage.tsx"
Cohesion: 0.19
Nodes (18): ProgressBar(), SimAction, SimulationPage(), closeDay(), closeDayAdmin, getAdminSimulation(), nextDay(), nextDayAdmin (+10 more)

### Community 45 - "market.service.ts"
Cohesion: 0.16
Nodes (9): LeaderboardEntry, CandleData, InstrumentData, MarketStatusData, QuoteData, CachedPrice, livePriceCache, PriceCache (+1 more)

### Community 46 - "order.service.ts"
Cohesion: 0.30
Nodes (6): orderRoutes(), OrderService, ExecutionResponse, OrderResponse, SubmitOrderRequest, submitOrderSchema

### Community 47 - "AdminDashboard.tsx"
Cohesion: 0.21
Nodes (15): DaySessionTimer(), StatCard(), StatCardProps, StatusBadge(), AdminDashboard(), DashboardProps, fmtCur(), fmtNum() (+7 more)

### Community 48 - "position.ts"
Cohesion: 0.40
Nodes (3): ListPositionsParams, Position, PositionSide

### Community 49 - "Fastify Backend Service"
Cohesion: 1.00
Nodes (3): Fastify Backend Service, Docker Compose Configuration, PostgreSQL 16 Alpine Service

### Community 50 - "Public Logo PNG Asset"
Cohesion: 0.67
Nodes (3): Vite HTML Shell Entrypoint, Public Logo PNG Asset, Source Logo PNG Asset

### Community 52 - "Warangal Trading Ring Master Frontend Spec"
Cohesion: 0.67
Nodes (3): Leaderboard Mobile Access Specification, WTR Design System & Theming Tokens, Warangal Trading Ring Master Frontend Spec

### Community 58 - "EventControlPage.tsx"
Cohesion: 0.33
Nodes (11): DialogType, EventControlPage(), Field(), endAdminEvent(), getAdminEvent(), getAdminEventConfig(), pauseAdminEvent(), resumeAdminEvent() (+3 more)

### Community 80 - "MarketPage.tsx"
Cohesion: 0.36
Nodes (9): fmt(), MarketAction, MarketPage(), PriceRow(), closeMarketAdmin, haltMarketAdmin, openMarketAdmin, pauseMarketAdmin (+1 more)

### Community 81 - "auth.types.ts"
Cohesion: 0.39
Nodes (6): AuthUserResponse, loginRequestSchema, RefreshRequest, refreshRequestSchema, registerRequestSchema, resetPasswordRequestSchema

### Community 82 - "AuditLogPage.tsx"
Cohesion: 0.43
Nodes (6): ACTION_COLORS, ActionBadge(), AuditLogPage(), fmt(), getAdminAuditLog(), AuditAction

### Community 83 - "api/client.ts"
Cohesion: 0.43
Nodes (6): api, ApiResponse, getAuthToken(), getRefreshToken(), request(), setAuthToken()

## Knowledge Gaps
- **376 isolated node(s):** `name`, `private`, `version`, `type`, `node` (+371 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 415 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `ParticipantsPage.tsx`, `ChartPage.tsx`, `frontend/package.json`, `ErrorState`, `SkeletonCard`, `NewsPage.tsx`, `PnlPage.tsx`, `OrdersPage.tsx`, `Header.tsx`, `SimulationPage.tsx`, `AuthContext.tsx`, `AdminDashboard.tsx`, `AdminApp.tsx`, `MarketPage.tsx`, `AuditLogPage.tsx`, `App.tsx`, `EventControlPage.tsx`, `LeaderboardPage.tsx`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `react` to `ParticipantsPage.tsx`, `ChartPage.tsx`, `frontend/package.json`, `ErrorState`, `SkeletonCard`, `NewsPage.tsx`, `Header.tsx`, `OrdersPage.tsx`, `types/admin.ts`, `SimulationPage.tsx`, `AdminApp.tsx`, `AdminDashboard.tsx`, `MarketPage.tsx`, `AuditLogPage.tsx`, `App.tsx`, `EventControlPage.tsx`, `LeaderboardPage.tsx`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `drizzle-orm` connect `env.ts` to `schema/index.ts`, `auth.service.ts`, `schema.test.ts`, `market.service.ts`, `order.service.ts`, `backend/package.json`, `shared.ts`, `AppError`, `dataset.ts`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _376 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ChartPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07188778492109878 - nodes in this community are weakly interconnected._
- **Should `api/admin.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13675213675213677 - nodes in this community are weakly interconnected._
- **Should `schema/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._