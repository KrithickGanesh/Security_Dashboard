import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import authApi from '../../api/auth.api';
import {
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import PasswordStrengthMeter from '../../components/common/PasswordStrengthMeter';
import AuthShell from '../../components/auth/AuthShell';

export const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    try {
      await authApi.resetPassword(token, { password, confirmPassword });
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Password reset failed. The link may have expired.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      kicker="Account recovery"
      title={isSuccess ? 'Password updated' : 'Choose a new password'}
      description={
        isSuccess
          ? 'Your credentials have been rotated across all sessions.'
          : 'Your new password must meet the organization complexity policy.'
      }
    >
      {isSuccess ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-card border border-emerald-500/25 bg-emerald-500/10 px-4 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-xs font-semibold text-emerald-400">All set</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-dark-muted">
                Sign in with your new password. Existing refresh tokens have been revoked.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="btn-primary w-full py-2.5"
          >
            Continue to sign in
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
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
              <label htmlFor="reset-password" className="label">
                New password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-muted" />
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  autoFocus
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
              <label htmlFor="reset-confirm" className="label">
                Confirm new password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-muted" />
                <input
                  id="reset-confirm"
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
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary mt-2 w-full py-2.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating password…
                </>
              ) : (
                <>
                  Save new password
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <Link
            to="/login"
            className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] text-dark-muted transition-colors hover:text-dark-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </>
      )}
    </AuthShell>
  );
};

export default ResetPassword;
