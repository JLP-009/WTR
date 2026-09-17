# News and Announcements Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Overview

News allows Admin to broadcast announcements to all participants during an event.

**Key rules:**
- Creating news does NOT automatically change market state
- HALT and NEWS are separate operations — creating a CRITICAL news item requires a separate HALT command if the market should be halted
- News is durable — missed WebSocket events can be recovered via REST
- V1 audience: `ALL_PARTICIPANTS` only

---

## 2. Participant: List News

```
GET /api/v1/news
```

**Authentication required:** Yes

**Query Parameters:**

| Param | Type | Notes |
|-------|------|-------|
| `cursor` | string | Pagination cursor |
| `limit` | integer | Default 50, max 200 |

**Response — 200 OK:**
```json
{
  "data": [
    {
      "news_id": "news_01ARZ...",
      "type": "CRITICAL",
      "title": "Market Volatility Alert",
      "body": "Significant price movement expected in NIFTY.",
      "created_at": "2026-09-05T10:25:00.000Z"
    }
  ],
  "next_cursor": null,
  "request_id": "req_123"
}
```

Ordered descending by `created_at` (most recent first).

---

## 3. News Types

| Type | Usage |
|------|-------|
| `INFO` | General information |
| `WARNING` | Action may be required |
| `CRITICAL` | Urgent — price-impacting or compliance-related |
| `MARKET_UPDATE` | Market state has changed (supplement to WebSocket) |
| `EVENT_UPDATE` | Event lifecycle update (day change, etc.) |

---

## 4. WebSocket Event: news.created

When Admin creates a news item, a `news.created` WebSocket event is broadcast to all authenticated participants:

```json
{
  "event_id": "evt_01ARZ...",
  "event_type": "news.created",
  "sequence": 6100,
  "timestamp": "2026-09-05T10:25:00.000Z",
  "payload": {
    "news_id": "news_01ARZ...",
    "type": "CRITICAL",
    "title": "Market Volatility Alert",
    "body": "Significant price movement expected in NIFTY.",
    "created_at": "2026-09-05T10:25:00.000Z"
  }
}
```

Participants who miss this WebSocket event must recover via `GET /api/v1/news`.

---

## 5. Durability

News items are persisted to the database. They are not ephemeral WebSocket-only messages. All news created during an event is retrievable for the event lifetime.
