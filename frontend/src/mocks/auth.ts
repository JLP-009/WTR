import type { LoginRequest, LoginResponse } from '../contracts/v1/auth';

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function mockLogin(req: LoginRequest): Promise<LoginResponse> {
  await delay(600);

  // Admin login — credentials validated server-side in real API
  if (req.participantId === 'ADMIN001' && req.password.length > 0) {
    return {
      token: 'mock-admin-jwt-' + Date.now(),
      participant: {
        id: 'admin-1',
        participantId: 'ADMIN001',
        displayName: 'Admin',
        season: 'Season 01',
        role: 'ADMIN',
      },
    };
  }

  // Participant login
  if (req.participantId.length > 0 && req.password.length > 0) {
    return {
      token: 'mock-jwt-' + Date.now(),
      participant: {
        id: '1',
        participantId: req.participantId,
        displayName: 'Trader',
        season: 'Season 01',
        role: 'PARTICIPANT',
      },
    };
  }

  throw new Error('Invalid participant ID or password');
}
