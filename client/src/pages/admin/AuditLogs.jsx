import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Download,
  Search,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  RefreshCw,
  ShieldAlert,
  ScrollText,
  Fingerprint,
  History
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../api/admin.api';

const ACTION_STYLES = {
  LOGIN_SUCCESS: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  LOGIN_FAILED: 'border-severity-critical/25 bg-severity-critical/10 text-severity-critical',
  ROLE_CHANGE: 'border-violet-500/25 bg-violet-500/10 text-violet-400',
  USER_CREATED: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-400',
  USER_UPDATED: 'border-sky-500/25 bg-sky-500/10 text-sky-400',
  USER_DELETED: 'border-severity-critical/25 bg-severity-critical/10 text-severity-critical',
  ACCOUNT_UNLOCKED: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  FORCE_LOGOUT: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  SETTINGS_UPDATE: 'border-indigo-500/25 bg-indigo-500/10 text-indigo-400',
  API_KEY_CREATED: 'border-teal-500/25 bg-teal-500/10 text-teal-400',
  API_KEY_REVOKED: 'border-severity-critical/25 bg-severity-critical/10 text-severity-critical',
  SCAN_INGESTED: 'border-sky-500/25 bg-sky-500/10 text-sky-400',
  VULN_STATUS_CHANGE: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  ASSESSMENT_EVALUATED: 'border-violet-500/25 bg-violet-500/10 text-violet-400',
  INCIDENT_CREATED: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  INCIDENT_STATUS_CHANGE: 'border-amber-500/25 bg-amber-500/10 text-amber-400'
};

const ACTION_FILTERS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'ROLE_CHANGE',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'ACCOUNT_UNLOCKED',
  'FORCE_LOGOUT',
  'SETTINGS_UPDATE',
  'API_KEY_CREATED',
  'API_KEY_REVOKED',
  'SCAN_INGESTED',
  'VULN_STATUS_CHANGE',
  'ASSESSMENT_EVALUATED',
  'INCIDENT_CREATED',
  'INCIDENT_STATUS_CHANGE'
];

