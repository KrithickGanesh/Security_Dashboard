import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthShell from '../../components/auth/AuthShell';

const DEMO_ACCOUNTS = [
  {
    role: 'Admin',
    email: 'admin@devsecops.local',
    description: 'Full platform control',
    dot: 'bg-rose-400'
  },
  {
    role: 'Security Analyst',
    email: 'analyst@devsecops.local',
    description: 'Triage & response',
    dot: 'bg-cyan-400'
  },
  {
    role: 'Developer',
    email: 'dev@devsecops.local',
    description: 'Remediate findings',
    dot: 'bg-emerald-400'
  },
  {
    role: 'Auditor',
    email: 'auditor@devsecops.local',
    description: 'Read-only evidence',
    dot: 'bg-violet-400'
  }
];

const DEMO_PASSWORD = 'Password123!';

export const Login = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutNotice, setLockoutNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const sessionExpired = searchParams.get('sessionExpired') === 'true';
  const redirectParam = searchParams.get('redirect');
  const from = redirectParam || location.state?.from?.pathname || '/dashboard';

  // Clear stale errors when the user edits the form
  useEffect(() => {
    if (errorMessage) setErrorMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLockoutNotice(null);
    setIsSubmitting(true);

    const result = await login({ email: email.trim(), password });
    setIsSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else if (result.statusCode === 423) {
      setLockoutNotice(result.message);
    } else {
      setErrorMessage(result.message || 'Unable to sign in. Please try again.');
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setErrorMessage('');
    setLockoutNotice(null);
  };

  return (
    <AuthShell
      kicker="Sign in"
      title="Welcome back"
      description="Use your organization credentials to access the security command center."
    >
      {sessionExpired && !errorMessage && (
        <div className="mb-4 flex items-start gap-2.5 rounded-control border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-[11.5px] text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Your session expired. Sign in again to continue where you left off.</span>
        </div>
      )}

      {lockoutNotice && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-control border border-severity-critical/30 bg-severity-critical/10 px-3.5 py-3"
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-severity-critical" />
          <div>
            <p className="text-[11.5px] font-semibold text-severity-critical">Account temporarily locked</p>
            <p className="mt-0.5 text-[11px] text-dark-muted">{lockoutNotice}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-control border border-severity-critical/30 bg-severity-critical/10 px-3.5 py-3 text-[11.5px] text-severity-critical"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="label">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-muted" />
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="input pl-9"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="label mb-0">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[11px] font-medium text-accent-cyan hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-muted" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="input pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-dark-muted transition-colors hover:text-dark-text"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary mt-1 w-full py-2.5">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Authenticating…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 rounded-card border border-dark-border bg-dark-surface/60">
        <button
          type="button"
          onClick={() => setShowDemo((prev) => !prev)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
          aria-expanded={showDemo}
        >
          <span className="flex items-center gap-2 text-[11px] font-medium text-dark-muted">
            <KeyRound className="h-3.5 w-3.5" />
            Demo accounts
          </span>
          <span className="text-[10px] text-dark-muted/70">
            {showDemo ? 'Hide' : 'Use a seeded role'}
          </span>
        </button>

        {showDemo && (
          <div className="border-t border-dark-border p-2.5">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  type="button"
                  key={account.email}
                  onClick={() => fillDemo(account.email)}
                  className="group flex items-center gap-2 rounded-control border border-dark-border bg-dark-bg/40 px-2.5 py-2 text-left transition-colors hover:border-accent-cyan/35 hover:bg-dark-raised"
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${account.dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium text-dark-text">
                      {account.role}
                    </span>
                    <span className="block truncate font-mono text-[9.5px] text-dark-muted">
                      {account.email}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 px-1 text-[10px] leading-relaxed text-dark-muted/80">
              All demo accounts share the password{' '}
              <code className="rounded bg-dark-raised px-1 py-0.5 text-[9.5px] text-accent-cyan">
                {DEMO_PASSWORD}
              </code>
              . Clicking a role fills the form; submitting signs you in.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[11.5px] text-dark-muted">
        Need an account?{' '}
        <Link to="/register" className="font-medium text-accent-cyan hover:underline">
          Register as a developer
        </Link>
      </p>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-dark-muted/60">
        <ShieldCheck className="h-3 w-3" />
        <span>Accounts lock after 5 failed attempts</span>
      </div>
    </AuthShell>
  );
};

export default Login;
