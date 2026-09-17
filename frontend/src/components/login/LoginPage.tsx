import { useState } from 'react';
import ClubLogo from '../branding/ClubLogo';
import { useAuth } from '../../contexts/AuthContext';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { login } = useAuth();
  const [participantId, setParticipantId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantId.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await login(participantId.trim(), password);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[color:var(--background)] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-[340px] flex flex-col items-center gap-8">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-5">
          <ClubLogo size={52} className="text-[color:var(--accent)]" />
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-[0.14em] text-[color:var(--foreground)] uppercase leading-none">
              Warangal
            </h1>
            <p className="text-xs font-medium tracking-[0.22em] text-[color:var(--foreground-muted)] uppercase mt-1.5">
              Trading Ring
            </p>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-sm text-[color:var(--foreground-secondary)] tracking-wide">
          Enter the Ring
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3" noValidate>
          <div>
            <label htmlFor="participantId" className="sr-only">Participant ID</label>
            <input
              id="participantId"
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="Participant ID"
              autoComplete="username"
              autoCapitalize="characters"
              required
              className="w-full h-12 px-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm font-mono tracking-widest focus:outline-none focus:border-[color:var(--accent)] transition-colors"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
              className="w-full h-12 px-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm focus:outline-none focus:border-[color:var(--accent)] transition-colors"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-[color:var(--danger)] text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-1 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-[color:var(--background)] text-xs font-semibold tracking-[0.18em] uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entering…' : 'Enter the Ring'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-[11px] text-[color:var(--foreground-muted)] tracking-widest uppercase">
          Season 01
        </p>
      </div>
    </div>
  );
}
