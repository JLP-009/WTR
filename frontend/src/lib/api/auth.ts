import { mockLogin } from '../../mocks/auth';
import type { LoginRequest, LoginResponse } from '../../contracts/v1/auth';

export async function login(req: LoginRequest): Promise<LoginResponse> {
  return mockLogin(req);
}
