import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react';

const ACCENTS = {
  cyan: {
    tile: 'border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan',
    glow: 'via-accent-cyan/50'
  },
  rose: {
    tile: 'border-severity-critical/25 bg-severity-critical/10 text-severity-critical',
    glow: 'via-severity-critical/50'
  },
  amber: {
    tile: 'border-severity-high/25 bg-severity-high/10 text-severity-high',
    glow: 'via-severity-high/50'
  },
  emerald: {
    tile: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
    glow: 'via-emerald-500/50'
  },
  indigo: {
    tile: 'border-accent-indigo/25 bg-accent-indigo/10 text-accent-indigo',
    glow: 'via-accent-indigo/50'
  }
};

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection = 'neutral',
  trendLabel = 'vs last period',
  accentColor = 'cyan',
  onClick
}) => {
  const accent = ACCENTS[accentColor] || ACCENTS.cyan;

  const trendBadge = () => {
    if (trend === undefined || trend === null) return null;

    let TrendIcon = Minus;
    let badgeColor = 'border-dark-border bg-dark-raised text-dark-muted';

    if (trendDirection === 'up') {
      TrendIcon = TrendingUp;
      badgeColor = 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400';
    } else if (trendDirection === 'down') {
      TrendIcon = TrendingDown;
      badgeColor = 'border-severity-critical/25 bg-severity-critical/10 text-severity-critical';
    }

    return (
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${badgeColor}`}
      >
        <TrendIcon className="h-3 w-3" />
        {trend}
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative overflow-hidden rounded-card border border-dark-border bg-dark-surface p-5 shadow-card transition-all duration-200 ${
        onClick
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-accent-cyan/35 hover:shadow-raised'
          : ''
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 ${accent.glow}`}
      />

      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-dark-muted">
          {title}
        </p>
        {Icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border ${accent.tile}`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="kpi-value font-mono">{value}</span>
        {trendBadge()}
      </div>

      {(subtitle || trendLabel) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-dark-border/70 pt-2.5">
          <span className="truncate text-[11px] text-dark-muted">{subtitle}</span>
          {trend !== undefined && trend !== null ? (
            <span className="shrink-0 text-[10px] text-dark-muted/80">{trendLabel}</span>
          ) : (
            onClick && (
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-dark-muted/50 transition-colors group-hover:text-accent-cyan" />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
