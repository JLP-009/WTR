import { api } from './client';
import { mockLogin } from '../../mocks/auth';
import type { LoginRequest, LoginResponse } from '../../contracts/v1/auth';

interface BackendLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    user_id: string;
    participant_id: string;
    display_name: string;
    role: 'PARTICIPANT' | 'ADMIN';
  };
}

export function getOrCreateDeviceId(): string {
  const STORAGE_KEY = 'wtr_device_fingerprint_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = 'dev_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).substring(2) + Date.now().toString(36));
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return deviceId;
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  try {
    const data = await api.post<BackendLoginResponse>('/auth/login', {
      participant_id: req.participantId,
      password: req.password,
      device_id: getOrCreateDeviceId(),
    });

    return {
      token: data.access_token,
      refreshToken: data.refresh_token,
      participant: {
        id: data.user.user_id,
        participantId: data.user.participant_id,
        displayName: data.user.display_name,
        season: 'Season 1',
        role: data.user.role,
      },
    };
  } catch (err: any) {
    throw new Error(err.message || 'Unable to connect to backend authentication service.');
  }
}

export interface RegisterRequestPayload {
  firstName: string;
  lastName: string;
  participantId: string;
  password: string;
}

export interface ResetPasswordRequestPayload {
  participantId: string;
  firstName: string;
  lastName: string;
  newPassword: string;
}

export async function checkParticipantIdAvailability(id: string): Promise<{ available: boolean; reason?: string }> {
  try {
    const cleanId = id.trim().toUpperCase();
    if (!cleanId) return { available: false, reason: 'Please enter a valid User ID' };
    const data = await api.get<{ available: boolean; reason?: string }>(`/auth/check-id/${encodeURIComponent(cleanId)}`);
    return data;
  } catch (err: any) {
    return { available: true };
  }
}

export async function register(req: RegisterRequestPayload): Promise<LoginResponse> {
  try {
    const data = await api.post<BackendLoginResponse>('/auth/register', {
      first_name: req.firstName,
      last_name: req.lastName,
      participant_id: req.participantId,
      password: req.password,
      device_id: getOrCreateDeviceId(),
    });

    return {
      token: data.access_token,
      refreshToken: data.refresh_token,
      participant: {
        id: data.user.user_id,
        participantId: data.user.participant_id,
        displayName: data.user.display_name,
        season: 'Season 1',
        role: data.user.role,
      },
    };
  } catch (err: any) {
    throw new Error(err.message || 'Registration failed. Please try again.');
  }
}

export async function resetPassword(req: ResetPasswordRequestPayload): Promise<{ success: boolean; message: string }> {
  try {
    const data = await api.post<{ success: boolean; message: string }>('/auth/forgot-password', {
      participant_id: req.participantId,
      first_name: req.firstName,
      last_name: req.lastName,
      new_password: req.newPassword,
      device_id: getOrCreateDeviceId(),
    });
    return data;
  } catch (err: any) {
    throw new Error(err.message || 'Unable to reset password.');
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore error on logout
  }
}
