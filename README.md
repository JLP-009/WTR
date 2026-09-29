# 🐂 Warangal Trading Ring 2.0 (WTR 2.0)
### *Presented by FINWIZ*

A high-performance, institutional-grade simulated trading competition platform built with **Fastify**, **PostgreSQL (Drizzle ORM)**, **WebSockets**, and **React 19 (Vite + Tailwind CSS + TradingView Lightweight Charts)**.

Designed to effortlessly handle **300+ concurrent live participants** trading multi-asset market datasets in real-time with sub-millisecond execution latency, micro-tick candle streaming, and zero-float financial precision.

---

## ⚡ Key Features

- **⚡ Immediate Market Execution Engine**:
  - Sub-millisecond atomic order matching (`BUY`, `SELL`, `CLOSE`) with full position netting.
  - Zero-float arithmetic powered by `Decimal.js` ensuring exact financial accuracy.
  - Real-time buying power validation, margin tracking, and automated trade fee deduction.
- **📈 Advanced Charting & Live Micro-Ticks**:
  - High-performance interactive candlestick charts powered by **TradingView Lightweight Charts v5**.
  - Synthetic 2-second micro-tick generator updating candle wicks and prices synchronously between 10s intervals.
  - **Visual Order Entry Lines**: Dashed target price markers drawn directly on the chart with labels (`LONG @ ₹...` / `SHORT @ ₹...`) that automatically clear on exit.
  - Live Mark-to-Market (MTM) PnL calculation against **Previous Day Close** (`prevClose`).
- **👤 Self-Registration & Account Management**:
  - Full participant self-service onboarding (First Name, Last Name, Participant ID, Password).
  - Built-in identity verification & Forgot Password reset flow.
  - Instant portfolio provisioning with **₹10,00,000** starting virtual capital.
- **🔌 Real-Time WebSocket Gateway**:
  - Multi-channel pub/sub (`market`, `orders`, `portfolio`, `leaderboard`, `news`) over `/api/v1/ws`.
  - Automatic reconnection with exponential backoff and connection state recovery.
- **🛡️ Admin Command Center**:
  - Complete control room for event lifecycles: `Start Event`, `Pause`, `Open Market`, `Halt Market`, `Close Day`, `Advance Day`.
  - Simulation engine with customizable interval speeds ($1\times$ to $5\times$).
  - Dynamic CSV dataset import tool supporting arbitrary Indian Equities & Indices (e.g. NIFTY, BANKNIFTY, RELIANCE, TCS, INFY, HDFCBANK).
  - Live participant monitoring, order book inspection, broadcast announcements, and audit logging.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | Fastify 5 (TypeScript, ESM) |
| **Database & ORM** | PostgreSQL 16 + Drizzle ORM |
| **Real-Time Gateway** | Native Fastify WebSocket (`@fastify/websocket`) |
| **Security & Auth** | Argon2id hashing, Jose JWT with sliding refresh tokens, Rate Limiting, Helmet, CORS |
| **Frontend Framework** | React 19, TypeScript, Vite 8 |
| **Styling & Icons** | Tailwind CSS v4, Lucide React |
| **Market Visualizations**| TradingView Lightweight Charts, Recharts |

---

## 🚀 Step-by-Step Setup & Run Guide

Follow these steps to run the complete project locally or across a local area network (LAN).

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js**: `v22.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **Docker Desktop**: For running PostgreSQL ([Download Docker](https://www.docker.com/)) *or a local PostgreSQL 16 instance*
- **Git**: For source control

---

### 2. Clone Repository
```bash
git clone https://github.com/JLP-009/WTR.git
cd WTR
git checkout codex/implement-backend-with-frontend-integration
```

---

### 3. Start PostgreSQL Database
In the root directory, launch the PostgreSQL 16 container:
```bash
docker compose up postgres -d
```
*Verify that PostgreSQL is healthy on `localhost:5432` with username `wtr`, password `wtr`, and database `wtr`.*

---

### 4. Backend Setup & Data Seeding

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend

# 1. Create environment config
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Push schema to database
npm run db:push

# 4. Seed the Admin user (Default: admin / adminpass)
npm run seed:admin

# 5. Import the 12 Indian equity datasets & initialize Day 1 market prices
npm run import:csv

# 6. Start backend development server
npm run dev
```
The backend will boot up on **`http://localhost:3000`** (and bind to `0.0.0.0:3000` for LAN access).
- **Health Check**: `http://localhost:3000/health`
- **WebSocket Endpoint**: `ws://localhost:3000/api/v1/ws`

