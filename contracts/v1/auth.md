# Auth API Contract Specification

**Version:** v1  
**Prefix:** `/api/v1/auth`  
**Status:** APPROVED & IMPLEMENTED

---

## 1. Overview

Handles trader registration, password-based login, JWT token issuance, refresh token rotation, session revocation, and authenticated profile queries.

---

## 2. Endpoints

### 2.1. `POST /api/v1/auth/register`
Creates a new participant account and initializes their starting portfolio balance ($1,000,000.00).

- **Authentication:** None (Public)
- **Request Body:**
  ```json
  {
    "participant_id": "TRADER101",
    "display_name": "Alex Mercer",
    "password": "SecurePassword123!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
      "refresh_token": "rt_01J8ABC...",
      "expires_in": 900,
      "token_type": "Bearer",
      "user": {
        "user_id": "usr_01J8XYZ...",
        "participant_id": "TRADER101",
        "display_name": "Alex Mercer",
        "role": "PARTICIPANT",
        "account_status": "ACTIVE"
      }
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.2. `POST /api/v1/auth/login`
Authenticates a trader or administrator using their participant ID and password.

- **Authentication:** None (Public)
- **Request Body:**
  ```json
  {
    "participant_id": "TRADER001",
    "password": "traderPassword123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
      "refresh_token": "rt_01J8ABC...",
      "expires_in": 900,
      "token_type": "Bearer",
      "user": {
        "user_id": "usr_01J8XYZ...",
        "participant_id": "TRADER001",
        "display_name": "Trader One",
        "role": "PARTICIPANT",
        "account_status": "ACTIVE"
      }
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.3. `POST /api/v1/auth/refresh`
Rotates an expired access token using a valid refresh token.

- **Authentication:** None (Public)
- **Request Body:**
  ```json
  {
    "refresh_token": "rt_01J8ABC..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
      "refresh_token": "rt_01J8DEF...",
      "expires_in": 900,
      "token_type": "Bearer"
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.4. `POST /api/v1/auth/logout`
Revokes the refresh token and terminates the active session.

- **Authentication:** Required (`Bearer <access_token>`)
- **Request Body:**
  ```json
  {
    "refresh_token": "rt_01J8ABC..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "data": {
      "success": true
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.5. `GET /api/v1/auth/me`
Fetches the profile details of the authenticated caller.

- **Authentication:** Required (`Bearer <access_token>`)
- **Response (200 OK):**
  ```json
  {
    "data": {
      "user_id": "usr_01J8XYZ...",
      "participant_id": "TRADER001",
      "display_name": "Trader One",
      "role": "PARTICIPANT",
      "account_status": "ACTIVE",
      "created_at": "2026-09-30T09:00:00.000Z"
    },
    "request_id": "req_01J8ABC..."
  }
  ```

---

### 2.6. `POST /api/v1/auth/forgot-password` & `POST /api/v1/auth/reset-password`
Allows participants to reset their password using their `participant_id`.

- **Authentication:** None (Public)
- **Request Body:**
  ```json
  {
    "participant_id": "TRADER001",
    "new_password": "NewSecurePassword456!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "data": {
      "success": true,
      "message": "Password updated successfully."
    },
    "request_id": "req_01J8ABC..."
  }
  ```
