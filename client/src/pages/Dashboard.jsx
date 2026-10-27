import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  ShieldCheck,
  AlertOctagon,
  GitPullRequest,
  Activity,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Layers,
  Bell,
  UploadCloud,
  FileSpreadsheet,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Inbox
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import dashboardApi from '../api/dashboard.api';
import StatCard from '../components/common/StatCard';
import SeverityBadge from '../components/common/SeverityBadge';

const SEVERITY_CHART_COLORS = {
  Critical: '#F43F5E',
  High: '#F59E0B',
  Medium: '#3B82F6',
  Low: '#64748B'
};

const CHART_TOOLTIP = {
  backgroundColor: 'rgb(var(--dark-surface))',
  border: '1px solid rgb(var(--dark-border))',
  borderRadius: '10px',
  color: 'rgb(var(--dark-text))',
  fontSize: '12px',
  boxShadow: '0 12px 32px -16px rgba(0,0,0,0.6)'
};

const DONUT_TOOLTIP = {
  // Approximate rendered size of the tooltip, used to keep it inside the plot area.
  width: 100,
  height: 32,
  inset: 6,
  gap: 10,
  style: { ...CHART_TOOLTIP, padding: '6px 9px' },
  itemStyle: { color: 'rgb(var(--dark-text))', padding: 0 }
};

