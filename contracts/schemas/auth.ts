/**
 * Auth schemas for Warangal Trading Ring API
 * STATUS: APPROVED — v1
 */

import type { UserId, ISOTimestamp } from './common.js';

export type UserRole = 'PARTICIPANT' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'DISABLED';

export interface AuthenticatedUser {
  user_id: UserId;
  participant_id: string;
  display_name: string;
  role?: UserRole;
  account_status?: AccountStatus;
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------
export interface RegisterRequest {
  participant_id: string;
  display_name: string;
  password: string;
}

export interface RegisterResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  user: AuthenticatedUser;
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------
export interface LoginRequest {
  participant_id: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  user: AuthenticatedUser;
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
  refresh_token: string;
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------
export interface LogoutResponse {
  success: boolean;
}

// ---------------------------------------------------------------------------
// GET /api/v1/auth/me
// ---------------------------------------------------------------------------
export interface MeResponse {
  user_id: UserId;
  participant_id: string;
  display_name: string;
  role: UserRole;
  account_status: AccountStatus;
  created_at: ISOTimestamp;
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/forgot-password & /reset-password
// ---------------------------------------------------------------------------
export interface ResetPasswordRequest {
  participant_id: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}
