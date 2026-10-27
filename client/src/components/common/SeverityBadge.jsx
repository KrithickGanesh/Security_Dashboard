import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react';

export const SeverityBadge = ({ severity = 'Info', size = 'sm' }) => {
  const norm = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();

  const configs = {
    Critical: {
      color: 'text-severity-critical bg-severity-critical/15 border-severity-critical/30',
      icon: ShieldAlert
    },
    High: {
      color: 'text-severity-high bg-severity-high/15 border-severity-high/30',
      icon: AlertTriangle
    },
    Medium: {
      color: 'text-severity-medium bg-severity-medium/15 border-severity-medium/30',
      icon: AlertCircle
    },
    Low: {
      color: 'text-severity-low bg-severity-low/15 border-severity-low/30',
      icon: Info
    },
    Info: {
      color: 'text-severity-info bg-severity-info/15 border-severity-info/30',
      icon: ShieldCheck
    }
  };

  const current = configs[norm] || configs.Info;
  const IconComponent = current.icon;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-3 py-1 text-sm gap-2'
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${current.color} ${
        sizeClasses[size] || sizeClasses.sm
      }`}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      <span>{norm}</span>
    </span>
  );
};

export default SeverityBadge;
