# Graph Report - WTR-codex-implement-backend-with-frontend-integration  (2026-09-30)

## Corpus Check
- 161 files · ~95,162 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: .csv 12, (none) 4, .example 1)

## Summary
- 1023 nodes · 2295 edges · 83 communities (55 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.84)
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
- AuditLogPage.tsx
- MarketService
- App.tsx
- PnlPage.tsx
- auth.service.ts
- ISOTimestamp
- types/admin.ts
- schemas/websocket.ts
- Environment
- AuthContext.tsx
- DecimalString
- StatusBadge
- Backend Dependencies & Scripts
- backend/package.json
- scripts
- env.ts
- shared.ts
- Portfolio API Contract v1
- AdminDashboard.tsx
- dependencies
- routes.ts
- compilerOptions
- API Contracts Shared Communication Layer
- common.ts
- order.ts
- LeaderboardPage.tsx
- schema.test.ts
- Simulation, Event, and Lifecycle Contract v1
- NewsPage.tsx
- 0000_phase_two_schema.sql
- DashboardPage.tsx
- schemas/auth.ts
- portfolio.service.ts
- auth.types.ts
- AppError
- LoginPage.tsx
- security.ts
- POST /api/v1/orders Submission & Validation Pipeline
- Recovery & Failure Scenarios Contract v1
- AdminApp.tsx
- devDependencies
- DatasetPage.tsx
- Header.tsx
- migrate-news-type.ts
- position.ts
- Fastify Backend Service
- Public Logo PNG Asset
- MetricCard.tsx
- Warangal Trading Ring Master Frontend Spec
- Graphify Query and Graph Update Rules
- Warangal Trading Ring 2.0 System Audit & Capacity Plan
- Fastify Backend Application Container
- Backend Container Services Compose Config
- pages/PositionsPage.tsx
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
- ErrorState
- OrdersPage.tsx
- PriceCache

## God Nodes (most connected - your core abstractions)
1. `ErrorState()` - 39 edges
2. `ISOTimestamp` - 37 edges
3. `SkeletonCard()` - 35 edges
4. `react` - 31 edges
5. `delay()` - 31 edges
6. `lucide-react` - 27 edges
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

## Communities (83 total, 28 thin omitted)

### Community 0 - "ChartPage.tsx"
Cohesion: 0.06
Nodes (51): ChartPage(), fmt(), FlipWarning(), FlipWarningProps, LWChart(), LWChartProps, PositionLineData, toChartTheme() (+43 more)

### Community 1 - "api/admin.ts"
Cohesion: 0.05
Nodes (93): RFC-4122, ConfirmDialog(), ConfirmDialogProps, DialogType, EventControlPage(), Field(), fmt(), MarketAction (+85 more)

### Community 2 - "schema/index.ts"
Cohesion: 0.05
Nodes (41): accountStatus, AuditLog, auditLogs, Dataset, DatasetCandle, datasetValidationStatus, dayStatus, Event (+33 more)

### Community 3 - "frontend/package.json"
Cohesion: 0.05
Nodes (38): dependencies, lightweight-charts, lucide-react, react, react-dom, react-is, recharts, devDependencies (+30 more)

### Community 4 - "AuditLogPage.tsx"
Cohesion: 0.19
Nodes (14): AdminLeaderboardPage(), fmtCur(), medalFor(), pnlColor(), ACTION_COLORS, ActionBadge(), AuditLogPage(), fmt() (+6 more)

### Community 5 - "MarketService"
Cohesion: 0.33
Nodes (5): adminRoutes(), LeaderboardEntry, leaderboardRoutes(), marketRoutes(), MarketService

### Community 6 - "App.tsx"
Cohesion: 0.20
Nodes (11): App(), AppContent(), SIDEBAR_ITEMS, PageContainer(), PageContainerProps, BottomNavigation(), Theme, ThemeContext (+3 more)

### Community 7 - "PnlPage.tsx"
Cohesion: 0.26
Nodes (10): fmt(), PERF_DATA, PnlPage(), StatRow(), StatRowProps, PortfolioSummary, BackendPortfolio, getPortfolioSummary() (+2 more)

### Community 8 - "auth.service.ts"
Cohesion: 0.14
Nodes (19): generateRefreshToken(), hashRefreshToken(), signAccessToken(), TokenPayload, verifyAccessToken(), hashPassword(), verifyPassword(), fastify (+11 more)

### Community 9 - "ISOTimestamp"
Cohesion: 0.09
Nodes (27): ISOTimestamp, LeaderboardEntry, LeaderboardQueryParams, LeaderboardResponse, MyLeaderboardResponse, AdminErrorCode, AuditRecord, CreateNewsRequest (+19 more)

### Community 10 - "types/admin.ts"
Cohesion: 0.10
Nodes (22): AnyStatus, STATUS_CONFIG, StatusBadgeProps, ADMIN_ERROR_MESSAGES, AdminEventConfig, AdminLeaderboardEntry, AdminMonitoringState, AdminMonitoringView (+14 more)

