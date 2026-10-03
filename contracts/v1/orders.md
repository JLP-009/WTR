# Orders API Contract Specification

**Version:** v1  
**Prefix:** `/api/v1/orders`  
**Status:** APPROVED & IMPLEMENTED

---

## 1. Overview

Handles MARKET order submission, immediate atomic trade execution against authoritative 10-second candle close prices, order history queries, and order cancellations.

---

## 2. Order Execution Model

- **Order Type:** Pure `MARKET` orders only.
- **Execution Mechanism:** Immediate execution within a single database transaction (`FOR UPDATE` row lock).
- **Execution Price:** Authoritative price from current simulation cursor candle close.
- **Position Handling:** Seamless support for `BUY`, `SELL`, and `CLOSE`. If a SELL order quantity exceeds the current LONG position, the position flips to SHORT without blending entry prices.

---

## 3. Endpoints

### 3.1. `POST /api/v1/orders`
Submits a new market order for immediate execution.

- **Authentication:** Required (`Bearer <access_token>`)
- **Headers:**
  - `Idempotency-Key` (string, optional/recommended, e.g. `idk_01J8...`)
- **Request Body:**
  ```json
  {
    "symbol": "NIFTY",
    "side": "BUY",
    "quantity": 10,
    "order_type": "MARKET",
    "client_order_id": "cord_01J8ABC..."
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "data": {
      "order_id": "ord_01J8XYZ...",
      "client_order_id": "cord_01J8ABC...",
      "symbol": "NIFTY",
      "side": "BUY",
      "quantity": 10,
      "filled_quantity": 10,
      "order_type": "MARKET",
      "status": "FILLED",
      "average_price": "21450.50",
      "executed_at": "2026-09-30T09:25:30.000Z",
      "created_at": "2026-09-30T09:25:30.000Z"
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 3.2. `GET /api/v1/orders`
Retrieves recent orders submitted by the authenticated trader.

- **Authentication:** Required (`Bearer <access_token>`)
- **Query Parameters:**
  - `limit` (integer, optional, default: 50, max: 200)
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "order_id": "ord_01J8XYZ...",
        "client_order_id": "cord_01J8ABC...",
        "symbol": "NIFTY",
        "side": "BUY",
        "quantity": 10,
        "filled_quantity": 10,
        "order_type": "MARKET",
        "status": "FILLED",
        "average_price": "21450.50",
        "created_at": "2026-09-30T09:25:30.000Z"
      }
    ],
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 3.3. `GET /api/v1/orders/:order_id`
Inspects details of a single order.

- **Authentication:** Required (`Bearer <access_token>`)
- **Response (200 OK):**
  ```json
  {
    "data": {
      "order_id": "ord_01J8XYZ...",
      "client_order_id": "cord_01J8ABC...",
      "symbol": "NIFTY",
      "side": "BUY",
      "quantity": 10,
      "filled_quantity": 10,
      "order_type": "MARKET",
      "status": "FILLED",
      "average_price": "21450.50",
      "created_at": "2026-09-30T09:25:30.000Z"
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 3.4. `POST /api/v1/orders/:order_id/cancel`
Cancels an order if it is in `PENDING` state.

- **Authentication:** Required (`Bearer <access_token>`)
- **Response (200 OK):**
  ```json
  {
    "data": {
      "success": true
    },
    "request_id": "req_01J8ABC..."
  }
  ```
