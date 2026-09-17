# Leaderboard API Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Overview

The leaderboard ranks participants by their competition performance.

**Critical distinction:** The leaderboard is a **READ MODEL** — a derived, cached view of performance data. It is NOT the financial source of truth.

- Leaderboard rankings are computed from portfolio data.
- They may lag behind real-time portfolio state by a short window (cache refresh interval — OD-LDR-01).
- A participant's rank on the leaderboard does NOT override their authoritative portfolio P&L values.
- The leaderboard cannot be manipulated via any client API call.

---

## 2. Full Leaderboard

```
GET /api/v1/leaderboard
```

**Authentication required:** Yes

**Pagination strategy:** Offset-based (leaderboard is bounded by participant count — 250–500 in this competition).

**Query Parameters:**

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `offset` | integer | No | 0 | Starting position (0-indexed) |
| `limit` | integer | No | 50 | Max 200 |

**Response — 200 OK:**
```json
{
  "data": {
    "entries": [
      {
        "rank": 1,
        "participant_id": "TRADER042",
        "display_name": "Trader Forty Two",
        "portfolio_value": "1250000.00",
        "total_pnl": "250000.00",
        "return_percent": "25.00",
        "updated_at": "2026-01-01T10:29:55.000Z"
      }
    ],
    "total_participants": 312,
    "simulation_day": 3,
    "as_of": "2026-01-01T10:29:55.000Z",
    "version": 4821
  },
  "offset": 0,
  "limit": 50,
  "request_id": "req_123"
}
```

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `entries` | array | No | Ordered by rank ascending |
| `entries[].rank` | integer | No | 1-indexed rank |
| `entries[].participant_id` | string | No | Public participant identifier |
| `entries[].display_name` | string | No | Display name |
| `entries[].portfolio_value` | string (decimal) | No | Ranking metric (primary) |
| `entries[].total_pnl` | string (decimal) | No | Absolute P&L from starting capital |
| `entries[].return_percent` | string (decimal) | No | Return as percentage of starting capital |
| `entries[].updated_at` | string (ISO-8601 UTC) | No | When this entry was last computed |
| `total_participants` | integer | No | Total number of ranked participants |
| `simulation_day` | integer | No | Simulation day this snapshot represents |
| `as_of` | string (ISO-8601 UTC) | No | Wall-clock timestamp of the snapshot |
| `version` | integer | No | Monotonically increasing version number |

**Ranking order (deterministic, three-level):**

1. **Primary:** `portfolio_value` descending (highest value = rank 1)
2. **Secondary:** `total_pnl` descending (higher absolute P&L breaks ties on equal portfolio value)
3. **Tertiary:** `participant_id` ascending (alphabetical — stable, deterministic, arbitrary but fair)

This tie-breaking rule is fixed for v1. All participants with identical portfolio value and P&L are broken alphabetically by `participant_id`. This is not a performance-meaningful distinction — it exists solely to guarantee a deterministic ranking with no ties.

**Participant inclusion:** All participants with active accounts are included in the leaderboard from competition start, ranked at their starting capital before their first trade. `total_participants` reflects all included participants.

**`as_of`:** The UTC timestamp when this leaderboard snapshot was computed. Frontend must display this so users understand rankings may be slightly stale relative to live portfolios.

**`version`:** Monotonically increasing integer. Increments each time the leaderboard is recomputed. The client may compare incoming `leaderboard.updated` WebSocket event `version` against its locally held version; if the event version is not newer, skip the REST fetch.

---

## 3. My Leaderboard Position

```
GET /api/v1/leaderboard/me
```

**Authentication required:** Yes

Returns only the authenticated participant's current leaderboard entry. Useful for displaying "your rank" in the UI without fetching the full leaderboard.

**Response — 200 OK:**
```json
{
  "data": {
    "rank": 47,
    "participant_id": "TRADER001",
    "display_name": "Trader One",
    "portfolio_value": "1050000.00",
    "total_pnl": "50000.00",
    "return_percent": "5.00",
    "total_participants": 312,
    "as_of": "2026-01-01T10:29:55.000Z",
    "version": 4821
  },
  "request_id": "req_123"
}
```

---

## 4. Leaderboard Staleness

The leaderboard is periodically refreshed from authoritative portfolio data. It is not updated on every trade.

- Refresh interval is an implementation/configuration decision for Agent 2 (not a public API contract value). The `as_of` field communicates freshness to clients regardless of what the interval is.
- `as_of` timestamp tells the client exactly when the data was computed. Frontend must display it.
- WebSocket `leaderboard.updated` events notify clients when a new snapshot is available.

The frontend must NOT treat the leaderboard as real-time portfolio truth.

---

## 5. Real-Time Updates

Clients subscribe to WebSocket `leaderboard.updated` for push notifications when rankings change. The WebSocket event carries the full new snapshot or a version number — see `websocket.md`.

On receiving `leaderboard.updated`, the frontend fetches `GET /leaderboard` to get the full fresh data (or uses the embedded snapshot if present in the event payload).

---

## 6. Error Responses

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Not authenticated | 401 | `AUTHENTICATION_REQUIRED` |
| Leaderboard not yet computed | 503 | `SYSTEM_UNAVAILABLE` |

---

## 7. Resolved Decisions

| ID | Decision | Resolution |
|----|----------|------------|
| OD-LDR-02 | Tie-breaking rule | `portfolio_value` desc → `total_pnl` desc → `participant_id` asc (alphabetical) |
| OD-LDR-03 | `leaderboard.updated` WS payload | Version + `as_of` + `total_participants` only; client fetches REST for full data |
| OD-LDR-04 | Participants included before first trade | **Yes** — all participants included from start, ranked at starting capital |

## 8. Implementation Decisions (Agent 2)

| ID | Decision | Notes |
|----|----------|-------|
| OD-LDR-01 | Refresh interval | Not a public contract value; `as_of` communicates freshness regardless |
