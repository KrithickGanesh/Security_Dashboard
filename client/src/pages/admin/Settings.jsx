import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Clock,
  ShieldAlert,
  Lock,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  RotateCcw,
  KeyRound,
  FileWarning,
  BellRing,
  Timer,
  CaseSensitive
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../api/admin.api';

const DEFAULT_FORM = {
  slaDays: {
    critical: 2,
    high: 7,
    medium: 30,
    low: 90
  },
  gatePolicyDefaults: {
    failOnCritical: true,
    maxHigh: 3,
    maxMedium: 15
  },
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    lockoutThreshold: 5,
    lockoutMinutes: 15
  },
  emailNotifications: {
    enabled: true,
    alertOnCritical: true,
    alertOnGateFail: true
  }
};

const SLA_FIELDS = [
  {
    key: 'critical',
    label: 'Critical',
    hint: 'Active exploitation / exposed secrets',
    tone: 'text-severity-critical',
    ring: 'focus:border-severity-critical/50'
  },
  {
    key: 'high',
    label: 'High',
    hint: 'Serious, exploitable with effort',
    tone: 'text-severity-high',
    ring: 'focus:border-severity-high/50'
  },
  {
    key: 'medium',
    label: 'Medium',
    hint: 'Requires specific conditions',
    tone: 'text-severity-medium',
    ring: 'focus:border-severity-medium/50'
  },
  {
    key: 'low',
    label: 'Low',
    hint: 'Hardening / informational',
    tone: 'text-dark-muted',
    ring: 'focus:border-dark-muted/40'
  }
];

