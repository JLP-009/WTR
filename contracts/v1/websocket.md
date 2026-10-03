# WebSocket Protocol & Streaming Contract Specification

**Version:** v1  
**Path:** `/api/v1/ws`  
**Protocol:** WSS / JSON  
**Status:** APPROVED & IMPLEMENTED

---

## 1. Connection Lifecycle & Handshake

1. **Connect:** Client initiates WebSocket connection to `/api/v1/ws`.
2. **Handshake:** Server immediately sends `connection.established`:
   ```json
   {
     "type": "connection.established",
     "data": { "heartbeat_interval_ms": 15000 }
   }
   ```
3. **Authenticate:** Client transmits JWT:
   ```json
   {
     "action": "auth",
     "token": "eyJhbGciOiJIUzI1NiIsIn..."
   }
   ```
4. **Auth Acknowledgement:**
   ```json
   {
     "type": "auth.success",
     "data": {
       "user_id": "usr_01J8XYZ...",
       "participant_id": "TRADER001",
       "role": "PARTICIPANT"
     }
   }
   ```

---

## 2. Channels & Subscriptions

Client sends subscription request:
```json
{
  "action": "subscribe",
  "channels": ["market", "news", "portfolio", "positions", "orders", "leaderboard"],
  "symbols": ["NIFTY", "BANKNIFTY"]
}
```

### Channel Event Envelopes

#### 2.1. `market.update` (Public Broadcast)
```json
{
  "channel": "market",
  "type": "market.update",
  "data": {
    "symbol": "NIFTY",
    "last_price": "21450.50",
    "open": "21400.00",
    "high": "21480.00",
    "low": "21390.00",
    "close": "21450.50",
    "volume": 12500,
    "timestamp": "2026-09-30T09:25:30.000Z"
  }
}
```

#### 2.2. `orders.update` (Targeted User Message)
```json
{
  "channel": "orders",
  "type": "orders.update",
  "data": {
    "order_id": "ord_01J8XYZ...",
    "symbol": "NIFTY",
    "side": "BUY",
    "quantity": 10,
    "status": "FILLED",
    "average_price": "21450.50",
    "executed_at": "2026-09-30T09:25:30.000Z"
  }
}
```

#### 2.3. `portfolio.update` (Targeted User Message)
```json
{
  "channel": "portfolio",
  "type": "portfolio.update",
  "data": {
    "cash": "785495.00",
    "available_cash": "785495.00",
    "equity": "1000000.00",
    "realized_pnl": "1200.00",
    "unrealized_pnl": "505.00"
  }
}
```

#### 2.4. `news.update` (Public Broadcast)
```json
{
  "channel": "news",
  "type": "news.update",
  "data": {
    "news_id": "news_01J8ABC...",
    "type": "MARKET_UPDATE",
    "title": "Session Update",
    "body": "Trading Day 1 is progressing smoothly.",
    "published_at": "2026-09-30T09:25:30.000Z"
  }
}
```

---

## 3. Heartbeat (Ping/Pong)
- Client sends: `{ "action": "ping" }`
- Server responds: `{ "type": "pong", "data": { "timestamp": "2026-09-30T09:25:30.000Z" } }`
