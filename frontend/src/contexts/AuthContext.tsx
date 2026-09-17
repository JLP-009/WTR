import { createContext, useContext, useState } from 'react';
import { login as apiLogin } from '../lib/api/auth';
import type { Participant } from '../contracts/v1/auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  participant: Participant | null;
  /** Access token — memory only, never localStorage (auth contract requirement) */
  token: string | null;
  login: (participantId: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = async (participantId: string, password: string) => {
    const res = await apiLogin({ participantId, password });
    setParticipant(res.participant);
    setToken(res.token);
  };

  const logout = () => {
    setParticipant(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!participant, participant, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
