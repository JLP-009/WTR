/**
 * Auth schemas for Warangal Trading Ring API
 * STATUS: DRAFT — v1
 */

import type { UserId, ISOTimestamp } from './common';

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------
export interface LoginRequest {
  participant_id: string;  // Max 64 chars, [A-Z0-9_-]
  password: string;        // Non-empty
}

export interface LoginResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;      // Seconds until access_token expires
  refresh_token: string;
  user: AuthenticatedUser;
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------
export interface LogoutResponse {
  logged_out: true;
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------
export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;   // Rotated token (new value)
}

// ---------------------------------------------------------------------------
// GET /api/v1/auth/me
// ---------------------------------------------------------------------------
export interface MeResponse {
  user_id: UserId;
  participant_id: string;
  display_name: string;
  account_status: AccountStatus;
}

// ---------------------------------------------------------------------------
// Shared sub-types
// ---------------------------------------------------------------------------
export interface AuthenticatedUser {
  user_id: UserId;
  participant_id: string;
  display_name: string;
}

export type AccountStatus = 'ACTIVE' | 'DISABLED';