---

### 5. Frontend Setup

Open a second terminal and navigate to the `frontend/` directory:

```bash
cd frontend

# 1. Create environment config
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start frontend development server
npm run dev
```
The frontend will start on **`http://localhost:5173`**.

---

## 🔑 Default Credentials & Access Portals

### 👑 Admin Control Center
- **URL**: [http://localhost:5173/admin](http://localhost:5173/admin) *(or click "Admin Portal" from the top navigation)*
- **Username**: `admin`
- **Password**: `adminpass`
- **Capabilities**: Start/stop simulation, pause/halt markets, post news, view audit logs, upload datasets.

### 👤 Participant / Trader
- **URL**: [http://localhost:5173/](http://localhost:5173/)
- **Registration**: Click **Create Account** on the login screen to self-register with any Participant ID and name.
- **Starting Balance**: Each newly created trader automatically starts with **₹10,00,000** virtual cash.
- **Forgot Password**: Password reset with identity verification is available directly on the login screen.

---

## 📶 Network / LAN Access (Competition Setup)

The servers are configured by default to bind to `0.0.0.0`, allowing all laptops and devices connected to the same Wi-Fi/LAN router to participate.

To access the platform from another machine:
1. Find the host machine's local IP address (e.g. `ipconfig` on Windows or `ifconfig` on macOS/Linux).
2. Competitors can open their browser and visit:
   ```
   http://<HOST_IP>:5173
   ```
   *(e.g., `http://10.254.4.160:5173` or `http://192.168.1.50:5173`)*
3. The frontend automatically detects the host IP and connects WebSocket and REST API feeds seamlessly.

---

## 📊 Available Datasets & Market Symbols

The platform comes preloaded with 12 high-liquidity Indian market instruments:

| Symbol | Name | Asset Class |
|---|---|---|
| `NIFTY` | NIFTY 50 Index | Index |
| `BANKNIFTY` | NIFTY Bank Index | Index |
| `RELIANCE` | Reliance Industries Ltd | Equity |
| `TCS` | Tata Consultancy Services | Equity |
| `INFY` | Infosys Ltd | Equity |
| `HDFCBANK` | HDFC Bank Ltd | Equity |
| `ICICIBANK` | ICICI Bank Ltd | Equity |
| `SBIN` | State Bank of India | Equity |
| `LT` | Larsen & Toubro Ltd | Equity |
| `ITC` | ITC Ltd | Equity |
| `AXISBANK` | Axis Bank Ltd | Equity |
| `BHARTIARTL` | Bharti Airtel Ltd | Equity |

To import your own custom CSV datasets:
Place CSV files with format `timestamp,open,high,low,close,volume` into `backend/data/datasets/<SYMBOL>.csv` and execute:
```bash
npm run import:csv
```

---

## 🧪 Testing & Verification

```bash
# Run backend unit tests
cd backend
npm run test:unit

# Typecheck backend
npm run typecheck

# Build frontend production bundle
cd ../frontend
npm run build
```

---

## 📋 Comprehensive System Audit & 300-User Capacity Plan

A comprehensive architectural audit and benchmark was conducted to evaluate the platform for 300 concurrent live participants during a high-stakes competition.

### Key Metrics for 300 Concurrent Users:
- **WebSocket Throughput**: ~150 messages/sec (~25 KB/sec total bandwidth).
- **Peak Order Burst**: ~50–100 orders/sec with < 5ms database transaction latency.
- **Recommended Host Specs**: 4 CPU Cores, 8 GB RAM, NVMe SSD (Local Host / Docker or Cloud VPS like Hetzner/DigitalOcean/AWS t3.xlarge).
- **Database Connection Pool**: `max: 50` connections in PostgreSQL.

For full architectural deep-dives, see the [System Audit Report](./AUDIT_REPORT.md).

---

## 📄 License
Private & Confidential — Built for Warangal Trading Ring 2.0. Presented by FINWIZ.
