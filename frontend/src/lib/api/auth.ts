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

export async function login(req: LoginRequest): Promise<LoginResponse> {
  try {
    const data = await api.post<BackendLoginResponse>('/auth/login', {
      participant_id: req.participantId,
      password: req.password,
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

export async function register(req: RegisterRequestPayload): Promise<LoginResponse> {
  try {
    const data = await api.post<BackendLoginResponse>('/auth/register', {
      first_name: req.firstName,
      last_name: req.lastName,
      participant_id: req.participantId,
      password: req.password,
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
