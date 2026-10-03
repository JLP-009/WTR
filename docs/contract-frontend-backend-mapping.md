# Frontend-Backend-Contract Integration Mapping

**Version:** 1.0.0 (Production / Implemented)  
**Status:** Live & Integrated  
**Last Verified:** 2026-09-30

---

## 1. System Overview

This document maps the live API client, UI components, WebSocket channels, and backend service handlers across the Warangal Trading Ring platform.

```
┌───────────────────────────────────────────────────────────┐
│                      Frontend (React 19)                  │
│                                                           │
│  UI Routing (src/App.tsx & src/admin/AdminApp.tsx):       │
│  • /dashboard   • /chart   • /positions   • /leaderboard  │
│  • /pnl         • /balance • /news        • /admin/*      │
│                                                           │
│  Client Adapters (src/lib/api/* & src/lib/websocket.ts):  │
│  • auth.ts      • market.ts    • orders.ts                │
│  • positions.ts • portfolio.ts • leaderboard.ts           │
│  • admin.ts     • websocket.ts                            │
└─────────────────────────────┬─────────────────────────────┘
                              │ HTTP REST & WebSocket
                              ▼
┌───────────────────────────────────────────────────────────┐
│                 Fastify Backend Service                   │
│                                                           │
│  API Routes (src/routes.ts & src/modules/*):              │
│  • /api/v1/auth/*        • /api/v1/market/*               │
│  • /api/v1/orders/*      • /api/v1/positions/*            │
│  • /api/v1/portfolio/*   • /api/v1/leaderboard/*          │
│  • /api/v1/news/*        • /api/v1/admin/*                │
│  • /api/v1/ws (WebSocket Gateway)                         │
└───────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoints & Frontend Service Mapping

### 2.1. Authentication (`/api/v1/auth`)

| Endpoint | Method | Frontend Client Function | Backend Handler | Auth Hook |
|---|---|---|---|---|
| `/register` | POST | `register(req)` in `lib/api/auth.ts` | `authService.register` | Public |
| `/login` | POST | `login(req)` in `lib/api/auth.ts` | `authService.login` | Public |
| `/refresh` | POST | `refreshToken(req)` in `lib/api/auth.ts` | `authService.refresh` | Public |
| `/logout` | POST | `logout()` in `lib/api/auth.ts` | `authService.logout` | `authenticate` |
| `/me` | GET | `getProfile()` in `lib/api/auth.ts` | `authService.getUserById` | `authenticate` |
| `/forgot-password` | POST | `forgotPassword(req)` in `lib/api/auth.ts`| `authService.resetPassword` | Public |
| `/reset-password` | POST | `resetPassword(req)` in `lib/api/auth.ts` | `authService.resetPassword` | Public |

---

### 2.2. Market Data (`/api/v1/market`)

| Endpoint | Method | Frontend Client Function | Backend Handler |
|---|---|---|---|
| `/status` | GET | `getMarketStatus()` in `lib/api/market.ts` | `marketService.getMarketStatus` |
| `/instruments` | GET | `getInstruments()` in `lib/api/market.ts` | `marketService.getInstruments` |
| `/instruments/:symbol` | GET | `getInstrument(sym)` in `lib/api/market.ts` | `marketService.getInstrument` |
| `/quote/:symbol` | GET | `getQuote(sym)` in `lib/api/market.ts` | `marketService.getLatestQuote` |
| `/candles/:symbol` | GET | `getCandles(sym, limit)` in `lib/api/market.ts` | `marketService.getCandles` |

---

### 2.3. Orders (`/api/v1/orders`)

| Endpoint | Method | Frontend Client Function | Backend Handler | Notes |
|---|---|---|---|---|
| `/` | POST | `submitOrder(req, idempotencyKey)` | `orderService.submitOrder` | Immediate MARKET execution, row locking |
| `/` | GET | `getOrders(limit)` | `orderService.getOrders` | Recent trader orders |
| `/:order_id` | GET | `getOrderById(order_id)` | `orderService.getOrderById` | Single order inspection |
| `/:order_id/cancel` | POST | `cancelOrder(order_id)` | `orderService.cancelOrder` | Cancel pending orders |

---

### 2.4. Positions & Portfolio (`/api/v1/positions` & `/api/v1/portfolio`)

| Endpoint | Method | Frontend Client Function | Backend Handler |
|---|---|---|---|
| `/positions` | GET | `getPositions()` in `lib/api/positions.ts` | `portfolioService.getPositions` |
| `/positions/:symbol` | GET | `getPosition(sym)` in `lib/api/positions.ts` | `portfolioService.getPositions` (find) |
| `/portfolio` | GET | `getPortfolioSummary()` in `lib/api/portfolio.ts`| `portfolioService.getPortfolioSummary` |
| `/portfolio/balance` | GET | `getBalance()` in `lib/api/portfolio.ts` | `portfolioService.getPortfolioSummary` |
| `/portfolio/pnl` | GET | `getPnL()` in `lib/api/portfolio.ts` | `portfolioService.getPortfolioSummary` |

---

### 2.5. Leaderboard & News (`/api/v1/leaderboard` & `/api/v1/news`)

| Endpoint | Method | Frontend Client Function | Backend Handler |
|---|---|---|---|
| `/leaderboard` | GET | `getLeaderboard()` in `lib/api/leaderboard.ts` | `leaderboardRoutes` (dynamic calculation) |
| `/leaderboard/me` | GET | `getMyRank()` in `lib/api/leaderboard.ts` | `leaderboardRoutes` (user slice) |
| `/news` | GET | `getNews()` in `lib/api/news.ts` | `newsRoutes` (all active announcements) |
| `/news` | POST | `createNews(req)` (Admin) | `newsRoutes` (creates & broadcasts WS) |

---

### 2.6. Admin Control Surface (`/api/v1/admin`)

| Endpoint | Method | Admin UI Component | Action |
|---|---|---|---|
| `/admin/event` | GET | `EventControlPage` / `AdminDashboard` | Get simulation day, cursor, status |
| `/admin/event/config` | GET | `EventControlPage` | Master dataset parameters, symbol counts |
| `/admin/event/start` | POST | `EventControlPage` | Starts event & live simulation |
| `/admin/event/pause` | POST | `EventControlPage` | Pauses event & simulation |
| `/admin/event/resume` | POST | `EventControlPage` | Resumes trading event |
| `/admin/event/end` | POST | `EventControlPage` | Closes event permanently |
| `/admin/simulation/next-day` | POST | `SimulationPage` | Steps event to next trading day |
| `/admin/market` | GET | `MarketPage` | Real-time prices across symbols |
| `/admin/market/halt` | POST | `MarketPage` | Emergency exchange-wide halt |
| `/admin/market/resume` | POST | `MarketPage` | Lifts market halt |
| `/admin/monitoring` | GET | `MonitoringPage` | System health, active users, error rates |
| `/admin/participants` | GET | `ParticipantsPage` | All registered traders with equity & P&L |
| `/admin/participants/:id/enable` | POST | `ParticipantsPage` | Activates trader |
| `/admin/participants/:id/disable` | POST | `ParticipantsPage` | Disables trader login/trading |
| `/admin/orders` | GET | `OrdersPage` | Global order audit monitor |
| `/admin/positions` | GET | `PositionsPage` | Global open position monitor |
| `/admin/leaderboard` | GET | `AdminLeaderboardPage` | Official ranking verification |
| `/admin/audit` | GET | `AuditLogPage` | Immutable audit log trail |
| `/admin/datasets` | GET | `DatasetPage` | Master OHLCV dataset checksums |

---

## 3. Real-Time WebSocket Streaming (`/api/v1/ws`)

| Channel | Event Type | Direction | Payload Structure |
|---|---|---|---|
| System | `connection.established` | Server → Client | `{ heartbeat_interval_ms: 15000 }` |
| Auth | `auth.success` / `error` | Server → Client | `{ user_id, participant_id, role }` |
| Market | `market.update` | Broadcast | `{ symbol, last_price, high, low, volume, timestamp }` |
| News | `news.update` | Broadcast | `{ news_id, type, title, body, published_at }` |
| Market Status | `market_status.update` | Broadcast | `{ status: "OPEN"\|"PAUSED"\|"HALTED"\|"CLOSED" }` |
| Leaderboard | `leaderboard.update` | Broadcast | Array of `{ rank, participant_id, equity, total_pnl }` |
| Orders | `orders.update` | Targeted User | `{ order_id, symbol, side, quantity, status, average_price }` |
| Portfolio | `portfolio.update` | Targeted User | `{ cash, available_cash, equity, realized_pnl, unrealized_pnl }` |
| Positions | `positions.update` | Targeted User | Array of `{ symbol, side, quantity, average_entry_price, pnl }` |
