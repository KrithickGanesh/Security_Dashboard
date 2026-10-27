import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authApi from '../../api/auth.api';
import { Mail, ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Send } from 'lucide-react';
import AuthShell from '../../components/auth/AuthShell';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await authApi.forgotPassword(email.trim());
      setSuccessMessage(res.message || 'If that address exists, a reset link is on its way.');
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Could not send the reset email. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      kicker="Account recovery"
      title="Reset your password"
      description="We will email you a single-use link valid for 15 minutes."
    >
      {successMessage ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-card border border-emerald-500/25 bg-emerald-500/10 px-4 py-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-xs font-semibold text-emerald-400">Check your inbox</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-dark-muted">{successMessage}</p>
              <p className="mt-2 text-[10.5px] leading-relaxed text-dark-muted/80">
                In development, the email preview URL is printed in the API server console.
              </p>
            </div>
          </div>

          <Link to="/login" className="btn-secondary w-full py-2.5">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
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

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="forgot-email" className="label">
                Registered email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-muted" />
                <input
                  id="forgot-email"
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

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending link…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send reset link
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

export default ForgotPassword;
