// FRONTEND/API CONTRACT DRAFT — v1

export interface LoginRequest {
  participantId: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  participant: Participant;
}

/**
 * UI routing role only — backend independently enforces authorization.
 * Frontend role checks are NOT a security boundary.
 */
export type UserRole = 'PARTICIPANT' | 'ADMIN';

export interface Participant {
  id: string;
  participantId: string;
  displayName: string;
  season: string;
  role?: UserRole;
}

export interface AuthState {
  isAuthenticated: boolean;
  participant: Participant | null;
  token: string | null;
}
