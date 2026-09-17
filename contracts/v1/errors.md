# Error Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Standard Error Envelope

Every error response uses this exact format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description suitable for logging.",
    "details": {}
  },
  "request_id": "req_123"
}
```

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `error.code` | string | No | Machine-readable code from the table below |
| `error.message` | string | No | English description; not intended for direct end-user display |
| `error.details` | object | No | Additional structured context; `{}` if none |
| `request_id` | string | No | Always present, even on errors |

**Rules:**
- There is never a `data` field alongside an `error` field.
- `error.message` is for developer logging, not UI display. Frontends should map `error.code` to localized UI messages.
- `error.details` is extensible; clients must tolerate unknown detail fields.

---

## 2. Error Code Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | No token or expired token provided |
| `AUTHENTICATION_FAILED` | 401 | Invalid credentials or invalid/expired token on auth endpoints |
| `ACCOUNT_DISABLED` | 403 | Participant account is disabled |
| `FORBIDDEN` | 403 | Authenticated but not authorized for this resource |
| `VALIDATION_ERROR` | 400 | Request body or query parameter failed validation |
| `NOT_FOUND` | 404 | Resource does not exist (or is invisible due to authorization) |
| `CONFLICT` | 409 | Request conflicts with current resource state |
| `DUPLICATE_REQUEST` | 409 | `client_order_id` already exists for this participant |
| `INSUFFICIENT_FUNDS` | 400 | Not enough available cash to place order (BUY, or opening/increasing a SHORT) |
| `INSUFFICIENT_POSITION` | 400 | Not enough LONG position quantity to execute a directional SELL |
| `NO_OPEN_POSITION` | 400 | CLOSE order submitted but participant has no open position in this symbol |
| `NO_AUTHORITATIVE_PRICE` | 400 | No committed simulation interval exists yet; order cannot execute without a durable price (Day 1 PRE_OPEN only) |
| `MARKET_CLOSED` | 400 | Reserved for administrative operations that require market OPEN status; NOT returned for standard participant MARKET order submissions |
| `INVALID_ORDER` | 400 | Order parameters are invalid (bad symbol, unsupported type, etc.) |
| `CANCEL_INVALID` | 409 | Cannot cancel — order is already in a terminal state |
| `RATE_LIMITED` | 429 | Too many requests; see `Retry-After` header |
| `SYSTEM_UNAVAILABLE` | 503 | Downstream system (Order Execution Service, DB) temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 3. HTTP Status Code Usage

| HTTP Status | When Used |
|-------------|-----------|
| `200 OK` | Successful GET, successful POST with no creation (logout, cancel ack) |
| `201 Created` | Successful order creation |
| `400 Bad Request` | Client-side input error; do not retry with the same payload |
| `401 Unauthorized` | No valid auth token; client should refresh or re-login |
| `403 Forbidden` | Authenticated but lacks permission |
| `404 Not Found` | Resource not found (also used when resource exists but belongs to another participant) |
| `409 Conflict` | State conflict; duplicate key; cancel of terminal order |
| `422 Unprocessable Entity` | NOT USED in v1. Validation errors use `400`. |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Server bug; not the client's fault |
| `503 Service Unavailable` | Temporary backend outage; client may retry with backoff |

**Why 422 is not used:** 400 is sufficient for validation errors and avoids frontend code that must handle both 400 and 422 for similar scenarios.

---

## 4. VALIDATION_ERROR Details

When `code` is `VALIDATION_ERROR`, `details` contains field-level information:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": {
      "fields": [
        {
          "field": "quantity",
          "reason": "Must be a positive integer."
        },
        {
          "field": "symbol",
          "reason": "Symbol INVALID_SYM does not exist."
        }
      ]
    }
  },
  "request_id": "req_123"
}
```

Multiple field errors may be returned in a single response. The frontend should display them at the relevant form fields.

---

## 5. RATE_LIMITED Behavior