const ROLES = ['Admin', 'Security Analyst', 'Developer', 'Auditor'];

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['audit-logs', { page, search, action: actionFilter, role: roleFilter }],
    queryFn: () =>
      adminApi.getAuditLogs({
        page,
        limit: 15,
        search,
        action: actionFilter,
        role: roleFilter
      }),
    placeholderData: keepPreviousData
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await adminApi.exportAuditLogsCsv({
        action: actionFilter,
        role: roleFilter,
        search
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Audit log CSV exported successfully');
    } catch {
      toast.error('Failed to export audit logs');
    } finally {
      setIsExporting(false);
    }
  };

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="page-title mt-1 flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-accent-cyan" />
            Audit trail
          </h1>
          <p className="page-subtitle">
            Tamper-evident log of authentication, RBAC and compliance events across the platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-secondary"
            aria-label="Refresh audit logs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="btn-primary"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 p-3.5 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dark-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search actor, resource or IP…"
            aria-label="Search audit logs"
            className="input py-2 pl-9 text-xs"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by action"
            className="select py-2 font-mono text-[11px] sm:w-52"
          >
            <option value="">All actions</option>
            {ACTION_FILTERS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by actor role"
            className="select py-2 text-xs sm:w-44"
          >
            <option value="">All actor roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-control bg-dark-raised" />
            ))}
          </div>
        ) : isError ? (
          <div className="empty-state py-14">
            <ShieldAlert className="h-6 w-6 text-severity-critical" />
            <p className="text-sm font-medium text-dark-text">Failed to load audit logs</p>
            <p className="text-xs text-dark-muted">Check the API connection and try again.</p>
            <button type="button" onClick={() => refetch()} className="btn-secondary mt-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state py-14">
            <History className="h-6 w-6 text-dark-muted/60" />
            <p className="text-sm font-medium text-dark-text">No audit records found</p>
            <p className="text-xs text-dark-muted">No events match the current filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActionFilter('');
                setRoleFilter('');
                setPage(1);
              }}
              className="btn-secondary btn-sm mt-1"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target resource</th>
                  <th>IP address</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="whitespace-nowrap font-mono text-[10.5px] text-dark-muted">
                      {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          ACTION_STYLES[log.action] ||
                          'border-dark-border bg-dark-raised text-dark-muted'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td>
                      <p className="text-[11.5px] font-medium text-dark-text">
                        {log.performedByName || 'System'}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="truncate text-[10px] text-dark-muted">
                          {log.performedByEmail || 'N/A'}
                        </span>
                        {log.role && (
                          <span className="shrink-0 rounded border border-dark-border bg-dark-raised px-1 py-0.5 text-[9px] text-dark-muted">
                            {log.role}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <p className="text-[11px] text-dark-text">{log.targetResource || 'N/A'}</p>
                      {log.targetId && (
                        <p className="max-w-[140px] truncate font-mono text-[10px] text-dark-muted">
                          {log.targetId}
                        </p>
                      )}
                    </td>

                    <td className="whitespace-nowrap font-mono text-[10.5px] text-dark-muted">
                      {log.ipAddress || '127.0.0.1'}
                    </td>

                    <td>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="btn-secondary btn-sm"
                          aria-label={`Inspect ${log.action} event`}
                        >
                          <Eye className="h-3 w-3" />
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dark-border px-4 py-3 text-[11px] text-dark-muted">
            <span>
              Page <span className="font-mono text-dark-text">{pagination.page}</span> of{' '}
              <span className="font-mono text-dark-text">{pagination.pages}</span> ·{' '}
              <span className="font-mono text-dark-text">{pagination.total}</span> events
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary btn-sm"
              >
                <ChevronLeft className="h-3 w-3" />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary btn-sm"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedLog(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-inspect-title"
        >
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-card border border-dark-border bg-dark-surface shadow-raised scroll-thin animate-scale-in">
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-dark-border bg-dark-surface px-5 py-4">
              <div className="min-w-0">
                <h3
                  id="audit-inspect-title"
                  className="flex items-center gap-2 text-sm font-semibold text-dark-text"
                >
                  <Fingerprint className="h-4 w-4 text-accent-cyan" />
                  Audit event inspection
                </h3>
                <p className="mt-1 truncate font-mono text-[10.5px] text-dark-muted">
                  {selectedLog._id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="btn-icon h-8 w-8 shrink-0"
                aria-label="Close inspection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-card border border-dark-border bg-dark-bg/40 p-4 text-[11px] sm:grid-cols-2">
                <div>
                  <dt className="text-dark-muted">Action</dt>
                  <dd className="mt-0.5">
                    <span
                      className={`badge ${
                        ACTION_STYLES[selectedLog.action] ||
                        'border-dark-border bg-dark-raised text-dark-muted'
                      }`}
                    >
                      {selectedLog.action}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-dark-muted">Timestamp</dt>
                  <dd className="mt-0.5 font-mono text-dark-text">
                    {format(new Date(selectedLog.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </dd>
                </div>
                <div>
                  <dt className="text-dark-muted">Actor</dt>
                  <dd className="mt-0.5 text-dark-text">
                    {selectedLog.performedByName || 'System'}
                    {selectedLog.performedByEmail ? ` · ${selectedLog.performedByEmail}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-dark-muted">IP / origin</dt>
                  <dd className="mt-0.5 font-mono text-dark-text">
                    {selectedLog.ipAddress || '127.0.0.1'}
                  </dd>
                </div>
                <div>
                  <dt className="text-dark-muted">Target resource</dt>
                  <dd className="mt-0.5 text-dark-text">
                    {selectedLog.targetResource || '—'}
                    {selectedLog.targetId ? (
                      <span className="block truncate font-mono text-[10px] text-dark-muted">
                        {selectedLog.targetId}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-dark-muted">User agent</dt>
                  <dd className="mt-0.5 truncate text-[10.5px] text-dark-muted">
                    {selectedLog.userAgent || 'N/A'}
                  </dd>
                </div>
              </dl>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-dark-muted">
                    Event parameters
                  </h4>
                  <pre className="max-h-64 overflow-auto rounded-control border border-dark-border bg-dark-bg p-3 font-mono text-[10.5px] leading-relaxed text-accent-cyan/90 scroll-thin">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {(selectedLog.beforeState || selectedLog.afterState) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-severity-critical">
                      State before
                    </h4>
                    <pre className="max-h-48 overflow-auto rounded-control border border-severity-critical/25 bg-severity-critical/[0.04] p-3 font-mono text-[10px] leading-relaxed text-dark-muted scroll-thin">
                      {JSON.stringify(selectedLog.beforeState || {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                      State after
                    </h4>
                    <pre className="max-h-48 overflow-auto rounded-control border border-emerald-500/25 bg-emerald-500/[0.04] p-3 font-mono text-[10px] leading-relaxed text-dark-muted scroll-thin">
                      {JSON.stringify(selectedLog.afterState || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-dark-border px-5 py-3">
              <button type="button" onClick={() => setSelectedLog(null)} className="btn-secondary">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
