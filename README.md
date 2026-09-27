# Warangal Trading Ring

A high-performance simulated trading competition platform built with **Fastify**, **PostgreSQL (Drizzle ORM)**, and **React 19 (Vite + TailwindCSS)**.

---

## 🚀 Getting Started

### 1. Database & Infrastructure
Start the PostgreSQL container:
```bash
docker compose up postgres -d
```

### 2. Backend Setup
```bash
# In backend/
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```
Backend API will be running on `http://localhost:3000` (Health check at `http://localhost:3000/health`, WebSocket gateway at `ws://localhost:3000/api/v1/ws`).

### 3. Frontend Setup
```bash
# In frontend/
cd frontend
npm install
npm run dev
```
Frontend web app will be available on `http://localhost:5173`.

---

## 🏛️ Architecture Overview

- **Authentication**: Argon2id password hashing, Jose-signed JWT access tokens with database-backed refresh token rotation.
- **Immediate Market Execution Engine**: Atomic in-database transaction order matching with zero-float `Decimal.js` precision math, buying power & position margin checks, and immutable portfolio ledger logging.
- **Market & Simulation Engine**: 10-second interval simulation clock advancing trading days and broadcasting real-time candle ticks and quotes.
- **Real-Time WebSocket Gateway**: Channel subscriptions (`market`, `orders`, `portfolio`, `leaderboard`) over `/api/v1/ws`.
- **Frontend Integration**: Centralized HTTP client, transparent casing/decimal DTO adapters, AuthContext session management, and live WebSocket feed.

---

## 🧪 Testing & Verification

```bash
# Run backend tests
cd backend
npm run test:unit
npm run typecheck

# Build frontend
cd ../frontend
npm run build
```
