import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  FileText,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  CalendarClock,
  Layers,
  CheckCircle2,
  Lock,
  Loader2,
  Server,
  ShieldAlert,
  Gauge,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import reportsApi from '../api/reports.api';
import projectsApi from '../api/projects.api';
import dashboardApi from '../api/dashboard.api';

const EXPORT_CARDS = [
  {
    id: 'pdf',
    icon: FileText,
    accent: 'border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan',
    title: 'Executive summary PDF',
    description:
      'Formal multi-page report generated with pdfkit. Includes posture KPIs, project rankings, compliance status and priority findings.',
    bullets: [
      'Executive score breakdown',
      'Framework compliance ratings',
      'High-risk items & SLA deadlines'
    ],
    actionLabel: 'Download executive PDF',
    busyLabel: 'Generating PDF…',
    variant: 'primary',
    iconTone: 'text-accent-cyan'
  },
  {
    id: 'vulns-csv',
    icon: FileSpreadsheet,
    accent: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
    title: 'Vulnerabilities CSV',
    description:
      'Complete tabular export of tracked findings with CVE, CWE, CVSS, scanner source and SLA breach metrics.',
    bullets: ['Trivy, Gitleaks, Semgrep, npm audit', 'SLA breach & age columns', 'Optional project / severity scoping'],
    actionLabel: 'Export vulnerabilities CSV',
    busyLabel: 'Exporting…',
    variant: 'secondary',
    iconTone: 'text-amber-400'
  },
  {
    id: 'compliance-csv',
    icon: ShieldCheck,
    accent: 'border-violet-500/25 bg-violet-500/10 text-violet-400',
    title: 'Compliance matrix CSV',
    description:
      'Auditor-ready control inventory across OWASP Top 10, NIST CSF, CIS, ISO 27001, SOC 2 and PCI-DSS.',
    bullets: ['Control code & classification', 'Passed / failed / under review', 'Linked vulnerability tally'],
    actionLabel: 'Export compliance CSV',
    busyLabel: 'Exporting…',
    variant: 'secondary',
    iconTone: 'text-violet-400'
  }
];