### Community 11 - "schemas/websocket.ts"
Cohesion: 0.09
Nodes (24): EventId, MarketStatus, AnyWsEvent, OrderUpdatedPayload, PortfolioUpdatedPayload, PositionUpdatedPayload, SystemStatusPayload, WsAuthFailedMessage (+16 more)

### Community 12 - "Environment"
Cohesion: 0.19
Nodes (9): Environment, Database, SimulationWorker, WebSocketGateway, AuthPluginOptions, fastify, FastifyInstance, websocketPlugin (+1 more)

### Community 13 - "AuthContext.tsx"
Cohesion: 0.19
Nodes (16): AuthContext, AuthContextValue, AuthProvider(), AuthState, LoginRequest, LoginResponse, Participant, UserRole (+8 more)

### Community 14 - "DecimalString"
Cohesion: 0.16
Nodes (17): DecimalString, Candle, CandleQueryParams, CandleResponse, CandleTimeframe, Instrument, InstrumentStatus, InstrumentType (+9 more)

### Community 15 - "StatusBadge"
Cohesion: 0.25
Nodes (11): AdminRoute, StatusBadge(), AdminHeader(), AdminHeaderProps, AdminLayout(), AdminLayoutProps, AdminSidebar(), AdminSidebarProps (+3 more)

### Community 16 - "Backend Dependencies & Scripts"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+10 more)

### Community 17 - "backend/package.json"
Cohesion: 0.12
Nodes (14): engines, node, @types/node, typescript, name, private, type, version (+6 more)

### Community 18 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, build, db:generate, db:migrate, db:push, db:reset, db:reset-trades, db:seed (+11 more)

### Community 19 - "env.ts"
Cohesion: 0.17
Nodes (13): db, db, env, resetTradeLogs(), db, env, buildApp(), environmentSchema (+5 more)

### Community 20 - "shared.ts"
Cohesion: 0.24
Nodes (11): importPath(), parseCSVLine(), users, db, db, ADMIN_PARTICIPANT_ID, env, PARTICIPANT_ID (+3 more)

### Community 21 - "Portfolio API Contract v1"
Cohesion: 0.12
Nodes (13): GET /api/v1/portfolio/balance, Portfolio API Contract v1, Portfolio Financial Field Definitions, GET /api/v1/portfolio/pnl, GET /api/v1/portfolio Snapshot, Positions API Contract v1, GET /api/v1/positions, LONG & SHORT Position Model (+5 more)

### Community 22 - "AdminDashboard.tsx"
Cohesion: 0.33
Nodes (8): StatCard(), StatCardProps, AdminDashboard(), fmtCur(), fmtNum(), rel(), getAdminMonitoring(), mockGetAdminMonitoring()

### Community 23 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, argon2, decimal.js, drizzle-orm, fastify, @fastify/cors, @fastify/helmet, fastify-plugin (+6 more)

### Community 24 - "routes.ts"
Cohesion: 0.18
Nodes (12): authRoutes(), createNewsSchema, newsRoutes(), orderRoutes(), OrderService, ExecutionResponse, OrderResponse, SubmitOrderRequest (+4 more)

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

### Community 30 - "schema.test.ts"
Cohesion: 0.14
Nodes (9): datasetCandles, datasets, idempotencyRecords, instruments, orders, portfolios, simulationStates, db (+1 more)

### Community 31 - "Simulation, Event, and Lifecycle Contract v1"
Cohesion: 0.15
Nodes (13): Admin Lifecycle Commands, Authoritative Price Resolution Mechanism, Simulation, Event, and Lifecycle Contract v1, Three Simulation Lifecycle Domains, Master Simulation Dataset Model (10s OHLCV), Authoritative Simulation Cursor, Backend Architecture (Phase 1), PostgreSQL Idempotency & Transactional Outbox (+5 more)

### Community 32 - "NewsPage.tsx"
Cohesion: 0.21
Nodes (11): INITIAL_FORM, NewsPage(), rel(), TYPE_COLORS, TYPE_LABELS, createAdminNews(), getAdminNews(), mockCreateAdminNews() (+3 more)

### Community 33 - "0000_phase_two_schema.sql"
Cohesion: 0.19
Nodes (23): "audit_logs", audit_logs_resource_idx, "dataset_candles", dataset_candles_lookup_idx, "datasets", "event_instruments", "event_participants", "events" (+15 more)

### Community 34 - "DashboardPage.tsx"
Cohesion: 0.23
Nodes (11): Route, DashboardPage(), DashboardPageProps, fmt(), NewsItem, HeaderProps, BottomNavigationProps, TABS (+3 more)

### Community 35 - "schemas/auth.ts"
Cohesion: 0.14
Nodes (15): AccountStatus, AuthenticatedUser, LoginRequest, LoginResponse, LogoutResponse, MeResponse, RefreshRequest, RefreshResponse (+7 more)

