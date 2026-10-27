import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Key,
  Plus,
  Shield,
  Copy,
  Check,
  AlertTriangle,
  XCircle,
  Terminal,
  Lock,
  X,
  Loader2,
  RefreshCw,
  ShieldOff,
  CopyCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../api/admin.api';

const TOOL_OPTIONS = [
  { id: 'trivy', label: 'Trivy (containers & SCA)', hint: 'Container and dependency CVEs' },
  { id: 'gitleaks', label: 'Gitleaks (secrets)', hint: 'Hardcoded credentials detection' },
  { id: 'npm-audit', label: 'npm audit (dependencies)', hint: 'Node package advisories' },
  { id: 'semgrep', label: 'Semgrep (SAST)', hint: 'Static application analysis' }
];

export default function ApiKeys() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdSecretData, setCreatedSecretData] = useState(null);
  const [copiedKeyId, setCopiedKeyId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    allowedTools: ['trivy', 'gitleaks', 'npm-audit', 'semgrep'],
    autoCreateProject: true
  });

  const { data: apiKeys, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-apikeys'],
    queryFn: adminApi.getApiKeys
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createApiKey,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-apikeys'] });
      setShowCreateModal(false);
      setCreatedSecretData(data);
      setNewKeyForm({
        name: '',
        allowedTools: ['trivy', 'gitleaks', 'npm-audit', 'semgrep'],
        autoCreateProject: true
      });
      toast.success('API key created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to provision API key');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: adminApi.revokeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-apikeys'] });
      toast.success('API key revoked');
      setRevokeTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to revoke API key');
    }
  });

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'keyId') {
        setCopiedKeyId(true);
        setTimeout(() => setCopiedKeyId(false), 2000);
      } else {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      }
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Clipboard access was blocked by the browser');
    }
  };

  const handleToolToggle = (toolId) => {
    setNewKeyForm((prev) => {
      const exists = prev.allowedTools.includes(toolId);
      return {
        ...prev,
        allowedTools: exists
          ? prev.allowedTools.filter((t) => t !== toolId)
          : [...prev.allowedTools, toolId]
      };
    });
  };

  const keys = apiKeys || [];
  const activeCount = keys.filter((k) => !k.revoked).length;

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="page-title mt-1 flex items-center gap-2">
            <Key className="h-5 w-5 text-accent-cyan" />
            API keys
          </h1>
          <p className="page-subtitle">
            Provision HMAC-signed ingestion credentials for GitHub Actions, GitLab and Jenkins
            pipelines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-secondary"
            aria-label="Refresh API keys"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Generate key
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dark-muted">
            Active keys
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-emerald-400">{activeCount}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dark-muted">
            Revoked keys
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-dark-muted">
            {keys.length - activeCount}
          </p>
        </div>
        <div className="card p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dark-muted">
            Signing algorithm
          </p>
          <p className="mt-1.5 font-mono text-sm font-semibold text-accent-cyan">HMAC-SHA256</p>
        </div>
      </div>

      {/* Architecture notice */}
      <section className="card flex items-start gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dark-border bg-dark-raised text-accent-cyan">
          <Terminal className="h-4 w-4" />
        </span>
        <div className="min-w-0 text-[11px] leading-relaxed text-dark-muted">
          <p className="text-xs font-semibold text-dark-text">Pipeline ingestion contract</p>
          <p className="mt-1">
            Pipeline reports posted to{' '}
            <code className="rounded bg-dark-raised px-1 py-0.5 font-mono text-[10px] text-accent-cyan">
              /api/v1/webhooks/scan
            </code>{' '}
            must include the{' '}
            <code className="rounded bg-dark-raised px-1 py-0.5 font-mono text-[10px] text-accent-cyan">
              X-API-Key
            </code>{' '}
            header and an{' '}
            <code className="rounded bg-dark-raised px-1 py-0.5 font-mono text-[10px] text-accent-cyan">
              X-Signature: sha256=&lt;hmac&gt;
            </code>{' '}
            digest computed with the key secret. Secrets are encrypted with AES-256-GCM at rest.
          </p>
        </div>
      </section>

      {/* Keys table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-control bg-dark-raised" />
            ))}
          </div>
        ) : isError ? (
          <div className="empty-state py-14">
            <ShieldOff className="h-6 w-6 text-severity-critical" />
            <p className="text-sm font-medium text-dark-text">Failed to load API keys</p>
            <p className="text-xs text-dark-muted">Check the API connection and try again.</p>
            <button type="button" onClick={() => refetch()} className="btn-secondary mt-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        ) : keys.length === 0 ? (
          <div className="empty-state py-14">
            <Key className="h-6 w-6 text-dark-muted/60" />
            <p className="text-sm font-medium text-dark-text">No API keys yet</p>
            <p className="text-xs text-dark-muted">
              Generate a key to connect your CI/CD workflows.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn-primary btn-sm mt-1"
            >
              <Plus className="h-3 w-3" />
              Generate key
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Key name &amp; ID</th>
                  <th>Allowed tools</th>
                  <th>Status</th>
                  <th>Created by</th>
                  <th>Last used</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k._id}>
                    <td>
                      <p className="font-medium text-dark-text">{k.name}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <code className="font-mono text-[10.5px] text-accent-cyan">{k.keyId}</code>
                        <button
                          type="button"
                          onClick={() => handleCopy(k.keyId, 'keyId')}
                          title="Copy key ID"
                          aria-label={`Copy key ID for ${k.name}`}
                          className="rounded p-0.5 text-dark-muted transition-colors hover:text-dark-text"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-wrap gap-1">
                        {k.allowedTools?.length ? (
                          k.allowedTools.map((tool) => (
                            <span
                              key={tool}
                              className="rounded border border-dark-border bg-dark-raised px-1.5 py-0.5 font-mono text-[10px] text-dark-muted"
                            >
                              {tool}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10.5px] text-dark-muted">None</span>
                        )}
                      </div>
                    </td>

                    <td>
                      {k.revoked ? (
                        <span className="badge border-severity-critical/25 bg-severity-critical/10 text-severity-critical">
                          <XCircle className="h-2.5 w-2.5" />
                          Revoked
                        </span>
                      ) : (
                        <span className="badge border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                          <Shield className="h-2.5 w-2.5" />
                          Active
                        </span>
                      )}
                    </td>

                    <td>
                      <p className="text-[11px] text-dark-text">
                        {k.createdBy?.name || 'Administrator'}
                      </p>
                      <p className="font-mono text-[10px] text-dark-muted">
                        {k.createdAt ? format(new Date(k.createdAt), 'MMM d, yyyy') : '—'}
                      </p>
                    </td>

                    <td className="whitespace-nowrap font-mono text-[10.5px] text-dark-muted">
                      {k.lastUsedAt ? format(new Date(k.lastUsedAt), 'MMM d, yyyy HH:mm') : 'Never'}
                    </td>

                    <td>
                      <div className="flex justify-end">
                        {!k.revoked ? (
                          <button
                            type="button"
                            onClick={() => setRevokeTarget(k)}
                            className="btn-danger btn-sm"
                          >
                            <XCircle className="h-3 w-3" />
                            Revoke
                          </button>
                        ) : (
                          <span className="text-[10px] text-dark-muted/60">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create key modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-key-title"
        >
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-card border border-dark-border bg-dark-surface shadow-raised scroll-thin animate-scale-in">
            <div className="flex items-start justify-between gap-3 border-b border-dark-border px-5 py-4">
              <div>
                <h3
                  id="create-key-title"
                  className="flex items-center gap-2 text-sm font-semibold text-dark-text"
                >
                  <Key className="h-4 w-4 text-accent-cyan" />
                  Generate CI/CD API key
                </h3>
                <p className="mt-1 text-[11px] text-dark-muted">
                  Credentials for your automated security pipeline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-icon h-8 w-8"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newKeyForm);
              }}
              className="space-y-3.5 px-5 py-4"
            >
              <div>
                <label htmlFor="api-key-name" className="label">
                  Key name / description
                </label>
                <input
                  id="api-key-name"
                  type="text"
                  required
                  value={newKeyForm.name}
                  onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                  placeholder="e.g. GitHub Actions — core services"
                  className="input text-xs"
                />
              </div>

              <div>
                <p className="label">Allowed scanners</p>
                <div className="space-y-1.5">
                  {TOOL_OPTIONS.map((tool) => {
                    const checked = newKeyForm.allowedTools.includes(tool.id);
                    return (
                      <label
                        key={tool.id}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-control border px-2.5 py-2 transition-colors ${
                          checked
                            ? 'border-accent-cyan/30 bg-accent-cyan/[0.06]'
                            : 'border-dark-border bg-dark-bg/40 hover:bg-dark-raised/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToolToggle(tool.id)}
                          className="checkbox mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block text-[11.5px] font-medium text-dark-text">
                            {tool.label}
                          </span>
                          <span className="block text-[10px] text-dark-muted">{tool.hint}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {newKeyForm.allowedTools.length === 0 && (
                  <p className="mt-1.5 text-[10px] text-amber-400">
                    Select at least one scanner to generate a key.
                  </p>
                )}
              </div>

              <label
                htmlFor="auto-create-project"
                className="flex cursor-pointer items-start gap-2.5 rounded-control border border-dark-border bg-dark-bg/40 px-3 py-2.5"
              >
                <input
                  id="auto-create-project"
                  type="checkbox"
                  checked={newKeyForm.autoCreateProject}
                  onChange={(e) =>
                    setNewKeyForm({ ...newKeyForm, autoCreateProject: e.target.checked })
                  }
                  className="checkbox mt-0.5"
                />
                <span>
                  <span className="block text-[11.5px] font-medium text-dark-text">
                    Auto-create unknown projects
                  </span>
                  <span className="block text-[10px] text-dark-muted">
                    Register projects automatically on first ingest.
                  </span>
                </span>
              </label>

              <div className="flex justify-end gap-2 border-t border-dark-border pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || newKeyForm.allowedTools.length === 0}
                  className="btn-primary"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    'Generate key'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke confirmation */}
      {revokeTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRevokeTarget(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-key-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-card border border-dark-border bg-dark-surface shadow-raised animate-scale-in">
            <div className="flex items-start gap-3 border-b border-dark-border px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-severity-critical/25 bg-severity-critical/10 text-severity-critical">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 id="revoke-key-title" className="text-sm font-semibold text-dark-text">
                  Revoke this API key?
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-dark-muted">
                  <span className="font-medium text-dark-text">{revokeTarget.name}</span> will
                  immediately stop authenticating. Pipelines using it will fail with 401 until a new
                  key is deployed.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3">
              <button type="button" onClick={() => setRevokeTarget(null)} className="btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => revokeMutation.mutate(revokeTarget._id)}
                disabled={revokeMutation.isPending}
                className="btn-danger"
              >
                {revokeMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Revoking…
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" />
                    Revoke key
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-time secret */}
      {createdSecretData && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="secret-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-card border border-amber-500/40 bg-dark-surface shadow-raised animate-scale-in">
            <div className="flex items-start gap-3 border-b border-dark-border px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h3 id="secret-title" className="text-sm font-semibold text-dark-text">
                  Save your secret now
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-300">
                  This HMAC secret is encrypted at rest and will{' '}
                  <strong className="font-semibold">never</strong> be displayed again.
                </p>
              </div>
            </div>

            <div className="space-y-3 px-5 py-4">
              <div>
                <p className="label">API key ID — header X-API-Key</p>
                <div className="flex items-center gap-2 rounded-control border border-dark-border bg-dark-bg px-3 py-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-accent-cyan">
                    {createdSecretData.apiKey?.keyId}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdSecretData.apiKey?.keyId, 'keyId')}
                    className="rounded p-1 text-dark-muted transition-colors hover:text-dark-text"
                    aria-label="Copy API key ID"
                  >
                    {copiedKeyId ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p className="label">API secret — for HMAC SHA-256 signatures</p>
                <div className="flex items-center gap-2 rounded-control border border-dark-border bg-dark-bg px-3 py-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-emerald-400">
                    {createdSecretData.plainSecret}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(createdSecretData.plainSecret, 'secret')}
                    className="rounded p-1 text-dark-muted transition-colors hover:text-dark-text"
                    aria-label="Copy API secret"
                  >
                    {copiedSecret ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-dark-muted">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                Store the secret in your CI provider's secret store, never in source control.
              </p>
            </div>

            <div className="border-t border-dark-border px-5 py-3">
              <button
                type="button"
                onClick={() => setCreatedSecretData(null)}
                className="btn-primary w-full"
              >
                <CopyCheck className="h-3.5 w-3.5" />
                I have stored these credentials securely
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
