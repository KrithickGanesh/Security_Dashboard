import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ShieldCheck, Radar, ScrollText, Activity } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Policy gates that actually block',
    description: 'Signed CI webhooks enforce severity thresholds before code ships.'
  },
  {
    icon: Radar,
    title: 'One queue for every scanner',
    description: 'SAST, SCA, secrets and container findings deduplicated into a single backlog.'
  },
  {
    icon: ScrollText,
    title: 'Audit-ready evidence',
    description: 'Immutable activity trails mapped to OWASP, NIST, ISO 27001, SOC 2 and PCI-DSS.'
  }
];

/**
 * Shared two-panel layout for login / register / password recovery.
 */
export const AuthShell = ({ children, title, description, kicker = 'Security platform' }) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-dark-bg text-dark-text lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-dark-border bg-dark-surface p-10 lg:flex xl:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-hero-glow opacity-90"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-40"
        />

        <div className="relative">
          <Link to="/login" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-accent-cyan/30 bg-gradient-to-br from-accent-cyan/25 to-accent-indigo/15 text-accent-cyan shadow-glow-sm">
              <Shield className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold tracking-tight">SentryOps</span>
              <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-dark-muted">
                Security platform
              </span>
            </span>
          </Link>

          <div className="mt-16 max-w-md">
            <p className="eyebrow">Continuous assurance</p>
            <h1 className="mt-3 text-[34px] font-semibold leading-[1.15] tracking-tight text-balance">
              Ship fast without shipping vulnerabilities.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-dark-muted">
              A single control plane for pipeline security, remediation SLAs and multi-framework
              compliance evidence.
            </p>
          </div>

          <ul className="mt-10 space-y-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dark-border bg-dark-surface/80 text-accent-cyan">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-xs font-medium text-dark-text">
                      {feature.title}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-dark-muted">
                      {feature.description}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative mt-12 grid grid-cols-3 gap-4 border-t border-dark-border/70 pt-6">
          {[
            { value: '6', label: 'Frameworks' },
            { value: '30d', label: 'SLA window' },
            { value: 'HMAC', label: 'Signed ingest' }
          ].map((item) => (
            <div key={item.label}>
              <p className="font-mono text-lg font-semibold text-dark-text">{item.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-dark-muted">{item.label}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2.5 lg:invisible">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan">
              <Shield className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">SentryOps</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[400px] animate-fade-up">
            <p className="eyebrow">{kicker}</p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-tight text-dark-text">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-[13px] leading-relaxed text-dark-muted">{description}</p>
            )}

            <div className="mt-6">{children}</div>
          </div>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-dark-muted/70">
          <Activity className="h-3 w-3" />
          Protected by rate limiting, account lockout and audit logging
        </p>
      </main>
    </div>
  );
};

export default AuthShell;