### Community 36 - "portfolio.service.ts"
Cohesion: 0.29
Nodes (5): portfolioRoutes(), PortfolioService, PortfolioSummary, PositionSummary, positionsRoutes()

### Community 37 - "auth.types.ts"
Cohesion: 0.39
Nodes (6): AuthUserResponse, loginRequestSchema, RefreshRequest, refreshRequestSchema, registerRequestSchema, resetPasswordRequestSchema

### Community 38 - "AppError"
Cohesion: 0.22
Nodes (10): AppError, CandleData, InstrumentData, MarketStatusData, QuoteData, CachedPrice, livePriceCache, errorHandlerPlugin (+2 more)

### Community 39 - "LoginPage.tsx"
Cohesion: 0.31
Nodes (7): ClubLogo(), ClubLogoProps, AuthMode, LoginPage(), LoginPageProps, login(), resetPassword()

### Community 40 - "security.ts"
Cohesion: 0.29
Nodes (5): requestIdPlugin, @fastify/cors, @fastify/helmet, fastify-plugin, @fastify/rate-limit

### Community 41 - "POST /api/v1/orders Submission & Validation Pipeline"
Cohesion: 0.25
Nodes (4): Comprehensive API & Admin Error Codes Reference, Canonical 10-Second OHLCV Candles & Timeframe Aggregation, Authoritative Market Quotes & Execution Price Derivation, POST /api/v1/orders Submission & Validation Pipeline

### Community 42 - "Recovery & Failure Scenarios Contract v1"
Cohesion: 0.25
Nodes (8): API Restart & Exponential Backoff Recovery, Recovery & Failure Scenarios Contract v1, Order Submission Timeout & Idempotency, WebSocket Disconnection & REST Reconciliation, WebSocket Connection Lifecycle, WebSocket Contract v1, Public vs Private Event Isolation, WebSocket Reconnect & State Resync Strategy

### Community 43 - "AdminApp.tsx"
Cohesion: 0.22
Nodes (5): AdminApp(), ROUTE_META, ErrorBoundary, Props, State

### Community 44 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, drizzle-kit, tsx, @types/node, @types/ws, typescript, vitest

### Community 45 - "DatasetPage.tsx"
Cohesion: 0.36
Nodes (6): DatasetPage(), fmt(), ValidationIcon(), getAdminDatasets(), mockGetAdminDatasets(), AdminDataset

### Community 46 - "Header.tsx"
Cohesion: 0.39
Nodes (6): Header(), NewsItem, relTime(), TYPE_STYLES, ThemeToggle(), useTheme()

### Community 47 - "migrate-news-type.ts"
Cohesion: 0.50
Nodes (4): env, main(), sql, postgres

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

### Community 58 - "pages/PositionsPage.tsx"
Cohesion: 0.48
Nodes (6): fmtCur(), pnlColor(), pnlPrefix(), PositionsPage(), getAdminPositionsMonitor, AdminPosition

### Community 80 - "ErrorState"
Cohesion: 0.22
Nodes (12): deriveHealth(), HealthIcon(), HealthRow(), MonitoringPage(), BalancePage(), BalanceRow(), BalanceRowProps, fmt() (+4 more)

### Community 81 - "OrdersPage.tsx"
Cohesion: 0.36
Nodes (7): fmtCur(), fmtTime(), OrdersPage(), SIDES, STATUSES, getAdminOrdersMonitor, AdminOrder

## Knowledge Gaps
- **375 isolated node(s):** `name`, `private`, `version`, `type`, `node` (+370 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 414 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `App.tsx` to `NewsPage.tsx`, `api/admin.ts`, `ChartPage.tsx`, `frontend/package.json`, `AuditLogPage.tsx`, `DashboardPage.tsx`, `LoginPage.tsx`, `PnlPage.tsx`, `AdminApp.tsx`, `DatasetPage.tsx`, `Header.tsx`, `StatusBadge`, `ErrorState`, `OrdersPage.tsx`, `AuthContext.tsx`, `AdminDashboard.tsx`, `pages/PositionsPage.tsx`, `LeaderboardPage.tsx`?**
  _High betweenness centrality (0.170) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `DashboardPage.tsx` to `NewsPage.tsx`, `api/admin.ts`, `ChartPage.tsx`, `frontend/package.json`, `AuditLogPage.tsx`, `App.tsx`, `LoginPage.tsx`, `DatasetPage.tsx`, `Header.tsx`, `StatusBadge`, `ErrorState`, `OrdersPage.tsx`, `AdminDashboard.tsx`, `pages/PositionsPage.tsx`, `LeaderboardPage.tsx`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `drizzle-orm` connect `AppError` to `schema/index.ts`, `portfolio.service.ts`, `MarketService`, `auth.service.ts`, `backend/package.json`, `env.ts`, `shared.ts`, `routes.ts`, `schema.test.ts`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _375 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ChartPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.061569416498993966 - nodes in this community are weakly interconnected._
- **Should `api/admin.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05463544641157434 - nodes in this community are weakly interconnected._
- **Should `schema/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._