export default function Reports() {
  const [downloadingType, setDownloadingType] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');

  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.getProjects({ limit: 50 })
  });

  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingType('pdf');
      const blob = await reportsApi.downloadExecutivePdf();
      triggerDownload(blob, `DevSecOps_Executive_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
      toast.success('Executive PDF report downloaded');
    } catch {
      toast.error('Failed to generate PDF report');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadVulnsCsv = async () => {
    try {
      setDownloadingType('vulns-csv');
      const params = {};
      if (selectedProject) params.project = selectedProject;
      if (selectedSeverity) params.severity = selectedSeverity;

      const blob = await reportsApi.downloadVulnerabilitiesCsv(params);
      triggerDownload(blob, `Vulnerabilities_Telemetry_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      toast.success('Vulnerability dataset exported to CSV');
    } catch {
      toast.error('Failed to export vulnerabilities CSV');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadComplianceCsv = async () => {
    try {
      setDownloadingType('compliance-csv');
      const blob = await reportsApi.downloadComplianceCsv();
      triggerDownload(blob, `Compliance_Controls_Matrix_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      toast.success('Compliance matrix exported to CSV');
    } catch {
      toast.error('Failed to export compliance CSV');
    } finally {
      setDownloadingType(null);
    }
  };

  const handlers = {
    pdf: handleDownloadPdf,
    'vulns-csv': handleDownloadVulnsCsv,
    'compliance-csv': handleDownloadComplianceCsv
  };

  const overview = statsData?.overview || {};
  const criticalHigh =
    (statsData?.severityBreakdown?.Critical || 0) + (statsData?.severityBreakdown?.High || 0);
  const slaBreaches = overview.slaBreachesCount || 0;

  const snapshot = [
    {
      label: 'Monitored services',
      value: overview.totalProjects ?? '—',
      hint: 'Active repositories',
      icon: Server,
      tone: 'text-dark-text'
    },
    {
      label: 'Open critical / high',
      value: criticalHigh,
      hint: 'Requiring remediation',
      icon: ShieldAlert,
      tone: 'text-severity-critical'
    },
    {
      label: 'CI gate pass rate',
      value: `${overview.gatePassRate ?? 0}%`,
      hint: 'Across recent pipelines',
      icon: Gauge,
      tone: 'text-emerald-400'
    },
    {
      label: 'SLA health',
      value: slaBreaches === 0 ? 'Compliant' : `${slaBreaches} breached`,
      hint: 'Hourly cron monitored',
      icon: Clock,
      tone: slaBreaches === 0 ? 'text-emerald-400' : 'text-amber-400'
    }
  ];

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div>
        <p className="eyebrow">Governance</p>
        <h1 className="page-title mt-1 flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent-cyan" />
          Reports &amp; exports
        </h1>
        <p className="page-subtitle">
          Compile posture summaries, raw vulnerability telemetry and auditor-ready compliance
          evidence.
        </p>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dark-muted">
                  {item.label}
                </p>
                <Icon className={`h-4 w-4 ${item.tone}`} />
              </div>
              <p className={`mt-2 font-mono text-2xl font-semibold tracking-tight ${item.tone}`}>
                {item.value}
              </p>
              <p className="mt-1 text-[10.5px] text-dark-muted">{item.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {EXPORT_CARDS.map((card) => {
          const Icon = card.icon;
          const isBusy = downloadingType === card.id;
          const isDisabled = Boolean(downloadingType);

          return (
            <section key={card.id} className="card flex flex-col">
              <div className="flex-1 p-5">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-[10px] border ${card.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>

                <h3 className="mt-3 text-sm font-semibold text-dark-text">{card.title}</h3>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-dark-muted">
                  {card.description}
                </p>

                <ul className="mt-3.5 space-y-1.5">
                  {card.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-1.5 text-[11px] text-dark-muted">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {card.id === 'vulns-csv' && (
                  <div className="mt-4 space-y-2">
                    <div>
                      <label htmlFor="report-project" className="label">
                        Scope by project
                      </label>
                      <select
                        id="report-project"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="select py-1.5 text-xs"
                      >
                        <option value="">All projects</option>
                        {projectsData?.data?.projects?.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="report-severity" className="label">
                        Scope by severity
                      </label>
                      <select
                        id="report-severity"
                        value={selectedSeverity}
                        onChange={(e) => setSelectedSeverity(e.target.value)}
                        className="select py-1.5 text-xs"
                      >
                        <option value="">All severities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-dark-border p-4">
                <button
                  type="button"
                  onClick={handlers[card.id]}
                  disabled={isDisabled}
                  className={card.variant === 'primary' ? 'btn-primary w-full' : 'btn-secondary w-full'}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {card.busyLabel}
                    </>
                  ) : (
                    <>
                      <Download className={`h-3.5 w-3.5 ${card.iconTone}`} />
                      {card.actionLabel}
                    </>
                  )}
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {/* Audit readiness */}
      <section className="card flex items-start gap-3 p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dark-border bg-dark-raised text-accent-cyan">
          <Lock className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-dark-text">
            <Layers className="h-3.5 w-3.5 text-dark-muted" />
            Continuous compliance &amp; audit-trail integrity
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-dark-muted">
            Every export and configuration mutation is written to the immutable{' '}
            <code className="rounded bg-dark-raised px-1 py-0.5 text-[10px] text-accent-cyan">
              auditlogs
            </code>{' '}
            collection with actor, timestamp and client IP so evidence can be reproduced during an
            audit.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-dark-muted/70">
            <CalendarClock className="h-3 w-3" />
            Exports are stamped in your local timezone at generation
          </p>
        </div>
      </section>
    </div>
  );
}
