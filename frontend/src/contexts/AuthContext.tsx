import { createContext, useContext, useState } from 'react';
import { login as apiLogin, logout as apiLogout, register as apiRegister, type RegisterRequestPayload } from '../lib/api/auth';
import { setAuthToken } from '../lib/api/client';
import type { Participant } from '../contracts/v1/auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  participant: Participant | null;
  /** Access token — memory only, never localStorage (auth contract requirement) */
  token: string | null;
  login: (participantId: string, password: string) => Promise<void>;
  register: (payload: RegisterRequestPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_TOKEN_KEY = 'wtr_access_token';
const STORAGE_USER_KEY = 'wtr_user_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [participant, setParticipant] = useState<Participant | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (saved) setAuthToken(saved);
      return saved;
    } catch {
      return null;
    }
  });

  const login = async (participantId: string, password: string) => {
    const res = await apiLogin({ participantId, password });
    setParticipant(res.participant);
    setToken(res.token);
    setAuthToken(res.token);
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, res.token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(res.participant));
    } catch {}
  };

  const register = async (payload: RegisterRequestPayload) => {
    const res = await apiRegister(payload);
    setParticipant(res.participant);
    setToken(res.token);
    setAuthToken(res.token);
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, res.token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(res.participant));
    } catch {}
  };

  const logout = () => {
    apiLogout().catch(() => {});
    setParticipant(null);
    setToken(null);
    setAuthToken(null);
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!participant, participant, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
