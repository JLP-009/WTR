# Market Data API Contract Specification

**Version:** v1  
**Prefix:** `/api/v1/market`  
**Status:** APPROVED & IMPLEMENTED

---

## 1. Overview

Provides real-time market statuses, tradable asset lists, instantaneous quotes, and historical 10-second OHLCV candles.

---

## 2. Endpoints

### 2.1. `GET /api/v1/market/status`
Returns the operational exchange status, current simulation day, and simulated clock time.

- **Authentication:** None (Optional)
- **Response (200 OK):**
  ```json
  {
    "data": {
      "status": "OPEN",
      "simulation_day": 1,
      "simulation_time": "09:25:30",
      "event_status": "RUNNING",
      "server_time": "2026-09-30T09:25:30.000Z"
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.2. `GET /api/v1/market/instruments`
Lists all active instruments available for trading.

- **Authentication:** None (Optional)
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "symbol": "NIFTY",
        "name": "Nifty 50 Index",
        "instrument_type": "INDEX",
        "exchange": "NSE",
        "status": "ACTIVE",
        "tick_size": "0.05",
        "lot_size": 1
      },
      {
        "symbol": "BANKNIFTY",
        "name": "Nifty Bank Index",
        "instrument_type": "INDEX",
        "exchange": "NSE",
        "status": "ACTIVE",
        "tick_size": "0.05",
        "lot_size": 1
      }
    ],
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.3. `GET /api/v1/market/instruments/:symbol`
Fetches detailed specifications for a single symbol.

- **Authentication:** None (Optional)
- **Response (200 OK):**
  ```json
  {
    "data": {
      "symbol": "NIFTY",
      "name": "Nifty 50 Index",
      "instrument_type": "INDEX",
      "exchange": "NSE",
      "status": "ACTIVE",
      "tick_size": "0.05",
      "lot_size": 1
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.4. `GET /api/v1/market/quote/:symbol`
Fetches the instantaneous authoritative market price for order estimation and charting headers.

- **Authentication:** None (Optional)
- **Response (200 OK):**
  ```json
  {
    "data": {
      "symbol": "NIFTY",
      "last_price": "21450.50",
      "open": "21400.00",
      "high": "21480.25",
      "low": "21390.10",
      "close": "21450.50",
      "volume": 14500,
      "timestamp": "2026-09-30T09:25:30.000Z"
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.5. `GET /api/v1/market/candles/:symbol`
Fetches historical 10-second canonical OHLCV candles up to the current simulation cursor for Lightweight Charts visualization.

- **Authentication:** None (Optional)
- **Query Parameters:**
  - `limit` (integer, optional, default: 200, max: 1000)
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "time": 1727688000,
        "open": 21400.00,
        "high": 21415.50,
        "low": 21395.00,
        "close": 21410.25,
        "volume": 2500
      },
      {
        "time": 1727688010,
        "open": 21410.25,
        "high": 21430.00,
        "low": 21405.00,
        "close": 21428.80,
        "volume": 3100
      }
    ],
    "request_id": "req_01J8ABC..."
  }
  ```
