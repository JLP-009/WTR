# Leaderboard API Contract Specification

**Version:** v1  
**Prefix:** `/api/v1/leaderboard`  
**Status:** APPROVED & IMPLEMENTED

---

## 1. Overview

Returns participant equity, rank, total P&L, return percentages, and win rates across all registered active traders. To prevent database locking and ensure high performance with 300+ users, the leaderboard relies on End-Of-Day (EOD) snapshots rather than computing real-time live equity.

---

## 2. Endpoints

### 2.1. `GET /api/v1/leaderboard`
Returns full equity-ranked leaderboard of all competition participants.

- **Authentication:** None (Optional)
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "rank": 1,
        "user_id": "usr_01J8XYZ...",
        "participant_id": "TRADER001",
        "display_name": "Trader One",
        "starting_capital": "1000000.00",
        "equity": "1052400.50",
        "total_pnl": "52400.50",
        "total_pnl_percent": "5.24",
        "trades_count": 24,
        "win_rate": "66.7%"
      },
      {
        "rank": 2,
        "user_id": "usr_01J8ABC...",
        "participant_id": "TRADER002",
        "display_name": "Trader Two",
        "starting_capital": "1000000.00",
        "equity": "1012100.00",
        "total_pnl": "12100.00",
        "total_pnl_percent": "1.21",
        "trades_count": 12,
        "win_rate": "58.3%"
      }
    ],
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.2. `GET /api/v1/leaderboard/me`
Returns the caller's specific ranking, equity, and competition statistics.

- **Authentication:** Required (`Bearer <access_token>`)
- **Response (200 OK):**
  ```json
  {
    "data": {
      "rank": 1,
      "user_id": "usr_01J8XYZ...",
      "participant_id": "TRADER001",
      "display_name": "Trader One",
      "starting_capital": "1000000.00",
      "equity": "1052400.50",
      "total_pnl": "52400.50",
      "total_pnl_percent": "5.24",
      "trades_count": 24,
      "win_rate": "66.7%"
    },
    "request_id": "req_01J8ABC..."
  }
  ```
