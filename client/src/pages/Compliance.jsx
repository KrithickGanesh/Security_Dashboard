import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Edit3,
  Shield,
  Layers,
  Sparkles,
  X,
  Save
} from 'lucide-react';
import complianceApi from '../api/compliance.api';
import projectsApi from '../api/projects.api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export const Compliance = () => {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState('');

  const [assessments, setAssessments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Edit Modal
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [editStatus, setEditStatus] = useState('Compliant');
  const [editScore, setEditScore] = useState(100);
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 1. Initial Load of Projects and Frameworks
  useEffect(() => {
    const initData = async () => {
      try {
        const [projRes, fwRes] = await Promise.all([
          projectsApi.getProjects({ limit: 100 }),
          complianceApi.getFrameworks()
        ]);

        if (projRes.success && projRes.data?.projects?.length > 0) {
          setProjects(projRes.data.projects);
          setSelectedProjectId(projRes.data.projects[0]._id);
        }

        if (fwRes.success && fwRes.data?.frameworks?.length > 0) {
          setFrameworks(fwRes.data.frameworks);
          setSelectedFrameworkId(fwRes.data.frameworks[0]._id);
        }
      } catch (err) {
        toast.error('Failed to load compliance data');
      }
    };

    initData();
  }, []);

  // 2. Fetch Assessments when Project or Framework changes
  const fetchAssessments = async () => {
    if (!selectedProjectId || !selectedFrameworkId) return;
    setIsLoading(true);
    try {
      const res = await complianceApi.getAssessments(selectedProjectId, selectedFrameworkId);
      if (res.success && res.data) {
        setAssessments(res.data.assessments || []);
        setSummary(res.data.summary);
      }
    } catch (err) {
      toast.error('Failed to fetch framework assessments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [selectedProjectId, selectedFrameworkId]);

  // Automated evaluation trigger
  const handleAutomatedEvaluate = async () => {
    if (!selectedProjectId) return;
    setIsEvaluating(true);
    try {
      const res = await complianceApi.evaluateProject(selectedProjectId);
      if (res.success) {
        toast.success(res.message || 'Compliance posture evaluated against active findings');
        fetchAssessments();
      }
    } catch (err) {
      toast.error('Automated evaluation failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (ass) => {
    setEditingAssessment(ass);
    setEditStatus(ass.status);
    setEditScore(ass.score || 0);
    setEditNotes(ass.evidenceNotes || '');
  };

  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    if (!editingAssessment) return;

    setIsSaving(true);
    try {
      const res = await complianceApi.updateAssessment(editingAssessment._id, {
        status: editStatus,
        score: parseInt(editScore, 10),
        evidenceNotes: editNotes
      });

      if (res.success) {
        toast.success('Assessment updated successfully');
        setEditingAssessment(null);
        fetchAssessments();
      }
    } catch (err) {
      toast.error('Failed to update assessment');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Compliant':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-success/15 text-accent-success border border-accent-success/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Compliant</span>
          </span>
        );
      case 'Non-Compliant':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-severity-critical/15 text-severity-critical border border-severity-critical/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>Non-Compliant</span>
          </span>
        );
      case 'Partially Compliant':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-severity-medium/15 text-severity-medium border border-severity-medium/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Partially Compliant</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-dark-raised text-dark-muted border border-dark-border">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Not Applicable</span>
          </span>
        );
    }
  };

  const canEdit = ['Admin', 'Security Analyst'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Top Header & Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-dark-text tracking-tight">
            Security Compliance & Governance Controls
          </h2>
          <p className="text-xs text-dark-muted mt-0.5">
            Continuous compliance posture mapped against OWASP Top 10, NIST CSF, CIS, ISO 27001, SOC 2, and PCI-DSS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[11px] text-dark-muted uppercase font-mono mb-1">
              Monitored Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-dark-surface border border-dark-border rounded-control px-3 py-1.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>

          {canEdit && (
            <div className="self-end">
              <button
                type="button"
                onClick={handleAutomatedEvaluate}
                disabled={isEvaluating}
                className="px-3.5 py-2 bg-accent-cyan hover:bg-accent-cyan/90 text-dark-bg font-semibold text-xs rounded-control flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Evaluate active findings against control CWE mappings"
              >
                <Sparkles className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
                <span>{isEvaluating ? 'Evaluating...' : 'Automated Mapping Check'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Framework Tabs */}
      <div className="flex border-b border-dark-border overflow-x-auto gap-2">
        {frameworks.map((fw) => (
          <button
            key={fw._id}
            onClick={() => setSelectedFrameworkId(fw._id)}
            className={`py-2.5 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              selectedFrameworkId === fw._id
                ? 'border-accent-cyan text-accent-cyan bg-dark-surface/50'
                : 'border-transparent text-dark-muted hover:text-dark-text'
            }`}
          >
            {fw.name} ({fw.code})
          </button>
        ))}
      </div>

      {/* Compliance Score Summary Card */}
      {summary && (
        <div className="bg-gradient-to-r from-dark-surface to-dark-raised border border-dark-border rounded-card p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Progress Circular Display */}
            <div className="relative w-24 h-24 flex items-center justify-center rounded-full border-4 border-dark-border bg-dark-bg">
              <div
                className={`text-2xl font-bold font-mono ${
                  summary.complianceScore >= 80
                    ? 'text-accent-success'
                    : summary.complianceScore >= 50
                    ? 'text-severity-medium'
                    : 'text-severity-critical'
                }`}
              >
                {summary.complianceScore}%
              </div>
              <span className="absolute bottom-2 text-[9px] font-mono text-dark-muted uppercase">
                Score
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-dark-text">
                Framework Compliance Index
              </h3>
              <p className="text-xs text-dark-muted max-w-md leading-relaxed">
                Aggregated posture evaluated across {summary.totalControls} standardized controls.
                Deficiencies indicate active unresolved vulnerabilities matching designated control domains.
              </p>
            </div>
          </div>

          {/* Breakdown Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center w-full md:w-auto">
            <div className="p-2.5 rounded bg-dark-bg/60 border border-dark-border">
              <span className="text-lg font-mono font-bold text-accent-success">
                {summary.compliant}
              </span>
              <span className="block text-[10px] text-dark-muted uppercase">Compliant</span>
            </div>
            <div className="p-2.5 rounded bg-dark-bg/60 border border-dark-border">
              <span className="text-lg font-mono font-bold text-severity-critical">
                {summary.nonCompliant}
              </span>
              <span className="block text-[10px] text-dark-muted uppercase">Non-Compliant</span>
            </div>
            <div className="p-2.5 rounded bg-dark-bg/60 border border-dark-border">
              <span className="text-lg font-mono font-bold text-severity-medium">
                {summary.partiallyCompliant}
              </span>
              <span className="block text-[10px] text-dark-muted uppercase">Partial</span>
            </div>
            <div className="p-2.5 rounded bg-dark-bg/60 border border-dark-border">
              <span className="text-lg font-mono font-bold text-dark-muted">
                {summary.notApplicable}
              </span>
              <span className="block text-[10px] text-dark-muted uppercase">N/A</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls Table */}
      <div className="bg-dark-surface border border-dark-border rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-bg/60 border-b border-dark-border text-dark-muted font-mono uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Control ID</th>
                <th className="p-3.5">Title & Description</th>
                <th className="p-3.5">Domain</th>
                <th className="p-3.5">Mapped Vulnerabilities</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Evidence & Notes</th>
                {canEdit && <th className="p-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="p-8 text-center text-dark-muted">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                      <span>Loading compliance assessments...</span>
                    </div>
                  </td>
                </tr>
              ) : assessments.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="p-10 text-center text-dark-muted">
                    <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-dark-text">No Controls Defined</p>
                    <p className="text-xs text-dark-muted mt-1">
                      No controls associated with this framework yet.
                    </p>
                  </td>
                </tr>
              ) : (
                assessments.map((ass) => (
                  <tr key={ass._id} className="hover:bg-dark-raised/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-accent-cyan whitespace-nowrap">
                      {ass.control?.controlId || 'CTRL'}
                    </td>

                    <td className="p-3.5 max-w-xs">
                      <span className="font-semibold text-dark-text block">
                        {ass.control?.title}
                      </span>
                      {ass.control?.description && (
                        <span className="text-[11px] text-dark-muted line-clamp-2 mt-0.5 leading-relaxed">
                          {ass.control.description}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-dark-bg border border-dark-border text-dark-muted">
                        {ass.control?.domain || 'General'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {ass.mappedVulnerabilities?.length > 0 ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-severity-critical text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{ass.mappedVulnerabilities.length} active issues</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {ass.mappedVulnerabilities.slice(0, 3).map((v) => (
                              <span
                                key={v._id}
                                className="font-mono text-[10px] bg-severity-critical/10 text-severity-critical px-1.5 py-0.5 rounded"
                              >
                                {v.cve || 'ISSUE'}
                              </span>
                            ))}
                            {ass.mappedVulnerabilities.length > 3 && (
                              <span className="text-[10px] text-dark-muted">
                                +{ass.mappedVulnerabilities.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-accent-success font-mono text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>No breaches</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {getStatusBadge(ass.status)}
                    </td>

                    <td className="p-3.5 max-w-xs">
                      <p className="text-[11px] text-dark-muted line-clamp-2 leading-relaxed">
                        {ass.evidenceNotes || 'No audit notes attached.'}
                      </p>
                      {ass.evaluatedBy && (
                        <span className="text-[10px] text-accent-cyan font-mono block mt-0.5">
                          Audit by {ass.evaluatedBy.name}
                        </span>
                      )}
                    </td>

                    {canEdit && (
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(ass)}
                          className="px-2.5 py-1 text-xs text-accent-cyan hover:bg-accent-cyan/10 border border-accent-cyan/30 rounded inline-flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Assessment Evidence Modal */}
      {editingAssessment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-assessment-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingAssessment(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditingAssessment(null);
          }}
        >
          <div className="max-w-md w-full bg-dark-surface border border-dark-border rounded-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-accent-cyan">
                  {editingAssessment.control?.controlId}
                </span>
                <h3 id="edit-assessment-title" className="text-sm font-bold text-dark-text mt-0.5">
                  Update Control Evidence
                </h3>
              </div>
              <button
                onClick={() => setEditingAssessment(null)}
                aria-label="Close assessment editor"
                className="text-dark-muted hover:text-dark-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssessment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-dark-muted mb-1">
                  Compliance Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => {
                    setEditStatus(e.target.value);
                    if (e.target.value === 'Compliant') setEditScore(100);
                    else if (e.target.value === 'Partially Compliant') setEditScore(50);
                    else if (e.target.value === 'Non-Compliant') setEditScore(0);
                    else if (e.target.value === 'Not Applicable') setEditScore(0);
                  }}
                  className="w-full bg-dark-bg border border-dark-border rounded-control px-3 py-2 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
                >
                  <option value="Compliant">Compliant</option>
                  <option value="Partially Compliant">Partially Compliant</option>
                  <option value="Non-Compliant">Non-Compliant</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-muted mb-1">
                  Control Score (0 - 100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-control px-3 py-1.5 text-xs text-dark-text font-mono focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-dark-muted mb-1">
                  Evidence Notes & Audit Justification
                </label>
                <textarea
                  rows={3}
                  required
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Document architectural controls, encryption standards, or compensating measures..."
                  className="w-full bg-dark-bg border border-dark-border rounded-control p-2.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAssessment(null)}
                  className="px-3 py-1.5 text-xs text-dark-muted hover:text-dark-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-accent-cyan text-dark-bg text-xs font-semibold rounded-control flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Assessment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compliance;
