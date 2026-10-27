import React from 'react';
import { formatUserLabel } from '../../utils/format';

const ROLE_STYLES = {
  Admin: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'Security Analyst': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  Developer: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Auditor: 'bg-violet-500/15 text-violet-300 border-violet-500/30'
};

const SIZES = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm'
};

export const Avatar = ({ name = 'User', role = 'Developer', size = 'md', className = '' }) => {
  const initials = (() => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  })();

  return (
    <div
      className={`flex shrink-0 select-none items-center justify-center rounded-full border font-semibold tracking-wide ${
        SIZES[size] || SIZES.md
      } ${ROLE_STYLES[role] || 'border-dark-border bg-dark-raised text-dark-muted'} ${className}`}
      title={formatUserLabel({ name, role })}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
};

export default Avatar;
