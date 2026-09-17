# Authentication & Authorization Contract

STATUS: **DRAFT**
Version: **v1**

---

## 1. Overview

Authentication establishes *who* is making a request.
Authorization establishes *what* they are allowed to do.

These are separate concerns. The API enforces both independently. Frontend restrictions are NOT a substitute for backend authorization.

---

## 2. Token Strategy

**Recommended:** Short-lived access token + longer-lived refresh token.

The token implementation (JWT vs opaque) is an Agent 2 internal decision. The public API contract mandates only the behavioral guarantees documented in this file. The frontend treats the token as an opaque string regardless of its internal format.

**Access token:**
- Sent in every authenticated request as `Authorization: Bearer <token>`
- Short-lived (15 minutes recommended — implementation detail for Agent 2)
- Must not be stored in `localStorage` on the frontend (XSS risk) — recommended: memory or `httpOnly` cookie

**Refresh token:**
- Longer-lived (7 days or session duration recommended)
- Used only on `POST /api/v1/auth/refresh`
- Must be invalidated server-side on logout

**This contract mandates the behavioral guarantees below, not the token format.**

---

## 3. Endpoints

### 3.1 Login

```
POST /api/v1/auth/login
```

**Authentication required:** No

**Request:**
```json
{
  "participant_id": "TRADER001",
  "password": "..."
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `participant_id` | string | Yes | Max 64 chars, `[A-Z0-9_-]` |
| `password` | string | Yes | Non-empty |

**Success Response — 200 OK:**
```json
{
  "data": {
    "access_token": "eyJ...",
    "token_type": "Bearer",
    "expires_in": 900,
    "refresh_token": "rft_...",
    "user": {
      "user_id": "usr_01ARZ3...",
      "participant_id": "TRADER001",
      "display_name": "Trader One"
    }
  },
  "request_id": "req_123"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `access_token` | string | Opaque or JWT |
| `token_type` | string | Always `"Bearer"` |
| `expires_in` | integer | Seconds until access token expires |
| `refresh_token` | string | Longer-lived token |
| `user.user_id` | string | Stable system ID |
| `user.participant_id` | string | The trading participant identifier |
| `user.display_name` | string | Display name for UI |

**Error Responses:**

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Invalid credentials | 401 | `AUTHENTICATION_FAILED` |
| Account disabled | 403 | `ACCOUNT_DISABLED` |
| Validation failure | 400 | `VALIDATION_ERROR` |
| Too many attempts | 429 | `RATE_LIMITED` |

```json
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid participant ID or password.",
    "details": {}
  },
  "request_id": "req_123"
}
```

**Security note:** Do NOT distinguish between "participant_id not found" and "wrong password" in the error message. Both return `AUTHENTICATION_FAILED`. This prevents participant ID enumeration.

---

### 3.2 Logout

```
POST /api/v1/auth/logout
```

**Authentication required:** Yes

**Request body:** Empty `{}`

**Success Response — 200 OK:**
```json
{
  "data": {
    "logged_out": true
  },
  "request_id": "req_123"
}
```

**Behavior:**
- The refresh token is invalidated server-side immediately.
- Existing access tokens will expire naturally (or be invalidated if the backend uses a token blocklist — Agent 2 decision).
- Client must discard all locally held tokens on receiving this response.
- If the access token is already expired or invalid, the backend still returns 200 (idempotent logout).

---

### 3.3 Refresh

```
POST /api/v1/auth/refresh
```

**Authentication required:** No (uses refresh token in body)

**Request:**
```json
{
  "refresh_token": "rft_..."
}
```

**Success Response — 200 OK:**
```json
{
  "data": {
    "access_token": "eyJ...",
    "token_type": "Bearer",
    "expires_in": 900,
    "refresh_token": "rft_newtoken..."
  },
  "request_id": "req_123"
}
```

**Behavior:**
- Issues a new access token.
- May rotate the refresh token (recommended — Agent 2 decision).
- Old refresh token must be invalidated upon rotation.
- If the refresh token is expired or invalid: 401 `AUTHENTICATION_FAILED`.
- Client must replace stored tokens with the new values.

**Error Responses:**

| Condition | HTTP | Error Code |
|-----------|------|------------|
| Invalid/expired refresh token | 401 | `AUTHENTICATION_FAILED` |
| Refresh token already used (rotation) | 401 | `AUTHENTICATION_FAILED` |

---

### 3.4 Current User

```
GET /api/v1/auth/me
```

**Authentication required:** Yes

**Request:** No body

**Success Response — 200 OK:**
```json
{
  "data": {
    "user_id": "usr_01ARZ3...",
    "participant_id": "TRADER001",
    "display_name": "Trader One",
    "account_status": "ACTIVE"
  },
  "request_id": "req_123"
}
```

| Field | Type | Values |
|-------|------|--------|
| `account_status` | string enum | `ACTIVE`, `DISABLED` |

**Error Responses:**

| Condition | HTTP | Error Code |
|-----------|------|------------|
| No/invalid token | 401 | `AUTHENTICATION_REQUIRED` |
| Expired token | 401 | `AUTHENTICATION_REQUIRED` |

---

## 4. Authorization Rules

Authorization is **server-enforced**. The frontend must not be the only barrier.

| Rule | Enforcement |
|------|-------------|
| A participant can only read their own orders | Backend validates `user_id` on every order query |
| A participant can only read their own positions | Backend validates `user_id` on every position query |
| A participant can only read their own portfolio/balance | Backend validates `user_id` on every portfolio query |
| A participant cannot submit orders on behalf of another | Order creation always binds to authenticated `user_id` |
| A participant cannot modify another's balance or P&L | No such endpoint exists; all balance changes originate from committed Order Execution Service executions |
| Leaderboard is read-only and public to all authenticated participants | No private data exposed |

Any endpoint that returns private participant data must verify the authenticated identity matches the requested resource. This check happens in the backend — not in the API gateway, not in the frontend.

**Response on authorization failure:** `403 FORBIDDEN`

---

## 5. Unauthenticated Access

Endpoints that do NOT require authentication:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/market/status` (public market status — no authentication required)

All other endpoints require a valid `Authorization: Bearer <token>` header.

Requests to authenticated endpoints without a token return:
```
HTTP 401
```
```json
{
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication is required to access this resource.",
    "details": {}
  },
  "request_id": "req_123"
}
```

Requests with an expired token return the same 401 with the same `AUTHENTICATION_REQUIRED` code. The client must then attempt a refresh.

---

## 6. Session Expiration Behavior

```
Client makes authenticated request
        ↓