function PostureRing({ score }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score || 0));
  const offset = circumference * (1 - clamped / 100);
  const tone =
    clamped >= 85
      ? { stroke: '#34D399', text: 'text-emerald-400', grade: 'A' }
      : clamped >= 70
        ? { stroke: '#22D3EE', text: 'text-accent-cyan', grade: 'B' }
        : clamped >= 55
          ? { stroke: '#F59E0B', text: 'text-amber-400', grade: 'C' }
          : { stroke: '#F43F5E', text: 'text-rose-400', grade: 'D' };

  return (
    <div className="relative flex h-[124px] w-[124px] items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 110 110" aria-hidden="true">
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="rgb(var(--dark-border))"
          strokeWidth="7"
        />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-mono text-2xl font-semibold tabular-nums ${tone.text}`}>
          {clamped}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-dark-muted">
          / 100
        </span>
      </div>
      <span className="sr-only">Posture grade {tone.grade}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[132px] animate-pulse rounded-card border border-dark-border bg-dark-surface" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-card border border-dark-border bg-dark-surface" />
        <div className="h-72 animate-pulse rounded-card border border-dark-border bg-dark-surface lg:col-span-2" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000
  });

  const [donutSector, setDonutSector] = useState(null);
  const [donutChartEl, setDonutChartEl] = useState(null);
  const [donutChartSize, setDonutChartSize] = useState(null);

  // Track the plot size so tooltip placement stays correct when the card or
  // window is resized, instead of reusing geometry from the last hover.
  useEffect(() => {
    if (!donutChartEl) return undefined;

    const measure = () =>
      setDonutChartSize({
        width: donutChartEl.clientWidth,
        height: donutChartEl.clientHeight
      });

    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(measure);
    observer.observe(donutChartEl);
    return () => observer.disconnect();
  }, [donutChartEl]);

  // Keep the donut tooltip out of the ring/centre: anchor it just outside the
  // hovered sector on the opposite side, then clamp it to the plot area so it
  // can never be clipped by the chart container or spill out of the card.
  const donutTooltipPosition = useMemo(() => {
    if (!donutSector || !donutChartSize?.width || !donutChartSize?.height) return undefined;

    const { midAngle, outerRadius } = donutSector;
    if (![midAngle, outerRadius].every(Number.isFinite)) return undefined;

    const { width: chartWidth, height: chartHeight } = donutChartSize;
    const cx = chartWidth / 2;
    const cy = chartHeight / 2;
    const { width, height, inset, gap } = DONUT_TOOLTIP;
    const angle = (midAngle * Math.PI) / 180;
    const placeLeft = Math.cos(angle) >= 0;
    const placeAbove = Math.sin(angle) >= 0;

    const anchorX = placeLeft
      ? cx - outerRadius - gap - width
      : cx + outerRadius + gap;
    const anchorY = placeAbove
      ? cy - outerRadius - gap - height
      : cy + outerRadius + gap;

    const x = Math.min(Math.max(anchorX, inset), Math.max(inset, chartWidth - width - inset));
    const y = Math.min(Math.max(anchorY, inset), Math.max(inset, chartHeight - height - inset));

    return { x, y };
  }, [donutSector, donutChartSize]);

  if (isLoading) return <LoadingState />;

  if (isError || !stats) {
    return (
      <div className="card">
        <div className="empty-state">
          <ShieldAlert className="h-6 w-6 text-severity-critical" />
          <p className="text-sm font-medium text-dark-text">Unable to load dashboard telemetry</p>
          <p className="text-xs text-dark-muted">
            The security API did not respond. Check that the backend is running and try again.
          </p>
          <button type="button" onClick={() => refetch()} className="btn-secondary mt-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const overview = stats.overview || {};
  const complianceScores = stats.complianceScores || [];
  const assessedFrameworks = complianceScores.filter((f) => f.assessed);
  const postureScore =
    stats.complianceOverview?.averageScore ??
    (assessedFrameworks.length
      ? Math.round(assessedFrameworks.reduce((acc, f) => acc + (f.score || 0), 0) / assessedFrameworks.length)
      : 0);

  const criticalHigh =
    (stats.severityBreakdown?.Critical || 0) + (stats.severityBreakdown?.High || 0);
  const totalOpen = overview.totalOpenVulnerabilities || 0;

  const severityPieData = ['Critical', 'High', 'Medium', 'Low']
    .map((name) => ({ name, value: stats.severityBreakdown?.[name] || 0 }))
    .filter((item) => item.value > 0);

  const topProjectsData = (stats.topVulnerableProjects || []).map((p) => ({
    name: p.projectKey || p.projectName,
    critical: p.critical,
    high: p.high,
    total: p.total
  }));

  const postureTone =
    postureScore >= 85
      ? 'text-emerald-400'
      : postureScore >= 70
        ? 'text-accent-cyan'
        : postureScore >= 55
          ? 'text-amber-400'
          : 'text-rose-400';

  const grade =
    postureScore >= 85 ? 'A' : postureScore >= 70 ? 'B' : postureScore >= 55 ? 'C' : 'D';

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className="page animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Security command center</p>
          <h2 className="page-title mt-1">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            {user?.name?.split(' ')[0] || 'there'}
          </h2>
          <p className="page-subtitle">
            Live view of CI/CD gate posture, open findings and compliance readiness.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-control border border-dark-border bg-dark-surface px-2.5 py-1.5 text-[10px] text-dark-muted sm:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${isFetching ? 'animate-pulse bg-accent-cyan' : 'bg-emerald-400'}`} />
            {isFetching ? 'Syncing…' : `Updated ${lastUpdated}`}
          </span>

          {['Admin', 'Security Analyst'].includes(user?.role) && (
            <button type="button" onClick={() => navigate('/scans/import')} className="btn-secondary">
              <UploadCloud className="h-3.5 w-3.5" />
              Import scan
            </button>
          )}

          <button type="button" onClick={() => navigate('/reports')} className="btn-primary">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Reports &amp; exports
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Security posture"
          value={`${postureScore}`}
          subtitle={`${assessedFrameworks.length} of ${complianceScores.length} frameworks assessed`}
          trend={`Grade ${grade}`}
          trendDirection={postureScore >= 70 ? 'up' : 'down'}
          trendLabel="weighted"
          accentColor="emerald"
          icon={ShieldCheck}
          onClick={() => navigate('/compliance')}
        />

        <StatCard
          title="Critical + high open"
          value={String(criticalHigh)}
          subtitle={`${totalOpen} total open findings`}
          trend={criticalHigh > 0 ? 'Action needed' : 'Clear'}
          trendDirection={criticalHigh > 0 ? 'down' : 'up'}
          trendLabel={`${stats.severityBreakdown?.Critical || 0} critical`}
          accentColor="rose"
          icon={AlertOctagon}
          onClick={() => navigate('/vulnerabilities?severity=Critical,High')}
        />

        <StatCard
          title="CI gate pass rate"
          value={`${overview.gatePassRate ?? 0}%`}
          subtitle={`${overview.passedPipelines ?? 0} passed · ${overview.failedPipelines ?? 0} failed`}
          trend={`${overview.totalPipelines ?? 0} runs`}
          trendDirection={(overview.gatePassRate ?? 0) >= 80 ? 'up' : 'down'}
          trendLabel="all pipelines"
          accentColor="indigo"
          icon={GitPullRequest}
          onClick={() => navigate('/pipelines')}
        />

        <StatCard
          title="Active incidents"
          value={String(overview.activeIncidentsCount ?? 0)}
          subtitle={`${overview.slaBreachesCount ?? 0} SLA breaches open`}
          trend={overview.activeIncidentsCount > 0 ? 'In triage' : 'None active'}
          trendDirection={overview.activeIncidentsCount > 0 ? 'down' : 'up'}
          accentColor="amber"
          icon={Activity}
          onClick={() => navigate('/incidents')}
        />
      </div>

      {/* Posture + severity + trend */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Posture summary */}
        <section className="card xl:col-span-4">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Compliance posture
              </h3>
              <p className="card-subtitle">Assessment-weighted framework average</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/compliance')}
              className="text-[11px] font-medium text-accent-cyan hover:underline"
            >
              Details
            </button>
          </div>

          <div className="flex items-center gap-5 p-5">
            <PostureRing score={postureScore} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dark-muted">
                Overall grade
              </p>
              <p className={`mt-0.5 text-lg font-semibold ${postureTone}`}>
                {postureScore >= 85
                  ? 'Audit ready'
                  : postureScore >= 70
                    ? 'On track'
                    : postureScore >= 55
                      ? 'Needs remediation'
                      : 'At risk'}
              </p>
              <dl className="mt-3 space-y-2 text-[11px]">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-dark-muted">Controls passed</dt>
                  <dd className="font-mono font-medium text-dark-text">
                    {stats.complianceOverview?.passedControls ?? 0}/
                    {stats.complianceOverview?.totalControls ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-dark-muted">SLA breaches</dt>
                  <dd
                    className={`font-mono font-medium ${
                      overview.slaBreachesCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {overview.slaBreachesCount ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-dark-muted">Projects tracked</dt>
                  <dd className="font-mono font-medium text-dark-text">
                    {overview.totalProjects ?? 0}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="border-t border-dark-border px-5 py-3">
            <div className="flex items-center gap-2 text-[11px]">
              {postureScore >= 70 ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span className="text-dark-muted">
                {postureScore >= 70
                  ? 'Posture is within the accepted risk threshold.'
                  : 'Remediate critical findings to raise posture.'}
              </span>
            </div>
          </div>
        </section>

        {/* Severity donut */}
        <section className="card xl:col-span-3">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <AlertOctagon className="h-4 w-4 text-rose-400" />
                Open by severity
              </h3>
              <p className="card-subtitle">{totalOpen} findings in backlog</p>
            </div>
          </div>

          <div className="relative h-52 p-3">
            {severityPieData.length === 0 ? (
              <div className="empty-state h-full py-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <p className="text-xs text-dark-muted">No open findings</p>
              </div>
            ) : (
              <>
                <div ref={setDonutChartEl} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart onMouseLeave={() => setDonutSector(null)}>
                      <Pie
                        data={severityPieData}
                        innerRadius={50}
                        outerRadius={74}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(sector, index, event) => {
                          const viewBox = event?.currentTarget?.ownerSVGElement?.viewBox?.baseVal;
                          if (viewBox?.width && viewBox?.height) {
                            setDonutChartSize((prev) =>
                              prev && prev.width === viewBox.width && prev.height === viewBox.height
                                ? prev
                                : { width: viewBox.width, height: viewBox.height }
                            );
                          }
                          setDonutSector(sector);
                        }}
                      >
                        {severityPieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={SEVERITY_CHART_COLORS[entry.name] || '#64748B'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={DONUT_TOOLTIP.style}
                        itemStyle={DONUT_TOOLTIP.itemStyle}
                        labelStyle={{ display: 'none' }}
                        separator=": "
                        position={donutTooltipPosition}
                        isAnimationActive={false}
                        wrapperStyle={{ zIndex: 5 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-3">
                  <span className="font-mono text-xl font-semibold text-dark-text">
                    {totalOpen}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-dark-muted">open</span>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-dark-border px-5 py-3">
            {['Critical', 'High', 'Medium', 'Low'].map((name) => (
              <div key={name} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 text-dark-muted">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: SEVERITY_CHART_COLORS[name] }}
                  />
                  {name}
                </span>
                <span className="font-mono font-medium text-dark-text">
                  {stats.severityBreakdown?.[name] || 0}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Trend */}
        <section className="card xl:col-span-5">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <TrendingUp className="h-4 w-4 text-accent-cyan" />
                Discovery velocity
              </h3>
              <p className="card-subtitle">New findings ingested over 30 days</p>
            </div>
            <span className="badge-neutral">30d</span>
          </div>

          <div className="h-[248px] p-3 pt-5">
            {!stats.trend?.length ? (
              <div className="empty-state h-full py-0">
                <TrendingUp className="h-5 w-5 text-dark-muted/60" />
                <p className="text-xs text-dark-muted">No scan telemetry in this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--dark-border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="rgb(var(--dark-muted))"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v?.slice(5)}
                    minTickGap={24}
                  />
                  <YAxis
                    stroke="rgb(var(--dark-muted))"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={CHART_TOOLTIP} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Findings"
                    stroke="#22D3EE"
                    strokeWidth={2}
                    fill="url(#trendFill)"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* Risk + compliance */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Layers className="h-4 w-4 text-amber-400" />
                Highest risk services
              </h3>
              <p className="card-subtitle">Ranked by open critical and high findings</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="flex items-center gap-0.5 text-[11px] font-medium text-accent-cyan hover:underline"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="h-[228px] p-3 pt-4">
            {topProjectsData.length === 0 ? (
              <div className="empty-state h-full py-0">
                <Layers className="h-5 w-5 text-dark-muted/60" />
                <p className="text-xs text-dark-muted">No vulnerable projects recorded</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProjectsData}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
                  barGap={2}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgb(var(--dark-border))"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="rgb(var(--dark-muted))"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="rgb(var(--dark-muted))"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={76}
                  />
                  <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: '10px', color: 'rgb(var(--dark-muted))' }}
                  />
                  <Bar dataKey="critical" name="Critical" fill="#F43F5E" radius={[0, 3, 3, 0]} barSize={9} />
                  <Bar dataKey="high" name="High" fill="#F59E0B" radius={[0, 3, 3, 0]} barSize={9} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Framework readiness
              </h3>
              <p className="card-subtitle">Assessment coverage and pass rate</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/compliance')}
              className="flex items-center gap-0.5 text-[11px] font-medium text-accent-cyan hover:underline"
            >
              Matrix
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="p-5">
            {assessedFrameworks.length === 0 ? (
              <div className="empty-state py-6">
                <ShieldAlert className="h-5 w-5 text-dark-muted/60" />
                <p className="text-xs text-dark-muted">No assessments recorded yet</p>
                <button
                  type="button"
                  onClick={() => navigate('/compliance')}
                  className="btn-secondary btn-sm mt-1"
                >
                  Run an assessment
                </button>
              </div>
            ) : (
              <ul className="space-y-3.5">
                {assessedFrameworks.slice(0, 5).map((framework) => {
                  const tone =
                    framework.score >= 85
                      ? 'bg-emerald-400'
                      : framework.score >= 70
                        ? 'bg-accent-cyan'
                        : framework.score >= 55
                          ? 'bg-amber-400'
                          : 'bg-rose-400';
                  return (
                    <li key={framework.code}>
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="truncate font-medium text-dark-text">
                          {framework.name}
                        </span>
                        <span className="shrink-0 font-mono text-dark-muted">
                          {framework.score}%
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-dark-raised">
                          <div
                            className={`h-full rounded-full ${tone}`}
                            style={{ width: `${framework.score}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right font-mono text-[9px] text-dark-muted">
                          {framework.passedControls}/{framework.totalControls}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Alert feed */}
      <section className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Bell className="h-4 w-4 text-accent-cyan" />
              Recent security alerts
            </h3>
            <p className="card-subtitle">Latest detections from scan ingestion and policy gates</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className="flex items-center gap-0.5 text-[11px] font-medium text-accent-cyan hover:underline"
          >
            Inbox
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {!stats.recentAlerts?.length ? (
          <div className="empty-state py-8">
            <Inbox className="h-5 w-5 text-dark-muted/60" />
            <p className="text-xs text-dark-muted">No alerts in the current cycle</p>
          </div>
        ) : (
          <ul className="divide-y divide-dark-border/70">
            {stats.recentAlerts.map((alert) => {
              const projectId = alert.project?._id;
              const rowContent = (
                <>
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-severity-high" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-dark-text">{alert.title}</span>
                        <SeverityBadge severity={alert.severity} />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-dark-muted">{alert.message}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-medium text-dark-muted">
                      {alert.project?.name || 'Platform'}
                    </p>
                    <p className="font-mono text-[10px] text-dark-muted/70">
                      {alert.createdAt
                        ? formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })
                        : '—'}
                    </p>
                  </div>
                </>
              );

              return (
                <li key={alert._id}>
                  {projectId ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/vulnerabilities?project=${projectId}`)}
                      className="flex w-full items-start justify-between gap-4 px-5 py-3 text-left transition-colors hover:bg-dark-raised/40"
                      aria-label={`View findings for ${alert.project?.name || 'project'}`}
                    >
                      {rowContent}
                    </button>
                  ) : (
                    <div className="flex w-full items-start justify-between gap-4 px-5 py-3 text-left">
                      {rowContent}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
