# News & Announcements API Contract Specification

**Version:** v1  
**Prefix:** `/api/v1/news`  
**Status:** APPROVED & IMPLEMENTED

---

## 1. Overview

Manages market updates, event status announcements, and administrative news broadcasts.

---

## 2. Endpoints

### 2.1. `GET /api/v1/news`
Fetches all published news and alerts.

- **Authentication:** None (Optional)
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "news_id": "news_01J8ABC...",
        "type": "EVENT_UPDATE",
        "title": "Trading Day 1 Started",
        "body": "Welcome to Warangal Trading Ring! The market is now OPEN.",
        "published_at": "2026-09-30T09:15:00.000Z"
      }
    ],
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.2. `POST /api/v1/news`
Publishes a new announcement and broadcasts it live to all connected WebSocket clients.

- **Authentication:** Required (`Bearer <access_token>` with `role: ADMIN`)
- **Request Body:**
  ```json
  {
    "title": "Market Volatility Alert",
    "body": "High volatility observed in NIFTY 50 during interval 24.",
    "type": "MARKET_UPDATE",
    "audience": "ALL_PARTICIPANTS"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "data": {
      "news_id": "news_01J8XYZ...",
      "type": "MARKET_UPDATE",
      "title": "Market Volatility Alert",
      "body": "High volatility observed in NIFTY 50 during interval 24.",
      "published_at": "2026-09-30T09:30:00.000Z"
    },
    "request_id": "req_01J8ABC..."
  }
  ```
