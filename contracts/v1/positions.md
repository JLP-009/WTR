# Positions API Contract Specification

**Version:** v1  
**Prefix:** `/api/v1/positions`  
**Status:** APPROVED & IMPLEMENTED

---

## 1. Overview

Manages trader asset holdings across tradable symbols for both `LONG` and `SHORT` positions, calculating real-time unrealized P&L and tracking position flips.

---

## 2. Endpoints

### 2.1. `GET /api/v1/positions`
Returns all open positions for the authenticated caller.

- **Authentication:** Required (`Bearer <access_token>`)
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "symbol": "NIFTY",
        "side": "LONG",
        "quantity": 10,
        "average_entry_price": "21400.00",
        "current_price": "21450.50",
        "unrealized_pnl": "505.00",
        "realized_pnl": "1200.00",
        "market_value": "214505.00",
        "opened_at": "2026-09-30T09:15:00.000Z",
        "updated_at": "2026-09-30T09:25:30.000Z"
      }
    ],
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.2. `GET /api/v1/positions/:symbol`
Fetches the open position for a specific symbol.

- **Authentication:** Required (`Bearer <access_token>`)
- **Response (200 OK):**
  ```json
  {
    "data": {
      "symbol": "NIFTY",
      "side": "LONG",
      "quantity": 10,
      "average_entry_price": "21400.00",
      "current_price": "21450.50",
      "unrealized_pnl": "505.00",
      "realized_pnl": "1200.00",
      "market_value": "214505.00",
      "opened_at": "2026-09-30T09:15:00.000Z",
      "updated_at": "2026-09-30T09:25:30.000Z"
    },
    "request_id": "req_01J8ABC..."
  }
  ```