Server returns 401 AUTHENTICATION_REQUIRED
        ↓
Client attempts POST /auth/refresh
        ↓
[If refresh succeeds] → retry original request with new access token
[If refresh fails]    → force logout, redirect to login
```

The frontend must implement this flow. The backend does not retry on behalf of the client.

---

## 7. Rate Limiting on Auth Endpoints

Login endpoint must be rate-limited aggressively to prevent brute force.

- Recommended: per IP + per participant_id
- On rate limit: `429 RATE_LIMITED` with `Retry-After` header
- Exact limits are an Agent 2 configuration decision (requires load test data)

---

## 8. Audit Requirements

The following auth events must be traceable (implementation by Agent 2):
- Successful login (timestamp, participant_id, IP if available)
- Failed login (timestamp, participant_id, reason)
- Logout
- Token refresh
- Account disabled access attempt

The API exposes `request_id` for correlation. Audit logging implementation is internal to Agent 2.

---

## 9. Resolved and Implementation Decisions

The following were previously open. Contract-affecting ones are now resolved.

**Resolved (contract decisions):**

| ID | Decision | Resolution |
|----|----------|------------|
| OD-AUTH-02 | `GET /market/status` auth required | **No** — public endpoint (also resolved in `market.md`) |

**Implementation decisions (Agent 2 internal — do not affect public API):**

| ID | Decision | Recommendation |
|----|----------|----------------|
| OD-AUTH-01 | JWT vs opaque token | Either is conformant; JWT recommended for stateless scaling |
| OD-AUTH-03 | Login rate limit thresholds | Aggressive; requires load test data; results in `429 RATE_LIMITED` |
| OD-AUTH-04 | Refresh token rotation | Yes — rotate on each use for security |
| OD-AUTH-05 | Access token storage (Agent 1 decision) | In-memory preferred over localStorage |
