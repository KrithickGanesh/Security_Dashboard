import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Shield,
  Filter,
  Search,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import pipelinesApi from '../api/pipelines.api';
import projectsApi from '../api/projects.api';
import toast from 'react-hot-toast';

export const Pipelines = () => {
  const [pipelines, setPipelines] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);

  // Filters
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });

  const fetchPipelines = async () => {
    setIsLoading(true);
    try {
      const res = await pipelinesApi.getPipelines({
        page: pagination.page,
        limit: pagination.limit,
        project: projectFilter,
        status: statusFilter
      });
      if (res.success && res.data) {
        setPipelines(res.data.pipelines);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load pipeline runs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.getProjects({ limit: 100 });
      if (res.success && res.data?.projects) {
        setProjects(res.data.projects);
      }
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchPipelines, 200);
    return () => clearTimeout(timer);
  }, [projectFilter, statusFilter, pagination.page]);

  const STAGES_LIST = [
    { key: 'Secret', label: 'Secrets Scan' },
    { key: 'SAST', label: 'SAST Scan' },
    { key: 'SCA', label: 'SCA Dependencies' },
    { key: 'Container', label: 'Container Scan' },
    { key: 'IaC', label: 'IaC Security' },
    { key: 'DAST', label: 'DAST / Dynamic' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-dark-text tracking-tight">
            CI/CD Pipeline Security Gates
          </h2>
          <p className="text-xs text-dark-muted mt-0.5">
            Audit logs of CI security checks, stage verifications, and compliance enforcement gates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-dark-surface border border-dark-border rounded-control px-3 py-1.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.key})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-dark-surface border border-dark-border rounded-control px-3 py-1.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
          >
            <option value="">All Gate Results</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
            <option value="Warning">Warning</option>
            <option value="Skipped">Skipped</option>
          </select>
        </div>
      </div>

      {/* Runs Table */}
      <div className="bg-dark-surface border border-dark-border rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-bg/60 border-b border-dark-border text-dark-muted font-mono uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Gate Status</th>
                <th className="p-3.5">Pipeline Run ID</th>
                <th className="p-3.5">Project</th>
                <th className="p-3.5">Branch / Commit</th>
                <th className="p-3.5">Triggered By</th>
                <th className="p-3.5">Findings Counts</th>
                <th className="p-3.5">Execution Time</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-dark-muted">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                      <span>Loading pipeline runs...</span>
                    </div>
                  </td>
                </tr>
              ) : pipelines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-dark-muted">
                    <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-dark-text">No Pipeline Runs Recorded</p>
                    <p className="text-xs text-dark-muted mt-1">
                      No CI/CD scan payloads received yet. Configure GitHub Actions or upload a scan manually.
                    </p>
                  </td>
                </tr>
              ) : (
                pipelines.map((run) => (
                  <tr
                    key={run._id}
                    onClick={() => setSelectedRun(run)}
                    className="hover:bg-dark-raised/50 transition-colors cursor-pointer group"
                  >
                    <td className="p-3.5">
                      {run.status === 'Passed' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-success/15 text-accent-success border border-accent-success/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Passed</span>
                        </span>
                      ) : run.status === 'Warning' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-severity-medium/15 text-severity-medium border border-severity-medium/30">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Warning</span>
                        </span>
                      ) : run.status === 'Skipped' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-dark-raised text-dark-muted border border-dark-border">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Skipped</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-severity-critical/15 text-severity-critical border border-severity-critical/30">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Gate Failed</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 font-mono font-bold text-accent-cyan group-hover:underline">
                      #{run.runId}
                    </td>

                    <td className="p-3.5 font-semibold text-dark-text">
                      {run.project?.name || 'N/A'}
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-dark-muted">
                      <span className="text-dark-text font-medium">{run.branch}</span>
                      {run.commit && (
                        <span className="block text-[10px] text-dark-muted/70">
                          @ {run.commit.slice(0, 8)}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-dark-muted">
                      {run.triggeredBy}
                    </td>

                    <td className="p-3.5 font-mono">
                      <div className="flex items-center gap-2">
                        {run.counts?.critical > 0 && (
                          <span className="text-severity-critical font-bold">
                            {run.counts.critical} crit
                          </span>
                        )}
                        {run.counts?.high > 0 && (
                          <span className="text-severity-high font-bold">
                            {run.counts.high} high
                          </span>
                        )}
                        <span className="text-dark-muted">
                          {run.counts?.total || 0} total
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-dark-muted whitespace-nowrap">
                      {new Date(run.completedAt || run.createdAt).toLocaleString()}
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRun(run);
                        }}
                        className="text-xs text-accent-cyan hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <span>Stage Breakdown</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-dark-border p-3.5 text-xs text-dark-muted">
            <span>
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} runs)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                aria-label="Previous page"
                className="p-1.5 rounded border border-dark-border hover:bg-dark-raised disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
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

      {/* Stage Breakdown Modal */}
      {selectedRun && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pipeline-run-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedRun(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedRun(null);
          }}
        >
          <div className="max-w-2xl w-full bg-dark-surface border border-dark-border rounded-card p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-dark-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-accent-cyan bg-accent-cyan/15 px-2 py-0.5 rounded">
                    Run #{selectedRun.runId}
                  </span>
                  {selectedRun.status === 'Passed' ? (
                    <span className="text-xs text-accent-success font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Passed
                    </span>
                  ) : (
                    <span className="text-xs text-severity-critical font-semibold flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Security Gate Failed
                    </span>
                  )}
                </div>
                <h3 id="pipeline-run-title" className="text-base font-bold text-dark-text mt-1">
                  {selectedRun.project?.name} ({selectedRun.branch})
                </h3>
              </div>

              <button
                onClick={() => setSelectedRun(null)}
                aria-label="Close stage breakdown"
                className="text-dark-muted hover:text-dark-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Stepper */}
            <div>
              <span className="text-[11px] font-mono text-dark-muted uppercase tracking-wider block mb-3 font-semibold">
                Security Pipeline Inspection Stages
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {STAGES_LIST.map((stg) => {
                  const executedStage = selectedRun.stages?.find((s) =>
                    s.name.toLowerCase().includes(stg.key.toLowerCase())
                  );

                  let statusBadge = (
                    <span className="text-[10px] text-dark-muted font-mono">Not Run</span>
                  );
                  let borderClass = 'border-dark-border/40 bg-dark-bg/40';

                  if (executedStage) {
                    if (executedStage.status === 'Passed') {
                      statusBadge = (
                        <span className="text-[10px] text-accent-success font-mono font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Passed ({executedStage.findingsCount} findings)
                        </span>
                      );
                      borderClass = 'border-accent-success/40 bg-accent-success/5';
                    } else {
                      statusBadge = (
                        <span className="text-[10px] text-severity-critical font-mono font-semibold flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Failed ({executedStage.findingsCount} findings)
                        </span>
                      );
                      borderClass = 'border-severity-critical/40 bg-severity-critical/5';
                    }
                  }

                  return (
                    <div
                      key={stg.key}
                      className={`p-3 rounded-control border ${borderClass} flex flex-col justify-between`}
                    >
                      <span className="text-xs font-semibold text-dark-text">
                        {stg.label}
                      </span>
                      <div className="mt-2">{statusBadge}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gate Policy Summary */}
            <div className="p-4 rounded bg-dark-bg/70 border border-dark-border space-y-2">
              <span className="text-xs font-bold text-dark-text block">
                Policy Enforcement Evaluation:
              </span>
              <p className="text-xs text-dark-muted leading-relaxed">
                {selectedRun.gateSummary?.reason || 'Evaluation completed according to project gate rules.'}
              </p>
              {selectedRun.gateSummary?.failedConditions?.length > 0 && (
                <ul className="list-disc list-inside text-xs text-severity-critical space-y-0.5">
                  {selectedRun.gateSummary.failedConditions.map((cond, i) => (
                    <li key={i}>{cond}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              {selectedRun.runUrl ? (
                <a
                  href={selectedRun.runUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-cyan hover:underline font-mono inline-flex items-center gap-1.5"
                >
                  <span>Open CI Run in Provider</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-[11px] text-dark-muted font-mono">Provider: {selectedRun.provider}</span>
              )}

              <button
                type="button"
                onClick={() => setSelectedRun(null)}
                className="px-4 py-1.5 bg-dark-raised hover:bg-dark-border text-dark-text text-xs font-semibold rounded-control"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pipelines;
