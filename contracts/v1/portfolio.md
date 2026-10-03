# Portfolio API Contract Specification

**Version:** v1  
**Prefix:** `/api/v1/portfolio`  
**Status:** APPROVED & IMPLEMENTED

---

## 1. Overview

Exposes account financial snapshots, cash breakdown (available vs reserved), buying power, realized & unrealized P&L, and total portfolio equity.

---

## 2. Endpoints

### 2.1. `GET /api/v1/portfolio`
Returns the comprehensive portfolio summary for the authenticated trader.

- **Authentication:** Required (`Bearer <access_token>`)
- **Response (200 OK):**
  ```json
  {
    "data": {
      "starting_capital": "1000000.00",
      "cash": "785495.00",
      "available_cash": "785495.00",
      "reserved_cash": "0.00",
      "invested_amount": "214000.00",
      "market_value": "214505.00",
      "equity": "1000000.00",
      "buying_power": "785495.00",
      "realized_pnl": "1200.00",
      "unrealized_pnl": "505.00",
      "daily_pnl": "1705.00",
      "total_pnl": "1705.00",
      "total_pnl_percent": "0.17",
      "currency": "INR",
      "updated_at": "2026-09-30T09:25:30.000Z"
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.2. `GET /api/v1/portfolio/balance`
Returns balance and buying power metrics.

- **Authentication:** Required (`Bearer <access_token>`)
- **Response (200 OK):**
  ```json
  {
    "data": {
      "cash": "785495.00",
      "available_cash": "785495.00",
      "reserved_cash": "0.00",
      "invested_amount": "214000.00",
      "market_value": "214505.00",
      "equity": "1000000.00",
      "buying_power": "785495.00"
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.3. `GET /api/v1/portfolio/pnl`
Returns detailed profit and loss figures.

- **Authentication:** Required (`Bearer <access_token>`)
- **Response (200 OK):**
  ```json
  {
    "data": {
      "realized_pnl": "1200.00",
      "unrealized_pnl": "505.00",
      "daily_pnl": "1705.00",
      "total_pnl": "1705.00"
    },
    "request_id": "req_01J8ABC..."
  }
  ```
