import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PasswordStrengthMeter from '../../components/common/PasswordStrengthMeter';
import AuthShell from '../../components/auth/AuthShell';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[!@#$%^&*(),.?":{}|<>_\-+=~`]/.test(password)
    ) {
      setErrorMessage('Please satisfy all password complexity requirements.');
      return;
    }

    setIsSubmitting(true);
    const result = await register({ name: name.trim(), email: email.trim(), password, confirmPassword });
    setIsSubmitting(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <AuthShell
      kicker="Create account"
      title="Join the security workspace"
      description="Self-service registration provisions a Developer account with remediation access."
    >
      {errorMessage && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-control border border-severity-critical/30 bg-severity-critical/10 px-3.5 py-3 text-[11.5px] text-severity-critical"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        <div>
          <label htmlFor="register-name" className="label">
            Full name
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-muted" />
            <input
              id="register-name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
              className="input pl-9"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-email" className="label">
            Work email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-muted" />
            <input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className="input pl-9"
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-password" className="label">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-muted" />
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
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
          <PasswordStrengthMeter password={password} />
        </div>

        <div>
          <label htmlFor="register-confirm" className="label">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-muted" />
            <input
              id="register-confirm"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className={`input pl-9 ${
                confirmPassword && confirmPassword !== password
                  ? 'border-severity-critical/60 focus:border-severity-critical'
                  : ''
              }`}
            />
          </div>
          {confirmPassword && confirmPassword !== password && (
            <p className="mt-1 text-[10.5px] text-severity-critical">Passwords do not match.</p>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary mt-2 w-full py-2.5">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-4 rounded-control border border-dark-border bg-dark-raised/40 px-3.5 py-2.5 text-[10.5px] leading-relaxed text-dark-muted">
        Need elevated privileges? Ask a security administrator to grant Admin, Analyst or Auditor
        access after registration.
      </div>

      <p className="mt-5 text-center text-[11.5px] text-dark-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent-cyan hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default Register;
