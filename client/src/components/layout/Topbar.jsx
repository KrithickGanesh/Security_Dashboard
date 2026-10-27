import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  User,
  KeyRound,
  LogOut,
  ChevronDown,
  ShieldAlert,
  CheckCircle2,
  Command,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import notificationsApi from '../../api/notifications.api';
import ThemeToggle from '../common/ThemeToggle';
import Avatar from '../common/Avatar';
import { getPageMeta } from './navigation';

export const Topbar = ({ openMobileMenu, openCommandPalette }) => {
  const { user, logout } = useAuth();
  const { unreadCount, notifications, markAllAsRead, setUnreadCount, refreshNotifications } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const page = getPageMeta(location.pathname);

  // Close dropdowns on outside click / Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsProfileOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);
  }, [location.pathname]);

  const handleNotificationClick = async (notif) => {
    setIsNotificationsOpen(false);
    if (!notif.isRead) {
      try {
        await notificationsApi.markAsRead(notif._id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        // Refresh so the dropdown row itself loses its unread styling.
        await refreshNotifications();
      } catch {
        // Non-fatal: still navigate
      }
    }
    navigate(notif.link || '/notifications');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-dark-border bg-dark-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left: mobile menu + breadcrumb */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={openMobileMenu}
            className="rounded-control p-2 text-dark-muted transition-colors hover:bg-dark-raised hover:text-dark-text lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-dark-muted">
              <span className="hidden sm:inline">{page.section}</span>
              <span className="hidden text-dark-muted/40 sm:inline">/</span>
              <span className="text-accent-cyan">{page.title}</span>
            </div>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-dark-text">
              {page.title}
            </h1>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Command palette trigger */}
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden items-center gap-2 rounded-control border border-dark-border bg-dark-bg/50 py-1.5 pl-3 pr-2 text-xs text-dark-muted transition-colors hover:border-accent-cyan/40 hover:text-dark-text md:flex"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="w-40 text-left lg:w-48">Search or jump to…</span>
            <kbd className="flex items-center gap-0.5 rounded border border-dark-border bg-dark-raised px-1.5 py-0.5 font-mono text-[10px]">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          <button
            type="button"
            onClick={openCommandPalette}
            className="rounded-control p-2 text-dark-muted transition-colors hover:bg-dark-raised hover:text-dark-text md:hidden"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          <ThemeToggle />

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className={`relative rounded-control border p-2 transition-colors ${
                isNotificationsOpen
                  ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
                  : 'border-dark-border bg-dark-surface text-dark-muted hover:border-accent-cyan/30 hover:text-dark-text'
              }`}
              title="Notifications"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-severity-critical px-1 text-[9px] font-bold text-white ring-2 ring-dark-surface">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-card border border-dark-border bg-dark-surface shadow-raised animate-scale-in sm:w-96">
                <div className="flex items-center justify-between border-b border-dark-border px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-dark-text">Notifications</p>
                    <p className="text-[10px] text-dark-muted">
                      {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-[11px] font-medium text-accent-cyan hover:underline"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 divide-y divide-dark-border/60 overflow-y-auto scroll-thin">
                  {notifications.length === 0 ? (
                    <div className="empty-state py-10">
                      <Bell className="h-5 w-5 text-dark-muted/60" />
                      <p className="text-xs text-dark-muted">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((notif) => (
                      <button
                        type="button"
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors ${
                          !notif.isRead ? 'bg-accent-cyan/[0.04]' : 'hover:bg-dark-raised/50'
                        }`}
                      >
                        <span
                          className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                            notif.severity === 'Critical'
                              ? 'bg-severity-critical'
                              : notif.severity === 'High'
                                ? 'bg-severity-high'
                                : notif.isRead
                                  ? 'bg-dark-border'
                                  : 'bg-accent-cyan'
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[11.5px] font-medium text-dark-text">
                              {notif.title}
                            </span>
                            <span className="shrink-0 font-mono text-[9px] text-dark-muted">
                              {new Date(notif.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-dark-muted">
                            {notif.message}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-dark-border p-2 text-center">
                  <Link
                    to="/notifications"
                    className="text-[11px] font-medium text-accent-cyan hover:underline"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className={`flex items-center gap-2 rounded-control border p-1 pr-1.5 transition-colors sm:pr-2 ${
                isProfileOpen
                  ? 'border-accent-cyan/40 bg-accent-cyan/5'
                  : 'border-transparent hover:border-dark-border hover:bg-dark-raised/60'
              }`}
              aria-label="Account menu"
              aria-expanded={isProfileOpen}
            >
              <Avatar name={user?.name} role={user?.role} size="sm" />
              <span className="hidden max-w-[120px] truncate text-xs font-medium text-dark-text sm:inline">
                {user?.name?.split(' ')[0]}
              </span>
              <ChevronDown
                className={`hidden h-3.5 w-3.5 text-dark-muted transition-transform sm:block ${
                  isProfileOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-card border border-dark-border bg-dark-surface shadow-raised animate-scale-in">
                <div className="border-b border-dark-border px-4 py-3">
                  <p className="truncate text-xs font-semibold text-dark-text">
                    {user?.name}
                  </p>
                  <p className="truncate font-mono text-[10px] text-dark-muted">
                    {user?.email}
                  </p>
                  <span className="badge-info mt-2">{user?.role}</span>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-dark-muted transition-colors hover:bg-dark-raised hover:text-dark-text"
                  >
                    <User className="h-3.5 w-3.5" />
                    My profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/profile#security');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-dark-muted transition-colors hover:bg-dark-raised hover:text-dark-text"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Security &amp; password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/notifications');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-dark-muted transition-colors hover:bg-dark-raised hover:text-dark-text"
                  >
                    <Radio className="h-3.5 w-3.5" />
                    Alert inbox
                  </button>
                </div>

                <div className="border-t border-dark-border py-1">
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-severity-critical transition-colors hover:bg-severity-critical/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
