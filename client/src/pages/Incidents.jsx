import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { formatUserLabel } from '../utils/format';
import {
  AlertOctagon,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  User,
  FileCheck,
  AlertTriangle,
  Radar,
  Shield,
  X,
  Loader2,
  RefreshCw,
  Inbox,
  ChevronRight,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import incidentsApi from '../api/incidents.api';
import projectsApi from '../api/projects.api';
import adminApi from '../api/admin.api';
import { useAuth } from '../context/AuthContext';

const STAGES = ['Detected', 'Triaged', 'Contained', 'Resolved', 'Post-mortem'];

const STAGE_META = {
  Detected: {
    icon: Radar,
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    dot: 'bg-rose-400'
  },
  Triaged: {
    icon: Search,
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    dot: 'bg-amber-400'
  },
  Contained: {
    icon: Shield,
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    dot: 'bg-sky-400'
  },
  Resolved: {
    icon: CheckCircle2,
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    dot: 'bg-emerald-400'
  },
  'Post-mortem': {
    icon: FileCheck,
    badge: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
    dot: 'bg-violet-400'
  }
};

const SEVERITY_STYLES = {
  Critical: 'border-severity-critical/30 bg-severity-critical/10 text-severity-critical',
  High: 'border-severity-high/30 bg-severity-high/10 text-severity-high',
  Medium: 'border-severity-medium/30 bg-severity-medium/10 text-severity-medium',
  Low: 'border-dark-border bg-dark-raised text-dark-muted'
};

const stageMeta = (status) => STAGE_META[status] || STAGE_META.Detected;

function EmptyState({ title, description, action }) {
  return (
    <div className="card">
      <div className="empty-state py-14">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <p className="mt-1 text-sm font-medium text-dark-text">{title}</p>
        <p className="max-w-sm text-xs text-dark-muted">{description}</p>
        {action}
      </div>
    </div>
  );
}

export default function Incidents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = ['Admin', 'Security Analyst'].includes(user?.role);
  // The API allows Developers to advance the incident lifecycle (but not to
  // write post-mortems), so gate the stage buttons separately.
  const canTransition = ['Admin', 'Security Analyst', 'Developer'].includes(user?.role);

  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState(searchParams.get('id'));

  // Create form state
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'High',
    project: '',
    assignedTo: ''
  });

  // Status transition modal state
  const [transitionNotes, setTransitionNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState('');

  // Post-mortem state
  const [postMortemForm, setPostMortemForm] = useState({
    rootCause: '',
    impactSummary: '',
    preventativeActions: ''
  });

  // Queries
  const { data: incidentsData, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['incidents', { severity: severityFilter, search }],
    queryFn: () =>
      incidentsApi.getIncidents({
        limit: 100,
        severity: severityFilter,
        search
      })
  });

  const { data: incidentDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['incident-detail', selectedIncidentId],
    queryFn: () => incidentsApi.getIncidentById(selectedIncidentId),
    enabled: !!selectedIncidentId
  });

  useEffect(() => {
    if (incidentDetail?.postMortem) {
      setPostMortemForm({
        rootCause: incidentDetail.postMortem.rootCause || '',
        impactSummary: incidentDetail.postMortem.impactSummary || '',
        preventativeActions: incidentDetail.postMortem.preventativeActions || ''
      });
    }
  }, [incidentDetail]);

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.getProjects({ limit: 50 })
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-assignees'],
    queryFn: () => adminApi.getAssignees({ limit: 50 }),
    enabled: canManage
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: incidentsApi.createIncident,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident registered into the response queue');
      setShowCreateModal(false);
      setNewIncident({
        title: '',
        description: '',
        severity: 'High',
        project: '',
        assignedTo: ''
      });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create incident');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }) => incidentsApi.updateStatus(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-detail', selectedIncidentId] });
      toast.success('Incident lifecycle status updated');
      setTargetStatus('');
      setTransitionNotes('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  });

  const updatePostMortemMutation = useMutation({
    mutationFn: ({ id, data }) => incidentsApi.updatePostMortem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-detail', selectedIncidentId] });
      toast.success('Post-mortem analysis saved');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save post-mortem');
    }
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedTo }) => incidentsApi.assignIncident(id, { assignedTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident-detail', selectedIncidentId] });
      toast.success('Responder assignment updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to reassign incident');
    }
  });

  const incidents = incidentsData?.incidents || [];

  const counts = useMemo(() => {
    const base = { All: incidents.length };
    STAGES.forEach((stage) => {
      base[stage] = incidents.filter((inc) => inc.status === stage).length;
    });
    return base;
  }, [incidents]);

  const visibleIncidents = useMemo(
    () => (activeTab === 'All' ? incidents : incidents.filter((inc) => inc.status === activeTab)),
    [incidents, activeTab]
  );

  const closeDetail = () => {
    setSelectedIncidentId(null);
    if (searchParams.get('id')) {
      const next = new URLSearchParams(searchParams);
      next.delete('id');
      setSearchParams(next, { replace: true });
    }
  };

  // Escape closes the topmost overlay
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (targetStatus) {
        setTargetStatus('');
        setTransitionNotes('');
      } else if (showCreateModal) {
        setShowCreateModal(false);
      } else if (selectedIncidentId) {
        closeDetail();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [targetStatus, showCreateModal, selectedIncidentId, searchParams]);

  const openTransition = (status) => {
    setTransitionNotes('');
    setTargetStatus(status);
  };

  const activeDetailStage = incidentDetail ? stageMeta(incidentDetail.status) : null;
  const ActiveDetailIcon = activeDetailStage?.icon;

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Security operations</p>
          <h1 className="page-title mt-1 flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-severity-critical" />
            Incident response
          </h1>
          <p className="page-subtitle">
            Declare, triage and contain incidents across their full lifecycle, with SLA tracking and
            post-mortem evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-secondary"
            aria-label="Refresh incident queue"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {canManage && (
            <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Declare incident
            </button>
          )}
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((stage) => {
          const meta = stageMeta(stage);
          const Icon = meta.icon;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveTab(stage)}
              className={`card card-hover flex items-center gap-3 p-3.5 text-left ${
                activeTab === stage ? 'border-accent-cyan/45' : ''
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${meta.badge}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-lg font-semibold leading-none text-dark-text">
                  {counts[stage]}
                </span>
                <span className="mt-1 block truncate text-[10px] font-medium uppercase tracking-wider text-dark-muted">
                  {stage}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {['All', ...STAGES].map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveTab(stage)}
              className={`rounded-control px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                activeTab === stage
                  ? 'bg-accent-cyan/15 text-accent-cyan'
                  : 'text-dark-muted hover:bg-dark-raised hover:text-dark-text'
              }`}
            >
              {stage}
              <span className="ml-1.5 font-mono text-[10px] opacity-70">{counts[stage] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dark-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, title or scope…"
              aria-label="Search incidents"
              className="input py-2 pl-9 text-xs sm:w-64"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter by severity"
            className="select py-2 text-xs sm:w-40"
          >
            <option value="">All severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Incident grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-card border border-dark-border bg-dark-surface"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="card">
          <div className="empty-state py-14">
            <ShieldAlert className="h-6 w-6 text-severity-critical" />
            <p className="text-sm font-medium text-dark-text">Could not load the incident queue</p>
            <p className="text-xs text-dark-muted">Check the API connection and try again.</p>
            <button type="button" onClick={() => refetch()} className="btn-secondary mt-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      ) : visibleIncidents.length === 0 ? (
        <EmptyState
          title={
            search || severityFilter
              ? 'No incidents match these filters'
              : `No incidents in ${activeTab === 'All' ? 'the queue' : activeTab}`
          }
          description={
            search || severityFilter
              ? 'Try clearing the search term or selecting a different severity.'
              : 'The response queue is clear. New detections will appear here automatically.'
          }
          action={
            (search || severityFilter || activeTab !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSeverityFilter('');
                  setActiveTab('All');
                }}
                className="btn-secondary btn-sm mt-1"
              >
                Reset filters
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleIncidents.map((inc) => {
            const meta = stageMeta(inc.status);
            const StageIcon = meta.icon;
            return (
              <button
                key={inc._id}
                type="button"
                onClick={() => setSelectedIncidentId(inc._id)}
                className="card card-hover group flex flex-col p-4 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-accent-cyan">
                    {inc.incidentId}
                  </span>
                  <span
                    className={`badge ${SEVERITY_STYLES[inc.severity] || SEVERITY_STYLES.Low}`}
                  >
                    {inc.severity}
                  </span>
                </div>

                <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-dark-text group-hover:text-accent-cyan">
                  {inc.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-dark-muted">
                  {inc.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-dark-muted">
                  <span className="badge border-dark-border bg-dark-raised text-dark-muted">
                    {inc.project?.name || 'Unknown project'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-semibold ${meta.badge}`}
                  >
                    <StageIcon className="h-3 w-3" />
                    {inc.status}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-dark-border/70 pt-3 text-[10.5px] text-dark-muted">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">{inc.assignedTo?.name || 'Unassigned'}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    {inc.createdAt
                      ? formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true })
                      : '—'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
      {selectedIncidentId && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDetail();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Incident detail"
        >
          <div className="flex h-full w-full max-w-2xl flex-col border-l border-dark-border bg-dark-surface shadow-raised animate-fade-in">
            {isLoadingDetail || !incidentDetail ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-accent-cyan" />
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-dark-border px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-accent-cyan">
                        {incidentDetail.incidentId}
                      </span>
                      <span
                        className={`badge ${
                          SEVERITY_STYLES[incidentDetail.severity] || SEVERITY_STYLES.Low
                        }`}
                      >
                        {incidentDetail.severity}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${activeDetailStage.badge}`}
                      >
                        <ActiveDetailIcon className="h-3 w-3" />
                        {incidentDetail.status}
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-base font-semibold leading-snug text-dark-text">
                      {incidentDetail.title}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={closeDetail}
                    className="btn-icon shrink-0"
                    aria-label="Close incident detail"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 scroll-thin">
                  {/* Metadata */}
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-dark-border bg-dark-bg/40 p-4 text-[11px]">
                    <div>
                      <dt className="text-dark-muted">Project</dt>
                      <dd className="mt-0.5 truncate font-medium text-dark-text">
                        {incidentDetail.project?.name || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-dark-muted">Responder</dt>
                      <dd className="mt-0.5 truncate font-medium text-dark-text">
                        {incidentDetail.assignedTo?.name || 'Unassigned'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-dark-muted">Declared by</dt>
                      <dd className="mt-0.5 truncate font-medium text-dark-text">
                        {incidentDetail.createdBy?.name || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-dark-muted">Declared at</dt>
                      <dd className="mt-0.5 font-mono text-dark-text">
                        {format(new Date(incidentDetail.createdAt), 'yyyy-MM-dd HH:mm')}
                      </dd>
                    </div>
                    <div className="col-span-2 border-t border-dark-border/70 pt-3">
                      <dt className="text-dark-muted">Scope &amp; narrative</dt>
                      <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-dark-text">
                        {incidentDetail.description}
                      </dd>
                    </div>
                  </dl>

                  {/* Assignment */}
                  {canManage && (
                    <div className="flex flex-col gap-2 rounded-card border border-dark-border bg-dark-bg/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-dark-text">Responder assignment</p>
                        <p className="text-[10.5px] text-dark-muted">
                          Reassign ownership of this incident.
                        </p>
                      </div>
                      <select
                        value={incidentDetail.assignedTo?._id || ''}
                        onChange={(e) =>
                          assignMutation.mutate({
                            id: incidentDetail._id,
                            assignedTo: e.target.value || null
                          })
                        }
                        disabled={assignMutation.isPending}
                        aria-label="Assign responder"
                        className="select py-1.5 text-xs sm:w-56"
                      >
                        <option value="">Unassigned</option>
                        {usersData?.users?.map((u) => (
                          <option key={u._id} value={u._id}>
                            {formatUserLabel(u)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Lifecycle */}
                  <section className="rounded-card border border-dark-border bg-dark-bg/40 p-4">
                    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-dark-muted">
                      <ArrowRight className="h-3.5 w-3.5 text-accent-cyan" />
                      Lifecycle progression
                    </h3>

                    <div className="mt-3 space-y-1.5">
                      {STAGES.map((stage, index) => {
                        const meta = stageMeta(stage);
                        const Icon = meta.icon;
                        const currentIndex = STAGES.indexOf(incidentDetail.status);
                        const isCurrent = incidentDetail.status === stage;
                        const isPast = index < currentIndex;
                        const disabled = !canTransition || isCurrent || updateStatusMutation.isPending;

                        return (
                          <button
                            key={stage}
                            type="button"
                            disabled={disabled}
                            onClick={() => openTransition(stage)}
                            className={`flex w-full items-center gap-3 rounded-control border px-3 py-2 text-left transition-colors ${
                              isCurrent
                                ? `${meta.badge} cursor-default`
                                : isPast
                                  ? 'border-dark-border bg-dark-raised/40 text-dark-muted'
                                  : 'border-dark-border bg-dark-surface text-dark-text hover:border-accent-cyan/40'
                            } ${canTransition && !isCurrent ? '' : 'disabled:cursor-not-allowed'}`}
                          >
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                                isCurrent
                                  ? meta.badge
                                  : 'border-dark-border bg-dark-raised text-dark-muted'
                              }`}
                            >
                              <Icon className="h-3 w-3" />
                            </span>
                            <span className="flex-1 text-[11.5px] font-medium">{stage}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-semibold uppercase tracking-wider">
                                current
                              </span>
                            )}
                            {!isCurrent && canTransition && (
                              <ChevronRight className="h-3.5 w-3.5 text-dark-muted" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {!canTransition && (
                      <p className="mt-2 text-[10.5px] text-dark-muted">
                        Only Admins, Security Analysts and Developers can advance the lifecycle.
                      </p>
                    )}
                  </section>

                  {/* Timeline */}
                  <section>
                    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-dark-muted">
                      <Clock className="h-3.5 w-3.5" />
                      Response timeline
                    </h3>

                    {!incidentDetail.timeline?.length ? (
                      <p className="mt-2 text-[11px] text-dark-muted">No timeline entries yet.</p>
                    ) : (
                      <ol className="mt-3 space-y-2">
                        {[...incidentDetail.timeline].reverse().map((item, idx) => (
                          <li
                            key={item._id || idx}
                            className="rounded-control border border-dark-border/70 bg-dark-bg/30 px-3 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-[11.5px] font-medium text-dark-text">
                                {item.action}
                              </p>
                              <span className="shrink-0 whitespace-nowrap font-mono text-[9.5px] text-dark-muted">
                                {item.timestamp
                                  ? format(new Date(item.timestamp), 'MMM d, HH:mm')
                                  : '—'}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="mt-1 text-[10.5px] leading-relaxed text-dark-muted">
                                {item.notes}
                              </p>
                            )}
                            <p className="mt-1 text-[9.5px] text-dark-muted/70">
                              {item.performedByName || 'Responder'}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  {/* Post-mortem */}
                  <section className="rounded-card border border-violet-500/25 bg-violet-500/[0.04] p-4">
                    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                      <FileCheck className="h-3.5 w-3.5" />
                      Post-mortem analysis
                    </h3>

                    <div className="mt-3 space-y-3">
                      <div>
                        <label htmlFor="pm-root-cause" className="label">
                          Root cause &amp; trigger
                        </label>
                        <textarea
                          id="pm-root-cause"
                          rows={2}
                          value={postMortemForm.rootCause}
                          onChange={(e) =>
                            setPostMortemForm({ ...postMortemForm, rootCause: e.target.value })
                          }
                          disabled={!canManage}
                          placeholder="e.g. Unsanitized parameter passed to the SQL search controller."
                          className="textarea py-2 text-xs"
                        />
                      </div>

                      <div>
                        <label htmlFor="pm-impact" className="label">
                          Impact &amp; systems affected
                        </label>
                        <input
                          id="pm-impact"
                          type="text"
                          value={postMortemForm.impactSummary}
                          onChange={(e) =>
                            setPostMortemForm({ ...postMortemForm, impactSummary: e.target.value })
                          }
                          disabled={!canManage}
                          placeholder="e.g. Transient exposure in staging; no customer records breached."
                          className="input py-2 text-xs"
                        />
                      </div>

                      <div>
                        <label htmlFor="pm-actions" className="label">
                          Preventative actions
                        </label>
                        <input
                          id="pm-actions"
                          type="text"
                          value={postMortemForm.preventativeActions}
                          onChange={(e) =>
                            setPostMortemForm({
                              ...postMortemForm,
                              preventativeActions: e.target.value
                            })
                          }
                          disabled={!canManage}
                          placeholder="e.g. Enforced Semgrep pre-commit hook and ORM parameterisation."
                          className="input py-2 text-xs"
                        />
                      </div>

                      {canManage && (
                        <div className="flex items-center justify-between gap-3 pt-1">
                          {incidentDetail.postMortem?.completedAt ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Saved{' '}
                              {formatDistanceToNow(new Date(incidentDetail.postMortem.completedAt), {
                                addSuffix: true
                              })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-dark-muted">Not documented yet</span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              updatePostMortemMutation.mutate({
                                id: incidentDetail._id,
                                data: postMortemForm
                              })
                            }
                            disabled={updatePostMortemMutation.isPending}
                            className="btn-secondary btn-sm"
                          >
                            {updatePostMortemMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FileCheck className="h-3 w-3" />
                            )}
                            Save post-mortem
                          </button>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <div className="shrink-0 border-t border-dark-border px-5 py-3">
                  <button type="button" onClick={closeDetail} className="btn-secondary w-full">
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status transition modal */}
      {targetStatus && incidentDetail && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setTargetStatus('');
              setTransitionNotes('');
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="transition-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-card border border-dark-border bg-dark-surface shadow-raised animate-scale-in">
            <div className="flex items-start justify-between gap-3 border-b border-dark-border px-5 py-4">
              <div>
                <h3 id="transition-title" className="text-sm font-semibold text-dark-text">
                  Advance incident stage
                </h3>
                <p className="mt-1 text-[11px] text-dark-muted">
                  {incidentDetail.status} → <span className="text-accent-cyan">{targetStatus}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTargetStatus('');
                  setTransitionNotes('');
                }}
                className="btn-icon h-8 w-8"
                aria-label="Cancel transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <div>
                <label htmlFor="transition-notes" className="label">
                  Triage note <span className="normal-case text-dark-muted/70">(optional)</span>
                </label>
                <textarea
                  id="transition-notes"
                  rows={3}
                  autoFocus
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  placeholder="Summarise what changed, containment steps taken or evidence collected…"
                  className="textarea py-2 text-xs"
                />
              </div>
              <p className="text-[10.5px] leading-relaxed text-dark-muted">
                This transition is written to the incident timeline and the immutable audit log.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-dark-border bg-dark-raised/30 px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  setTargetStatus('');
                  setTransitionNotes('');
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: incidentDetail._id,
                    status: targetStatus,
                    notes: transitionNotes.trim()
                  })
                }
                disabled={updateStatusMutation.isPending}
                className="btn-primary"
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <Activity className="h-3.5 w-3.5" />
                    Confirm transition
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create incident modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-incident-title"
        >
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-dark-border bg-dark-surface shadow-raised animate-scale-in">
            <div className="flex items-start justify-between gap-3 border-b border-dark-border px-5 py-4">
              <div>
                <h3
                  id="create-incident-title"
                  className="flex items-center gap-2 text-sm font-semibold text-dark-text"
                >
                  <AlertTriangle className="h-4 w-4 text-severity-critical" />
                  Declare security incident
                </h3>
                <p className="mt-1 text-[11px] text-dark-muted">
                  Opens a response timeline and notifies the assigned responder.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-icon h-8 w-8"
                aria-label="Close create incident dialog"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newIncident);
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="space-y-3.5 overflow-y-auto px-5 py-4 scroll-thin">
                <div>
                  <label htmlFor="incident-title" className="label">
                    Incident title
                  </label>
                  <input
                    id="incident-title"
                    type="text"
                    required
                    value={newIncident.title}
                    onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                    placeholder="e.g. Production AWS key exposed in main branch"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="incident-project" className="label">
                    Target project
                  </label>
                  <select
                    id="incident-project"
                    required
                    value={newIncident.project}
                    onChange={(e) => setNewIncident({ ...newIncident, project: e.target.value })}
                    className="select text-xs"
                  >
                    <option value="">Select a project…</option>
                    {projectsData?.data?.projects?.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.key})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="incident-severity" className="label">
                      Severity
                    </label>
                    <select
                      id="incident-severity"
                      value={newIncident.severity}
                      onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                      className="select text-xs"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="incident-assignee" className="label">
                      Assign responder
                    </label>
                    <select
                      id="incident-assignee"
                      value={newIncident.assignedTo}
                      onChange={(e) =>
                        setNewIncident({ ...newIncident, assignedTo: e.target.value })
                      }
                      className="select text-xs"
                    >
                      <option value="">Unassigned</option>
                      {usersData?.users?.map((u) => (
                        <option key={u._id} value={u._id}>
                          {formatUserLabel(u)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="incident-description" className="label">
                    Description &amp; scope
                  </label>
                  <textarea
                    id="incident-description"
                    rows={4}
                    required
                    value={newIncident.description}
                    onChange={(e) =>
                      setNewIncident({ ...newIncident, description: e.target.value })
                    }
                    placeholder="Describe discovery context, affected services and immediate containment steps…"
                    className="textarea py-2 text-xs"
                  />
                </div>

                <div className="flex items-start gap-2 rounded-control border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[10.5px] text-amber-300">
                  <Inbox className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Incidents are visible to all roles and recorded in the audit trail. Use severity
                    Critical for active exploitation.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-dark-border bg-dark-raised/30 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newIncident.project}
                  className="btn-danger border-severity-critical/50 bg-severity-critical/15 text-severity-critical hover:bg-severity-critical/25"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Registering…
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Declare incident
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
