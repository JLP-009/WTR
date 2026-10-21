import { useState, useEffect } from 'react';
import ClubLogo from '../branding/ClubLogo';
import { useAuth } from '../../contexts/AuthContext';
import { resetPassword, checkParticipantIdAvailability } from '../../lib/api/auth';
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');

  // Login state
  const [loginParticipantId, setLoginParticipantId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regParticipantId, setRegParticipantId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Forgot Password state
  const [forgotParticipantId, setForgotParticipantId] = useState('');
  const [forgotFirstName, setForgotFirstName] = useState('');
  const [forgotLastName, setForgotLastName] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  // Feedback states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [idCheckStatus, setIdCheckStatus] = useState<{
    status: 'idle' | 'checking' | 'available' | 'taken';
    message?: string;
  }>({ status: 'idle' });

  // Debounced check to verify if the requested Participant ID already exists
  useEffect(() => {
    const cleanId = regParticipantId.trim().toUpperCase();
    if (!cleanId || mode !== 'register') {
      setIdCheckStatus({ status: 'idle' });
      return;
    }
    if (cleanId.length < 3) {
      setIdCheckStatus({ status: 'idle' });
      return;
    }

    let isCancelled = false;
    setIdCheckStatus({ status: 'checking' });

    const timer = setTimeout(async () => {
      const res = await checkParticipantIdAvailability(cleanId);
      if (!isCancelled) {
        if (res.available) {
          setIdCheckStatus({ status: 'available' });
        } else {
          setIdCheckStatus({
            status: 'taken',
            message: res.reason || `This ID '${cleanId}' already exists. Please select another user ID.`,
          });
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [regParticipantId, mode]);

  const resetErrors = () => {
    setError('');
    setForgotSuccess('');
    setIdCheckStatus({ status: 'idle' });
  };

  const switchMode = (newMode: AuthMode) => {
    resetErrors();
    setMode(newMode);
  };

  // 1. Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginParticipantId.trim() || !loginPassword) {
      setError('Please enter both Participant ID and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(loginParticipantId.trim(), loginPassword);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Register (Create Account)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName.trim() || !regLastName.trim()) {
      setError('Please enter your First and Last name');
      return;
    }
    if (!regParticipantId.trim()) {
      setError('Please enter a unique Participant ID / Username');
      return;
    }
    const cleanId = regParticipantId.trim().toUpperCase();
    if (idCheckStatus.status === 'taken') {
      setError(idCheckStatus.message || `This ID '${cleanId}' already exists. Please select another user ID.`);
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register({
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        participantId: regParticipantId.trim(),
        password: regPassword,
      });
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Forgot Password
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotParticipantId.trim() || !forgotFirstName.trim() || !forgotLastName.trim()) {
      setError('Please fill in all verification fields');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('New passwords do not match. Please verify.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await resetPassword({
        participantId: forgotParticipantId.trim(),
        firstName: forgotFirstName.trim(),
        lastName: forgotLastName.trim(),
        newPassword: forgotNewPassword,
      });
      setForgotSuccess(res.message || 'Password reset successfully!');
      // Pre-fill login with the participant ID
      setLoginParticipantId(forgotParticipantId.trim());
      setLoginPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[color:var(--background)] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[380px] flex flex-col items-center gap-6">
        
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] shadow-sm flex items-center justify-center">
            <ClubLogo size={64} />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-xl font-black tracking-wider text-[color:var(--foreground)] uppercase leading-tight">
              Warangal Trading Ring <span className="text-[color:var(--accent)]">2.0</span>
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[color:var(--surface-muted)] border border-[color:var(--border)]">
              <span className="text-[10px] font-medium tracking-widest text-[color:var(--foreground-muted)] uppercase">
                Presented by
              </span>
              <span className="text-[10px] font-bold tracking-widest text-[color:var(--accent)] uppercase">
                FINWIZ
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation for Login / Register */}
        {mode !== 'forgot' && (
          <div className="w-full grid grid-cols-2 p-1 rounded-xl bg-[color:var(--surface-muted)] border border-[color:var(--border)]">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-2 text-xs font-bold tracking-wider uppercase rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-sm'
                  : 'text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`py-2 text-xs font-bold tracking-wider uppercase rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-sm'
                  : 'text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* ================= MODE: SIGN IN ================= */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="w-full space-y-3.5" noValidate>
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)] mb-1.5">
                Participant ID / Username
              </label>
              <input
                type="text"
                value={loginParticipantId}
                onChange={(e) => setLoginParticipantId(e.target.value)}
                placeholder="e.g. TRADER001"
                autoComplete="username"
                autoCapitalize="characters"
                required
                className="w-full h-11 px-3.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm font-mono tracking-wider focus:outline-none focus:border-[color:var(--accent)] transition-colors"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[11px] text-[color:var(--accent)] hover:underline font-medium"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm focus:outline-none focus:border-[color:var(--accent)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)] transition-colors p-1"
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="p-2.5 rounded-xl bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 text-xs text-[color:var(--danger)] text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-1 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white text-xs font-bold tracking-[0.18em] uppercase transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entering…' : 'Enter the Ring'}
            </button>
          </form>
        )}

        {/* ================= MODE: CREATE ACCOUNT ================= */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="w-full space-y-3" noValidate>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)] mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value)}
                  placeholder="John"
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm focus:outline-none focus:border-[color:var(--accent)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)] mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  placeholder="Doe"
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm focus:outline-none focus:border-[color:var(--accent)] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)]">
                  Choose Participant ID / Username
                </label>
                {idCheckStatus.status === 'checking' && (
                  <span className="text-[10px] text-[color:var(--foreground-muted)] font-mono animate-pulse">
                    Checking…
                  </span>
                )}
                {idCheckStatus.status === 'available' && (
                  <span className="text-[10px] text-emerald-500 font-semibold font-mono flex items-center gap-1">
                    ✓ Available
                  </span>
                )}
                {idCheckStatus.status === 'taken' && (
                  <span className="text-[10px] text-[color:var(--danger)] font-semibold font-mono flex items-center gap-1">
                    ✗ Already exists
                  </span>
                )}
              </div>
              <input
                type="text"
                value={regParticipantId}
                onChange={(e) => setRegParticipantId(e.target.value.toUpperCase())}
                placeholder="e.g. TRADER_JOHN"
                autoCapitalize="characters"
                required
                className={`w-full h-11 px-3.5 rounded-xl border bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm font-mono tracking-wider focus:outline-none transition-colors ${
                  idCheckStatus.status === 'taken'
                    ? 'border-[color:var(--danger)] focus:border-[color:var(--danger)]'
                    : idCheckStatus.status === 'available'
                    ? 'border-emerald-500/60 focus:border-emerald-500'
                    : 'border-[color:var(--border)] focus:border-[color:var(--accent)]'
                }`}
              />
              {idCheckStatus.status === 'taken' && (
                <p className="mt-1 text-[11px] font-medium text-[color:var(--danger)]">
                  {idCheckStatus.message || 'This ID already exists. Please select another user ID.'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm focus:outline-none focus:border-[color:var(--accent)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)] transition-colors p-1"
                  title={showRegPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)] mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm focus:outline-none focus:border-[color:var(--accent)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)] transition-colors p-1"
                  title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="p-2.5 rounded-xl bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 text-xs text-[color:var(--danger)] text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-1 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white text-xs font-bold tracking-[0.18em] uppercase transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account…' : 'Create Account & Enter'}
            </button>
          </form>
        )}

        {/* ================= MODE: FORGOT PASSWORD ================= */}
        {mode === 'forgot' && (
          <div className="w-full space-y-4">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="inline-flex items-center gap-1.5 text-xs text-[color:var(--foreground-secondary)] hover:text-[color:var(--foreground)] transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </button>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-[color:var(--foreground)]">Reset Password</h2>
              <p className="text-xs text-[color:var(--foreground-muted)]">
                Verify your identity with your registered Participant ID and full name.
              </p>
            </div>

            {forgotSuccess ? (
              <div className="space-y-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <p className="text-xs font-medium text-emerald-500">
                  {forgotSuccess}
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full h-10 rounded-xl bg-[color:var(--accent)] text-white text-xs font-bold tracking-wider uppercase transition-colors"
                >
                  Proceed to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3" noValidate>
                <div>
                  <label className="block text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)] mb-1">
                    Participant ID / Username
                  </label>
                  <input
                    type="text"
                    value={forgotParticipantId}
                    onChange={(e) => setForgotParticipantId(e.target.value.toUpperCase())}
                    placeholder="e.g. TRADER001"
                    required
                    className="w-full h-11 px-3.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm font-mono tracking-wider focus:outline-none focus:border-[color:var(--accent)] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)] mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={forgotFirstName}
                      onChange={(e) => setForgotFirstName(e.target.value)}
                      placeholder="John"
                      required
                      className="w-full h-11 px-3.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm focus:outline-none focus:border-[color:var(--accent)] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)] mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={forgotLastName}
                      onChange={(e) => setForgotLastName(e.target.value)}
                      placeholder="Doe"
                      required
                      className="w-full h-11 px-3.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm focus:outline-none focus:border-[color:var(--accent)] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)] mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm focus:outline-none focus:border-[color:var(--accent)] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)] transition-colors p-1"
                      title={showForgotNewPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-wider uppercase text-[color:var(--foreground-secondary)] mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotConfirmPassword ? 'text' : 'password'}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] placeholder:text-[color:var(--foreground-muted)] text-sm focus:outline-none focus:border-[color:var(--accent)] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)] transition-colors p-1"
                      title={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showForgotConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div role="alert" className="p-2.5 rounded-xl bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 text-xs text-[color:var(--danger)] text-center font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-1 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white text-xs font-bold tracking-[0.18em] uppercase transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-[10px] text-[color:var(--foreground-muted)] tracking-widest uppercase">
          Warangal Trading Ring 2.0 • Season 01
        </p>
      </div>
    </div>
  );
}
