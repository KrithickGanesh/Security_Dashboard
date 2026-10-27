import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authApi from '../api/auth.api';
import Avatar from '../components/common/Avatar';
import PasswordStrengthMeter from '../components/common/PasswordStrengthMeter';
import {
  User,
  KeyRound,
  Bell,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

function PasswordField({ id, label, value, onChange, autoComplete, show, onToggle }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-dark-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className="input py-2 pr-10 text-sm"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={show}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-dark-muted transition-colors hover:text-dark-text"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

export const Profile = () => {
  const { user, updateUserProfile, logoutAll } = useAuth();

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [emailNotifs, setEmailNotifs] = useState(user?.notificationPreferences?.email ?? true);
  const [inAppNotifs, setInAppNotifs] = useState(user?.notificationPreferences?.inApp ?? true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

  // Deep links such as /profile#security should land on the password card.
  useEffect(() => {
    if (window.location.hash === '#security') {
      const timer = setTimeout(() => {
        document.getElementById('security')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await authApi.updateProfile({
        name,
        notificationPreferences: { email: emailNotifs, inApp: inAppNotifs }
      });
      if (res.success && res.data?.user) {
        updateUserProfile(res.data.user);
        toast.success('Profile updated successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[!@#$%^&*(),.?":{}|<>_\-+=~`]/.test(newPassword)
    ) {
      setPasswordError('New password must satisfy complexity requirements');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword
      });
      toast.success(res.message || 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Profile Card */}
      <div className="bg-dark-surface border border-dark-border rounded-card p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <Avatar name={user?.name} role={user?.role} size="lg" />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-bold text-dark-text">{user?.name}</h2>
            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 self-center sm:self-auto">
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-dark-muted font-mono mt-1">{user?.email}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-dark-muted">
            <span>
              Status:{' '}
              <strong className={user?.isActive ? 'text-accent-success' : 'text-severity-critical'}>
                {user?.isActive ? 'Active' : 'Deactivated'}
              </strong>
            </span>
            <span>
              Last Login:{' '}
              <span className="font-mono">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-dark-surface border border-dark-border rounded-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-dark-text mb-4 border-b border-dark-border pb-3">
            <User className="w-4 h-4 text-accent-cyan" />
            <span>Profile Details & Preferences</span>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-xs font-medium text-dark-muted mb-1">
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-control px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-accent-cyan"
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="block text-xs font-medium text-dark-muted mb-1">
                Email Address
              </label>
              <input
                id="profile-email"
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-dark-raised/50 border border-dark-border rounded-control px-3 py-2 text-sm text-dark-muted cursor-not-allowed"
              />
            </div>

            <div className="pt-2">
              <span className="block text-xs font-medium text-dark-muted mb-2">Notification Channels</span>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-dark-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifs}
                    onChange={(e) => setEmailNotifs(e.target.checked)}
                    className="checkbox"
                  />
                  <span>Email alerts for critical CVEs and pipeline gate breaches</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-dark-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inAppNotifs}
                    onChange={(e) => setInAppNotifs(e.target.checked)}
                    className="checkbox"
                  />
                  <span>In-app real-time notification toasts and bell badges</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="mt-4 px-4 py-2 bg-accent-cyan hover:bg-accent-cyan/90 text-dark-bg font-semibold rounded-control text-xs transition-colors disabled:opacity-50"
            >
              {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-dark-surface border border-dark-border rounded-card p-6" id="security">
          <div className="flex items-center gap-2 text-sm font-semibold text-dark-text mb-4 border-b border-dark-border pb-3">
            <KeyRound className="w-4 h-4 text-accent-cyan" />
            <span>Change Password</span>
          </div>

          {passwordError && (
            <div className="p-3 mb-4 rounded-control bg-severity-critical/15 border border-severity-critical/30 text-xs text-severity-critical flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3.5">
            <PasswordField
              id="current-password"
              label="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              show={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
            />

            <div>
              <PasswordField
                id="new-password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />
              <PasswordStrengthMeter password={newPassword} />
            </div>

            <PasswordField
              id="confirm-password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
            />

            <button
              type="submit"
              disabled={isChangingPassword}
              className="btn-primary mt-2"
            >
              {isChangingPassword ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Active Sessions & Security Controls */}
      <div className="bg-dark-surface border border-dark-border rounded-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-dark-text">Session Management</h4>
            <p className="text-xs text-dark-muted mt-0.5">
              Revoke your refresh tokens on all devices to enforce re-authentication.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmLogoutAll(true)}
            className="btn-danger btn-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out All Devices</span>
          </button>
        </div>
      </div>

      {/* Sign-out-all confirmation */}
      {confirmLogoutAll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-all-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmLogoutAll(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setConfirmLogoutAll(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-card border border-dark-border bg-dark-surface shadow-2xl">
            <div className="flex items-start gap-3 border-b border-dark-border px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-severity-critical/25 bg-severity-critical/10 text-severity-critical">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 id="logout-all-title" className="text-sm font-semibold text-dark-text">
                  Sign out of every device?
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-dark-muted">
                  All refresh tokens, including this session, will be revoked. You will be returned
                  to the sign-in screen and must authenticate again.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3">
              <button
                type="button"
                onClick={() => setConfirmLogoutAll(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmLogoutAll(false);
                  logoutAll();
                }}
                className="btn-danger"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out everywhere
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