function Section({ icon: Icon, title, description, badge, children }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-dark-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-dark-text">{title}</h2>
            {description && (
              <p className="mt-0.5 max-w-2xl text-[11.5px] leading-relaxed text-dark-muted">
                {description}
              </p>
            )}
          </div>
        </div>
        {badge && (
          <span className="badge shrink-0 border-dark-border bg-dark-raised text-dark-muted">
            {badge}
          </span>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Toggle({ id, checked, onChange, disabled = false, label, hint, icon: Icon }) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 rounded-control border px-3 py-2.5 transition-colors ${
        disabled
          ? 'cursor-not-allowed border-dark-border/60 bg-dark-bg/20 opacity-55'
          : 'cursor-pointer border-dark-border bg-dark-bg/40 hover:border-dark-border/80 hover:bg-dark-raised/40'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="checkbox mt-0.5"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-dark-text">
          {Icon && <Icon className="h-3.5 w-3.5 text-dark-muted" />}
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-[10.5px] leading-relaxed text-dark-muted">{hint}</span>}
      </span>
    </label>
  );
}

function NumberField({ id, label, hint, value, onChange, min, max, suffix, tone, ring }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        <span className={tone || 'text-dark-muted'}>{label}</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={onChange}
          className={`input py-2 pr-12 font-mono text-xs ${ring || ''}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wider text-dark-muted">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-[10px] text-dark-muted/80">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [baseline, setBaseline] = useState(null);

  const { data: settingsData, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.getSettings
  });

  useEffect(() => {
    if (!settingsData) return;
    const hydrated = {
      slaDays: { ...DEFAULT_FORM.slaDays, ...settingsData.slaDays },
      gatePolicyDefaults: { ...DEFAULT_FORM.gatePolicyDefaults, ...settingsData.gatePolicyDefaults },
      passwordPolicy: { ...DEFAULT_FORM.passwordPolicy, ...settingsData.passwordPolicy },
      emailNotifications: {
        ...DEFAULT_FORM.emailNotifications,
        ...settingsData.emailNotifications
      }
    };
    setFormData(hydrated);
    setBaseline(hydrated);
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      if (data) {
        setBaseline(formData);
      }
      toast.success('Security policies saved and written to the audit trail');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update system settings');
    }
  });

  const isDirty = useMemo(
    () => Boolean(baseline) && JSON.stringify(formData) !== JSON.stringify(baseline),
    [formData, baseline]
  );

  const patch = (section, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (updateMutation.isPending) return;
    updateMutation.mutate(formData);
  };

  const handleDiscard = () => {
    if (baseline) {
      setFormData(baseline);
      toast.success('Unsaved changes discarded');
    }
  };

  if (isLoading) {
    return (
      <div className="page animate-fade-in">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-dark-raised" />
          <div className="h-7 w-72 animate-pulse rounded bg-dark-raised" />
          <div className="h-3 w-96 animate-pulse rounded bg-dark-raised" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-card border border-dark-border bg-dark-surface"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page animate-fade-in">
        <div className="card">
          <div className="empty-state py-16">
            <AlertCircle className="h-6 w-6 text-severity-critical" />
            <p className="text-sm font-medium text-dark-text">Failed to load system settings</p>
            <p className="text-xs text-dark-muted">
              The configuration service did not respond. Retry the request.
            </p>
            <button type="button" onClick={() => refetch()} className="btn-secondary mt-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { slaDays, gatePolicyDefaults, passwordPolicy, emailNotifications } = formData;
  const emailOff = !emailNotifications.enabled;

  return (
    <div className="page animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="page-title mt-1 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-accent-cyan" />
            Platform security policies
          </h1>
          <p className="page-subtitle">
            Configure remediation SLAs, CI/CD gate thresholds, credential hardening and alert
            dispatch. Changes apply platform-wide and are audit-logged.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-secondary"
            aria-label="Reload settings"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Reload
          </button>
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      <form id="settings-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Remediation SLAs */}
        <Section
          icon={Clock}
          title="Remediation SLAs"
          description="Maximum time allowed to resolve a finding, measured from discovery. Breaches trigger hourly alerting."
          badge="Days to resolve"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SLA_FIELDS.map((field) => (
              <NumberField
                key={field.key}
                id={`sla-${field.key}`}
                label={field.label}
                hint={field.hint}
                min={1}
                max={365}
                value={slaDays[field.key]}
                suffix="days"
                tone={field.tone}
                ring={field.ring}
                onChange={(e) =>
                  patch('slaDays', field.key, parseInt(e.target.value, 10) || 1)
                }
              />
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-control border border-dark-border bg-dark-bg/40 px-3 py-2.5 text-[10.5px] leading-relaxed text-dark-muted">
            <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-cyan" />
            <span>
              A breach clock starts when a vulnerability is ingested and pauses while a finding is{' '}
              <span className="text-dark-text">accepted</span> or{' '}
              <span className="text-dark-text">false-positive</span>.
            </span>
          </div>
        </Section>

        {/* CI gate policy */}
        <Section
          icon={ShieldAlert}
          title="Quality gate thresholds"
          description="Scans are evaluated against these limits to mark a CI build as passed or failed. A failed gate blocks deployment."
          badge="CI/CD enforcement"
        >
          <div className="space-y-3">
            <Toggle
              id="gate-fail-on-critical"
              checked={gatePolicyDefaults.failOnCritical}
              onChange={(e) => patch('gatePolicyDefaults', 'failOnCritical', e.target.checked)}
              label="Zero tolerance — fail on any Critical finding"
              hint="A single Critical vulnerability or leaked secret fails the build immediately."
              icon={FileWarning}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumberField
                id="gate-max-high"
                label="Max allowed High findings"
                min={0}
                value={gatePolicyDefaults.maxHigh}
                suffix="count"
                onChange={(e) =>
                  patch('gatePolicyDefaults', 'maxHigh', parseInt(e.target.value, 10) || 0)
                }
              />
              <NumberField
                id="gate-max-medium"
                label="Max allowed Medium findings"
                min={0}
                value={gatePolicyDefaults.maxMedium}
                suffix="count"
                onChange={(e) =>
                  patch('gatePolicyDefaults', 'maxMedium', parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
          </div>
        </Section>

        {/* Password & lockout */}
        <Section
          icon={Lock}
          title="Credential hardening & lockout"
          description="Password composition rules enforced at registration and reset, plus brute-force lockout thresholds."
          badge="Authentication"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberField
                id="password-min-length"
                label="Minimum password length"
                min={8}
                max={32}
                value={passwordPolicy.minLength}
                suffix="chars"
                onChange={(e) =>
                  patch('passwordPolicy', 'minLength', parseInt(e.target.value, 10) || 8)
                }
              />
              <NumberField
                id="lockout-threshold"
                label="Failed attempts before lockout"
                min={3}
                max={10}
                value={passwordPolicy.lockoutThreshold}
                suffix="tries"
                onChange={(e) =>
                  patch('passwordPolicy', 'lockoutThreshold', parseInt(e.target.value, 10) || 5)
                }
              />
              <NumberField
                id="lockout-minutes"
                label="Lockout duration"
                min={5}
                max={1440}
                value={passwordPolicy.lockoutMinutes}
                suffix="min"
                onChange={(e) =>
                  patch('passwordPolicy', 'lockoutMinutes', parseInt(e.target.value, 10) || 15)
                }
              />
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
                <CaseSensitive className="h-3.5 w-3.5" />
                Required character classes
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Toggle
                  id="password-uppercase"
                  checked={passwordPolicy.requireUppercase}
                  onChange={(e) => patch('passwordPolicy', 'requireUppercase', e.target.checked)}
                  label="Require uppercase letter"
                  hint="At least one A–Z character."
                  icon={KeyRound}
                />
                <Toggle
                  id="password-lowercase"
                  checked={passwordPolicy.requireLowercase}
                  onChange={(e) => patch('passwordPolicy', 'requireLowercase', e.target.checked)}
                  label="Require lowercase letter"
                  hint="At least one a–z character."
                  icon={KeyRound}
                />
                <Toggle
                  id="password-numbers"
                  checked={passwordPolicy.requireNumbers}
                  onChange={(e) => patch('passwordPolicy', 'requireNumbers', e.target.checked)}
                  label="Require numeric digit"
                  hint="At least one 0–9 character."
                  icon={KeyRound}
                />
                <Toggle
                  id="password-symbols"
                  checked={passwordPolicy.requireSymbols}
                  onChange={(e) => patch('passwordPolicy', 'requireSymbols', e.target.checked)}
                  label="Require special symbol"
                  hint="At least one of @ $ ! % * ? & ."
                  icon={KeyRound}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Email dispatch */}
        <Section
          icon={Mail}
          title="Alert dispatch"
          description="Outbound SMTP notifications for high-signal security events. Delivery failures are logged but never block ingestion."
          badge="Nodemailer SMTP"
        >
          <div className="space-y-3">
            <Toggle
              id="email-enabled"
              checked={emailNotifications.enabled}
              onChange={(e) => patch('emailNotifications', 'enabled', e.target.checked)}
              label="Enable outbound email alerts"
              hint="Master switch for all notification email delivery."
              icon={BellRing}
            />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Toggle
                id="email-critical"
                checked={emailNotifications.alertOnCritical}
                onChange={(e) => patch('emailNotifications', 'alertOnCritical', e.target.checked)}
                disabled={emailOff}
                label="Critical vulnerabilities & leaked secrets"
                hint="Immediate notification when a Critical finding is ingested."
              />
              <Toggle
                id="email-gate"
                checked={emailNotifications.alertOnGateFail}
                onChange={(e) => patch('emailNotifications', 'alertOnGateFail', e.target.checked)}
                disabled={emailOff}
                label="Pipeline quality gate failures"
                hint="Notify owners when a CI gate blocks a build."
              />
            </div>

            {emailOff && (
              <p className="flex items-center gap-1.5 text-[10.5px] text-amber-400">
                <AlertCircle className="h-3 w-3" />
                Email alerts are disabled. Individual triggers are paused until the master switch is
                re-enabled.
              </p>
            )}
          </div>
        </Section>

        {/* Sticky save bar */}
        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-card border border-dark-border bg-dark-surface/95 px-4 py-3 shadow-raised backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-dark-muted">
            {isDirty ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                You have unsaved policy changes.
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Configuration is in sync with the server.
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!isDirty || updateMutation.isPending}
              className="btn-ghost"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Discard
            </button>
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save policies
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
