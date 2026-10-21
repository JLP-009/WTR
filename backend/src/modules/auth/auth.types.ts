import { z } from 'zod';

export const loginRequestSchema = z.object({
  participant_id: z.string().trim().min(1, 'Participant ID is required').max(64).regex(/^[A-Za-z0-9_.\-@]+$/, 'Participant ID can only contain letters, numbers, dots, underscores, and hyphens'),
  password: z.string().min(1, 'Password is required'),
  device_id: z.string().trim().max(128).optional(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({
  refresh_token: z.string().min(1),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const registerRequestSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(50),
  last_name: z.string().trim().min(1, 'Last name is required').max(50),
  participant_id: z.string().trim().min(3, 'Participant ID must be at least 3 characters').max(64).regex(/^[A-Za-z0-9_.\-@]+$/, 'Participant ID can only contain letters, numbers, dots, underscores, and hyphens'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  device_id: z.string().trim().max(128).optional(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  participant_id: z.string().trim().min(1, 'Participant ID is required'),
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  new_password: z.string().min(6, 'New password must be at least 6 characters'),
  device_id: z.string().trim().max(128).optional(),
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const changePasswordRequestSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(6, 'New password must be at least 6 characters'),
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

export interface AuthUserResponse {
  user_id: string;
  participant_id: string;
  display_name: string;
  role: 'PARTICIPANT' | 'ADMIN';
}

export interface LoginResponseData {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  user: AuthUserResponse;
}

export interface RefreshResponseData {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
}