```
HTTP 429

Headers:
  Retry-After: 30       ← seconds to wait before retrying
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1735730400   ← Unix epoch when limit resets
```

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Retry after 30 seconds.",
    "details": {
      "retry_after_seconds": 30
    }
  },
  "request_id": "req_123"
}
```

The frontend must never retry immediately on 429. It must respect `Retry-After`.

---

## 6. SYSTEM_UNAVAILABLE Behavior

```
HTTP 503

Headers:
  Retry-After: 10
```

```json
{
  "error": {
    "code": "SYSTEM_UNAVAILABLE",
    "message": "A backend service is temporarily unavailable. Please try again shortly.",
    "details": {}
  },
  "request_id": "req_123"
}
```

The client may retry with exponential backoff. `SYSTEM_UNAVAILABLE` does NOT imply the operation succeeded or failed — the client must use idempotency keys and verify state after recovery.

---

## 7. Sensitive Error Information Policy

Error responses must NEVER include:
- Stack traces
- Internal database error messages
- SQL errors
- Internal service names or hostnames
- Memory addresses or internal IDs
- Any information useful for system reconnaissance

The `message` field is for developers in logs, not security-sensitive internals.

---

---

## 8. Error Handling by Agent

These codes are returned only by Admin endpoints.

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `EVENT_NOT_READY` | 409 | Event is not in READY state |
| `EVENT_ALREADY_STARTED` | 409 | Event has already been started |
| `EVENT_ALREADY_ENDED` | 409 | Event is ENDED — terminal; no further transitions |
| `EVENT_CONFIGURATION_LOCKED` | 409 | Configuration cannot be changed after event start |
| `EVENT_CONFIGURATION_INCOMPLETE` | 409 | Required configuration fields are missing |
| `SIMULATION_ALREADY_RUNNING` | 409 | Simulation is already running |
| `SIMULATION_NOT_RUNNING` | 409 | Simulation is not currently running |
| `DAY_NOT_CLOSED` | 409 | Current day must be closed before this operation |
| `DAY_ALREADY_CLOSED` | 409 | Day is already in CLOSED state |
| `NO_NEXT_DAY` | 409 | All configured simulation days have been completed |
| `MARKET_ALREADY_OPEN` | 409 | Market is already in OPEN state |
| `MARKET_ALREADY_HALTED` | 409 | Market is already HALTED |
| `INVALID_STATE_TRANSITION` | 409 | Requested lifecycle transition is not valid from current state |
| `DATASET_NOT_READY` | 409 | Dataset is not loaded or not validated |
| `DATASET_INVALID` | 409 | Dataset fails validation checks |

---

## 10. Participant Errors During Ended Event

After `event_status = ENDED`, participant order submissions return:

```json
{
  "error": {
    "code": "SYSTEM_UNAVAILABLE",
    "message": "The trading event has ended. No further orders can be submitted.",
    "details": { "event_status": "ENDED" }
  },
  "request_id": "req_123"
}
```

`SYSTEM_UNAVAILABLE` with `event_status: "ENDED"` in details signals terminal event state. The frontend should detect this and show an event-ended UI state rather than a transient error.

**Agent 1 (Frontend):**
- Map `error.code` to localized UI messages.
- Handle `401` by triggering token refresh flow.
- Handle `429` by showing wait message and respecting `Retry-After`.
- Handle `503` by showing "system temporarily unavailable" and retrying with backoff.
- Never display raw `error.message` to end users.

**Agent 2 (Backend):**
- Always return errors in the standard envelope format.
- Never return raw framework error objects.
- Always include `request_id` in error responses.
- Log full error context internally; expose only the sanitized envelope externally.

**Agent 4 (Database):**
- Database constraint violations must be caught by the backend and converted to appropriate API errors (`DUPLICATE_REQUEST`, `CONFLICT`, `INSUFFICIENT_FUNDS`).
- Database errors must never surface as `INTERNAL_ERROR` with DB-specific detail.
