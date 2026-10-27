import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  ShieldAlert,
  ArrowRight,
  Clock,
  Layers,
  FileText
} from 'lucide-react';
import scansApi from '../api/scans.api';
import projectsApi from '../api/projects.api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const ScanImport = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTool, setSelectedTool] = useState('trivy');
  const [selectedScanType, setSelectedScanType] = useState('SCA');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);

  const [recentScans, setRecentScans] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const loadProjects = async () => {
    try {
      const res = await projectsApi.getProjects({ limit: 100 });
      if (res.success && res.data?.projects) {
        setProjects(res.data.projects);
        if (res.data.projects.length > 0) {
          setSelectedProject(res.data.projects[0]._id);
        }
      }
    } catch {
      // non-fatal
    }
  };

  const loadRecentScans = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await scansApi.getScanHistory({ limit: 5 });
      if (res.success && res.data?.history) {
        setRecentScans(res.data.history);
      }
    } catch {
      // non-fatal
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadProjects();
    loadRecentScans();
  }, []);

  // Update default scanType based on tool selected
  useEffect(() => {
    if (selectedTool === 'gitleaks') setSelectedScanType('Secret');
    else if (selectedTool === 'semgrep') setSelectedScanType('SAST');
    else if (selectedTool === 'npm-audit') setSelectedScanType('SCA');
    else if (selectedTool === 'trivy') setSelectedScanType('SCA');
  }, [selectedTool]);

  const clearFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const rejectFile = (message) => {
    setFile(null);
    clearFileInput();
    toast.error(message);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.name.endsWith('.json') && selected.type !== 'application/json') {
      rejectFile('Only JSON scan report files are accepted');
      return;
    }
    setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (!dropped.name.endsWith('.json') && dropped.type !== 'application/json') {
      rejectFile('Only JSON scan report files are accepted');
      return;
    }
    setFile(dropped);
  };

  const handleRemoveFile = () => {
    setFile(null);
    clearFileInput();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a JSON scan report to upload');
      return;
    }
    if (!selectedProject) {
      toast.error('Please choose a target project');
      return;
    }

    const formData = new FormData();
    formData.append('project', selectedProject);
    formData.append('tool', selectedTool);
    formData.append('scanType', selectedScanType);
    formData.append('file', file);

    setIsUploading(true);
    setImportSummary(null);

    try {
      const res = await scansApi.uploadScan(formData);
      if (res.success && res.data) {
        setImportSummary(res.data);
        toast.success('Scan report processed and policy gate evaluated!');
        setFile(null);
        clearFileInput();
        loadRecentScans();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process scan report');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-dark-text tracking-tight">
          Manual Scan Ingestion & Validation
        </h2>
        <p className="text-xs text-dark-muted mt-0.5">
          Upload raw tool output JSON files (Trivy, Gitleaks, npm-audit, Semgrep) to evaluate findings and pipeline gates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          <form
            onSubmit={handleSubmit}
            className="bg-dark-surface border border-dark-border rounded-card p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-dark-muted mb-1">
                  Target Project
                </label>
                <select
                  required
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-control px-3 py-2 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-muted mb-1">
                  Scanner Tool
                </label>
                <select
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-control px-3 py-2 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
                >
                  <option value="trivy">Trivy (SCA / Container)</option>
                  <option value="gitleaks">Gitleaks (Secrets)</option>
                  <option value="npm-audit">npm audit (Dependencies)</option>
                  <option value="semgrep">Semgrep (SAST)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-muted mb-1">
                  Security Check Type
                </label>
                <select
                  value={selectedScanType}
                  onChange={(e) => setSelectedScanType(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-control px-3 py-2 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
                >
                  <option value="SCA">SCA (Dependencies)</option>
                  <option value="Secret">Secret Scanning</option>
                  <option value="SAST">SAST (Static Analysis)</option>
                  <option value="Container">Container Image</option>
                  <option value="IaC">IaC Infrastructure</option>
                  <option value="DAST">DAST (Dynamic)</option>
                </select>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => {
                if (!file) fileInputRef.current?.click();
              }}
              onKeyDown={(e) => {
                if (!file && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role={file ? undefined : 'button'}
              tabIndex={file ? undefined : 0}
              aria-label={file ? undefined : 'Browse for a JSON scanner report'}
              className={`border-2 border-dashed rounded-card p-8 text-center transition-colors ${
                file
                  ? 'border-accent-cyan/60 bg-accent-cyan/5'
                  : 'border-dark-border hover:border-dark-muted bg-dark-bg/40 cursor-pointer focus:outline-none focus-visible:border-accent-cyan'
              }`}
            >
              <UploadCloud className="w-10 h-10 text-accent-cyan mx-auto mb-2 opacity-80" />
              {file ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-accent-cyan">{file.name}</p>
                  <p className="text-[11px] text-dark-muted font-mono">
                    {(file.size / 1024).toFixed(1)} KB • Ready for Ingestion
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="text-xs text-severity-critical hover:underline pt-1 block mx-auto"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-dark-text">
                    Drag and drop your scanner JSON report here
                  </p>
                  <p className="text-[11px] text-dark-muted">
                    Supports Trivy, Gitleaks, npm-audit, and Semgrep JSON files up to 10 MB
                  </p>
                  <span className="inline-block mt-3 px-3.5 py-1.5 bg-dark-raised hover:bg-dark-border text-dark-text text-xs font-semibold rounded-control">
                    Browse Local Files
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="sr-only"
                aria-label="Scanner JSON report"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading || !file}
              className="w-full py-2.5 bg-accent-cyan hover:bg-accent-cyan/90 text-dark-bg font-semibold rounded-control text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <span>Parsing & Evaluating Security Gate...</span>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  <span>Execute Ingestion & Gate Evaluation</span>
                </>
              )}
            </button>
          </form>

          {/* Import Summary Results Card */}
          {importSummary && (
            <div className="bg-dark-surface border border-accent-cyan/40 rounded-card p-6 space-y-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-dark-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-dark-text">
                    Scan Evaluation Report: {importSummary.project?.name}
                  </span>
                  <span className="font-mono text-xs text-accent-cyan bg-accent-cyan/15 px-2 py-0.5 rounded">
                    Score: {importSummary.project?.securityScore}/100
                  </span>
                </div>
                {importSummary.gateResult?.passed ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-accent-success/15 text-accent-success border border-accent-success/40 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>GATE PASSED</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-severity-critical/15 text-severity-critical border border-severity-critical/40 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>GATE FAILED</span>
                  </span>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded bg-dark-bg border border-dark-border">
                  <span className="text-xl font-mono font-bold text-dark-text">
                    {importSummary.summary?.totalParsed}
                  </span>
                  <span className="block text-[11px] text-dark-muted uppercase mt-0.5">
                    Total Findings
                  </span>
                </div>
                <div className="p-3 rounded bg-dark-bg border border-dark-border">
                  <span className="text-xl font-mono font-bold text-accent-cyan">
                    {importSummary.summary?.newFindings}
                  </span>
                  <span className="block text-[11px] text-dark-muted uppercase mt-0.5">
                    New Issues
                  </span>
                </div>
                <div className="p-3 rounded bg-dark-bg border border-dark-border">
                  <span className="text-xl font-mono font-bold text-severity-medium">
                    {importSummary.summary?.updatedFindings}
                  </span>
                  <span className="block text-[11px] text-dark-muted uppercase mt-0.5">
                    Updated
                  </span>
                </div>
                <div className="p-3 rounded bg-dark-bg border border-dark-border">
                  <span className="text-xl font-mono font-bold text-severity-critical">
                    {importSummary.summary?.reopenedFindings}
                  </span>
                  <span className="block text-[11px] text-dark-muted uppercase mt-0.5">
                    Reopened
                  </span>
                </div>
              </div>

              {/* Gate Policy Reason */}
              <div className="p-3 rounded bg-dark-bg/60 border border-dark-border text-xs space-y-1">
                <span className="font-semibold text-dark-text">Policy Status:</span>
                <p className="text-dark-muted leading-relaxed">
                  {importSummary.gateResult?.reason}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/vulnerabilities?project=${importSummary.project?._id}`)}
                  className="px-3 py-1.5 bg-accent-cyan text-dark-bg font-semibold text-xs rounded-control flex items-center gap-1.5"
                >
                  <span>Review Findings Inventory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info & Recent Ingestions */}
        <div className="space-y-5">
          {/* Format Reference */}
          <div className="bg-dark-surface border border-dark-border rounded-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-dark-muted">
              Supported CI/CD Scanners
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded bg-dark-bg/60 border border-dark-border">
                <span className="font-semibold text-dark-text block">Trivy (SCA / Container)</span>
                <span className="text-[11px] text-dark-muted font-mono">
                  trivy fs -f json -o report.json .
                </span>
              </div>
              <div className="p-2.5 rounded bg-dark-bg/60 border border-dark-border">
                <span className="font-semibold text-dark-text block">Gitleaks (Secret Leakage)</span>
                <span className="text-[11px] text-dark-muted font-mono">
                  gitleaks detect -f json -r report.json
                </span>
              </div>
              <div className="p-2.5 rounded bg-dark-bg/60 border border-dark-border">
                <span className="font-semibold text-dark-text block">npm audit (Dependencies)</span>
                <span className="text-[11px] text-dark-muted font-mono">
                  npm audit --json &gt; report.json
                </span>
              </div>
              <div className="p-2.5 rounded bg-dark-bg/60 border border-dark-border">
                <span className="font-semibold text-dark-text block">Semgrep (SAST Engine)</span>
                <span className="text-[11px] text-dark-muted font-mono">
                  semgrep scan --json -o report.json
                </span>
              </div>
            </div>
          </div>

          {/* Recent Ingestions */}
          <div className="bg-dark-surface border border-dark-border rounded-card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-dark-muted">
              Recent Scan Ingestions
            </h3>

            {isLoadingHistory ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-10 bg-dark-raised rounded" />
                <div className="h-10 bg-dark-raised rounded" />
              </div>
            ) : recentScans.length === 0 ? (
              <p className="text-xs text-dark-muted text-center py-4">
                No recent scans uploaded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentScans.map((sc) => (
                  <div
                    key={sc._id}
                    className="p-2.5 rounded bg-dark-bg/60 border border-dark-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-dark-text block">
                        {sc.project?.name || 'Project'}
                      </span>
                      <span className="text-[10px] text-dark-muted font-mono">
                        {sc.tool} ({sc.scanType}) • {sc.findingsCount} findings
                      </span>
                    </div>
                    <span className="text-[10px] text-accent-cyan font-mono">
                      {sc.ingestionMethod}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanImport;
