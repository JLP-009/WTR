# Error Handling & Standard Error Envelopes

**Version:** v1  
**Status:** APPROVED & IMPLEMENTED

---

## 1. Standard Error Envelope

All 4xx and 5xx responses emit a standardized JSON body containing a machine-readable `code`, a human-readable `message`, and the correlating `request_id`:

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Available cash is insufficient for this order."
  },
  "request_id": "req_01J8ABC12345"
}
```

---

## 2. Standard Error Codes

| Error Code | HTTP Status | Meaning |
|---|---|---|
| `BAD_REQUEST` | 400 | Request payload schema or parameter validation failed |
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired access JWT |
| `FORBIDDEN` | 403 | Authenticated user lacks required role (e.g. non-admin accessing `/admin/*`) |
| `ACCOUNT_DISABLED` | 403 | Participant account has been disabled by exchange administrator |
| `NOT_FOUND` | 404 | Requested entity, instrument, order, or user does not exist |
| `CONFLICT` | 409 | Duplicate entity or invalid lifecycle state transition |
| `MARKET_CLOSED` | 400 | Order submitted when market is PRE_OPEN, PAUSED, HALTED, or CLOSED |
| `INSUFFICIENT_FUNDS` | 400 | Available cash is insufficient to cover order cost |
| `POSITION_NOT_FOUND` | 400 | Attempted to CLOSE a position when no open quantity exists |
| `IDEMPOTENCY_CONFLICT`| 409 | Idempotency key reused with different request payload |
| `INTERNAL_SERVER_ERROR`| 500 | Unhandled server exception (sanitized in production) |
| `SYSTEM_UNAVAILABLE` | 503 | Database or downstream connectivity outage |
