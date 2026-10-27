import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  X,
  CircleDot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../common/Avatar';
import { getNavigationForRole } from './navigation';

export const Sidebar = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  closeMobileMenu
}) => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();
  const role = user?.role || 'Developer';
  const navSections = getNavigationForRole(role);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex flex-col border-r border-dark-border bg-dark-surface transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[76px]' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-dark-border px-4">
          <NavLink
            to="/dashboard"
            className="flex min-w-0 items-center gap-3"
            onClick={closeMobileMenu}
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-accent-cyan/30 bg-gradient-to-br from-accent-cyan/25 to-accent-indigo/15 text-accent-cyan shadow-glow-sm">
              <Shield className="h-[18px] w-[18px]" />
            </span>
            {!isCollapsed && (
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-semibold tracking-tight text-dark-text">
                  SentryOps
                </span>
                <span className="truncate text-[9px] font-medium uppercase tracking-[0.18em] text-dark-muted">
                  Security Platform
                </span>
              </span>
            )}
          </NavLink>

          {/* Mobile close */}
          <button
            type="button"
            onClick={closeMobileMenu}
            className="rounded-md p-1.5 text-dark-muted hover:bg-dark-raised hover:text-dark-text lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Desktop collapse */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="hidden rounded-md p-1.5 text-dark-muted transition-colors hover:bg-dark-raised hover:text-dark-text lg:flex"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scroll-thin">
          {navSections.map((section) => (
            <div key={section.group} className="space-y-1">
              {!isCollapsed && (
                <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-dark-muted/70">
                  {section.group}
                </p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/dashboard' &&
                    location.pathname.startsWith(`${item.path}/`));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    title={isCollapsed ? item.name : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 rounded-control py-2.5 text-xs font-medium transition-colors ${
                      isCollapsed ? 'justify-center px-0' : 'px-3'
                    } ${
                      isActive
                        ? 'bg-accent-cyan/10 text-accent-cyan'
                        : 'text-dark-muted hover:bg-dark-raised/70 hover:text-dark-text'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-accent-cyan" />
                    )}
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-accent-cyan' : 'text-dark-muted group-hover:text-dark-text'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-dark-border p-3">
          {!isCollapsed && (
            <div className="mb-3 flex items-center gap-2 rounded-control border border-dark-border/70 bg-dark-raised/40 px-2.5 py-2">
              <CircleDot
                className={`h-3 w-3 shrink-0 ${isConnected ? 'text-emerald-400' : 'text-severity-critical'}`}
              />
              <span className="text-[10px] font-medium text-dark-muted">
                {isConnected ? 'Live telemetry connected' : 'Telemetry offline'}
              </span>
              <span
                className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${
                  isConnected ? 'animate-pulse bg-emerald-400' : 'bg-severity-critical'
                }`}
              />
            </div>
          )}

          <div
            className={`flex items-center gap-2.5 ${
              isCollapsed ? 'flex-col' : 'justify-between'
            }`}
          >
            <NavLink
              to="/profile"
              className="flex min-w-0 items-center gap-2.5"
              title={isCollapsed ? 'My profile' : undefined}
            >
              <Avatar name={user?.name} role={role} size="sm" />
              {!isCollapsed && (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[11.5px] font-medium text-dark-text">
                    {user?.name || 'User'}
                  </span>
                  <span className="truncate text-[10px] text-dark-muted">{role}</span>
                </span>
              )}
            </NavLink>

            <div className={`flex items-center ${isCollapsed ? 'flex-col gap-1' : 'gap-1'}`}>
              {isCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsCollapsed(false)}
                  className="rounded-md p-1.5 text-dark-muted transition-colors hover:bg-dark-raised hover:text-dark-text"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={logout}
                className="rounded-md p-1.5 text-dark-muted transition-colors hover:bg-severity-critical/10 hover:text-severity-critical"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
