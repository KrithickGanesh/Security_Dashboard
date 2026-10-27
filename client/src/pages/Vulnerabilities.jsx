import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bug,
  Search,
  Filter,
  CheckSquare,
  Square,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  CheckCircle2,
  X
} from 'lucide-react';
import vulnerabilitiesApi from '../api/vulnerabilities.api';
import projectsApi from '../api/projects.api';
import SeverityBadge from '../components/common/SeverityBadge';
import StatusBadge from '../components/common/StatusBadge';
import Avatar from '../components/common/Avatar';
import VulnerabilityDrawer from '../components/vulnerabilities/VulnerabilityDrawer';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export const Vulnerabilities = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters state from URL params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [slaFilter, setSlaFilter] = useState(searchParams.get('sla') || '');
  const [toolFilter, setToolFilter] = useState(searchParams.get('tool') || '');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') || '');

  // Active drawer
  const [selectedVulnId, setSelectedVulnId] = useState(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const fetchVulnerabilities = async () => {
    setIsLoading(true);
    try {
      const res = await vulnerabilitiesApi.getVulnerabilities({
        page: pagination.page,
        limit: pagination.limit,
        search,
        severity: severityFilter,
        status: statusFilter,
        slaState: slaFilter,
        tool: toolFilter,
        project: projectFilter
      });
      if (res.success && res.data) {
        setVulnerabilities(res.data.vulnerabilities);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load vulnerabilities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVulnerabilities();
    }, 300);
    return () => clearTimeout(timer);
  }, [
    search,
    severityFilter,
    statusFilter,
    slaFilter,
    toolFilter,
    projectFilter,
    pagination.page
  ]);

  // Keep the URL in sync so filters survive refresh, back/forward and shareable links.
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (severityFilter) next.set('severity', severityFilter);
    if (statusFilter) next.set('status', statusFilter);
    if (slaFilter) next.set('sla', slaFilter);
    if (toolFilter) next.set('tool', toolFilter);
    if (projectFilter) next.set('project', projectFilter);

    const current = searchParams.toString();
    const upcoming = next.toString();
    if (current !== upcoming) {
      setSearchParams(next, { replace: true });
    }
  }, [search, severityFilter, statusFilter, slaFilter, toolFilter, projectFilter, searchParams, setSearchParams]);

  // Selection is page-scoped: never carry bulk actions onto rows the user cannot see.
  useEffect(() => {
    setSelectedIds([]);
  }, [pagination.page, search, severityFilter, statusFilter, slaFilter, toolFilter, projectFilter]);

  const pageIds = vulnerabilities.map((v) => v._id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const somePageSelected = pageIds.some((id) => selectedIds.includes(id)) && !allPageSelected;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(pageIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatus = async (newStatus) => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const res = await vulnerabilitiesApi.bulkUpdate({
        ids: selectedIds,
        status: newStatus,
        reason: `Bulk updated by ${user?.name || 'User'}`
      });
      if (res.success) {
        toast.success(`Updated ${selectedIds.length} vulnerabilities to ${newStatus}`);
        setSelectedIds([]);
        fetchVulnerabilities();
      }
    } catch (err) {
      toast.error('Bulk update failed');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const formatSlaCountdown = (vuln) => {
    const isTerminal = ['Resolved', 'False Positive', 'Accepted Risk'].includes(vuln.status);
    if (isTerminal) {
      return (
        <span className="text-accent-success font-mono text-[11px] flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Done</span>
        </span>
      );
    }

    const diff = new Date(vuln.slaDueDate).getTime() - Date.now();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      return (
        <span className="font-mono text-[11px] font-bold text-severity-critical bg-severity-critical/15 px-2 py-0.5 rounded border border-severity-critical/30 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 animate-pulse" />
          <span>BREACHED</span>
        </span>
      );
    }

    return (
      <span className="font-mono text-[11px] text-dark-muted flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>{days}d left</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-dark-text tracking-tight">
            Vulnerability Inventory
          </h2>
          <p className="text-xs text-dark-muted mt-0.5">
            Aggregated findings across SAST, SCA, Secrets, and Container scan reports.
          </p>
        </div>

        <div className="text-xs font-mono text-dark-muted bg-dark-surface border border-dark-border px-3 py-1.5 rounded-control">
          Total Findings: <strong className="text-accent-cyan">{pagination.total}</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-dark-surface border border-dark-border rounded-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-dark-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Search CVE, package name, rule ID, or source file..."
              className="w-full bg-dark-bg border border-dark-border rounded-control pl-9 pr-3 py-1.5 text-xs text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent-cyan"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="bg-dark-bg border border-dark-border rounded-control px-2.5 py-1.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
            >
              <option value="">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Info">Info</option>
              <option value="Critical,High">Critical + High</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="bg-dark-bg border border-dark-border rounded-control px-2.5 py-1.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="False Positive">False Positive</option>
              <option value="Accepted Risk">Accepted Risk</option>
            </select>

            {/* SLA Filter */}
            <select
              value={slaFilter}
              onChange={(e) => {
                setSlaFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="bg-dark-bg border border-dark-border rounded-control px-2.5 py-1.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
            >
              <option value="">All SLA States</option>
              <option value="breached">SLA Breached</option>
              <option value="near">SLA Due within 48h</option>
            </select>

            {/* Tool Filter */}
            <select
              value={toolFilter}
              onChange={(e) => {
                setToolFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="bg-dark-bg border border-dark-border rounded-control px-2.5 py-1.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
            >
              <option value="">All Tools</option>
              <option value="trivy">Trivy</option>
              <option value="gitleaks">Gitleaks</option>
              <option value="npm-audit">npm audit</option>
              <option value="semgrep">Semgrep</option>
            </select>

            {(search ||
              severityFilter ||
              statusFilter ||
              slaFilter ||
              toolFilter ||
              projectFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSeverityFilter('');
                  setStatusFilter('');
                  setSlaFilter('');
                  setToolFilter('');
                  setProjectFilter('');
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="text-xs text-dark-muted hover:text-dark-text flex items-center gap-1 px-2 py-1"
                title="Reset Filters"
                aria-label="Reset all filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-accent-cyan/10 border border-accent-cyan/30 rounded-control p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-cyan">
            <span>{selectedIds.length} finding(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            {['Admin', 'Security Analyst'].includes(user?.role) && (
              <>
                <button
                  type="button"
                  disabled={isBulkUpdating}
                  onClick={() => handleBulkStatus('In Progress')}
                  className="px-2.5 py-1 bg-dark-surface hover:bg-dark-raised border border-dark-border text-xs rounded text-dark-text transition-colors"
                >
                  Mark In Progress
                </button>
                <button
                  type="button"
                  disabled={isBulkUpdating}
                  onClick={() => handleBulkStatus('Resolved')}
                  className="px-2.5 py-1 bg-accent-success hover:bg-accent-success/90 text-dark-bg text-xs font-semibold rounded transition-colors"
                >
                  Mark Resolved
                </button>
                <button
                  type="button"
                  disabled={isBulkUpdating}
                  onClick={() => handleBulkStatus('False Positive')}
                  className="px-2.5 py-1 bg-dark-surface hover:bg-dark-raised border border-dark-border text-xs rounded text-dark-muted hover:text-dark-text transition-colors"
                >
                  Mark False Positive
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-dark-muted hover:text-dark-text ml-2"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Vulnerabilities Data Table */}
      <div className="bg-dark-surface border border-dark-border rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-bg/70 border-b border-dark-border text-dark-muted font-mono uppercase tracking-wider text-[11px] sticky top-0 z-10">
              <tr>
                <th className="p-3 w-8 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected;
                    }}
                    aria-label="Select all findings on this page"
                    className="rounded bg-dark-bg border-dark-border text-accent-cyan focus:ring-accent-cyan"
                  />
                </th>
                <th className="p-3">Severity</th>
                <th className="p-3">Vulnerability / CVE</th>
                <th className="p-3">Project</th>
                <th className="p-3">Component / File</th>
                <th className="p-3">Tool</th>
                <th className="p-3">SLA Status</th>
                <th className="p-3">Remediation Status</th>
                <th className="p-3">Assignee</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-dark-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-dark-muted">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                      <span>Loading vulnerabilities inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : vulnerabilities.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-dark-muted">
                    <Bug className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-dark-text">No Vulnerabilities Found</p>
                    <p className="text-xs text-dark-muted mt-1">
                      No security findings match the current filter parameters.
                    </p>
                  </td>
                </tr>
              ) : (
                vulnerabilities.map((v) => (
                  <tr
                    key={v._id}
                    onClick={() => setSelectedVulnId(v._id)}
                    className="hover:bg-dark-raised/50 transition-colors cursor-pointer group"
                  >
                    <td
                      className="p-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(v._id)}
                        onChange={() => handleSelectRow(v._id)}
                        className="rounded bg-dark-bg border-dark-border text-accent-cyan focus:ring-accent-cyan"
                      />
                    </td>

                    <td className="p-3 shrink-0">
                      <SeverityBadge severity={v.severity} size="xs" />
                    </td>

                    <td className="p-3 min-w-[220px] max-w-sm">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-accent-cyan text-[11px] group-hover:underline">
                          {v.cve || 'VULN-FINDING'}
                        </span>
                        <span className="text-dark-text truncate mt-0.5 font-medium">
                          {v.title}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 font-mono font-medium text-dark-muted whitespace-nowrap">
                      {v.project?.name || 'N/A'}
                    </td>

                    <td className="p-3 font-mono text-[11px] text-dark-muted max-w-[180px] truncate">
                      {v.component ? (
                        <span>
                          {v.component} {v.version ? `@${v.version}` : ''}
                        </span>
                      ) : (
                        <span>{v.filePath ? `${v.filePath}${v.line ? `:${v.line}` : ''}` : 'Root'}</span>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] bg-dark-raised px-2 py-0.5 rounded border border-dark-border text-dark-muted">
                        {v.tool}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {formatSlaCountdown(v)}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <StatusBadge status={v.status} />
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {v.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={v.assignee.name} role={v.assignee.role} size="sm" />
                          <span className="text-xs text-dark-text truncate max-w-[100px]">
                            {v.assignee.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-dark-muted text-[11px] font-mono">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="p-3.5 border-t border-dark-border flex items-center justify-between text-xs text-dark-muted">
            <span>
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} items)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                aria-label="Previous page"
                className="p-1.5 rounded border border-dark-border hover:bg-dark-raised disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                aria-label="Next page"
                className="p-1.5 rounded border border-dark-border hover:bg-dark-raised disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Sliding Detail Drawer */}
      {selectedVulnId && (
        <VulnerabilityDrawer
          vulnerabilityId={selectedVulnId}
          onClose={() => setSelectedVulnId(null)}
          onUpdate={fetchVulnerabilities}
        />
      )}
    </div>
  );
};

export default Vulnerabilities;
