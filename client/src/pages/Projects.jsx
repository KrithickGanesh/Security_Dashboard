import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  Search,
  Grid,
  List,
  Shield,
  ShieldAlert,
  GitBranch,
  ExternalLink,
  Users,
  AlertTriangle,
  SlidersHorizontal,
  X
} from 'lucide-react';
import projectsApi from '../api/projects.api';
import SeverityBadge from '../components/common/SeverityBadge';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [search, setSearch] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [criticality, setCriticality] = useState('Medium');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await projectsApi.getProjects({
        search,
        criticality: criticalityFilter,
        limit: 100
      });
      if (res.success && res.data?.projects) {
        setProjects(res.data.projects);
      }
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, criticalityFilter]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await projectsApi.createProject({
        name,
        key: key.toUpperCase(),
        description,
        criticality,
        repositoryUrl
      });
      if (res.success) {
        toast.success('Project created successfully');
        setIsCreateModalOpen(false);
        setName('');
        setKey('');
        setDescription('');
        setRepositoryUrl('');
        setCriticality('Medium');
        fetchProjects();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-accent-success border-accent-success/40 bg-accent-success/15';
    if (score >= 65) return 'text-severity-medium border-severity-medium/40 bg-severity-medium/15';
    return 'text-severity-critical border-severity-critical/40 bg-severity-critical/15';
  };

  const canCreate = ['Admin', 'Security Analyst'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-dark-text tracking-tight">
            Projects Portfolio
          </h2>
          <p className="text-xs text-dark-muted mt-0.5">
            Monitored applications, microservices, and active codebases.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 py-2 bg-accent-cyan hover:bg-accent-cyan/90 text-dark-bg font-semibold text-xs rounded-control flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Register Project</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-dark-surface border border-dark-border rounded-control p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'cards'
                  ? 'bg-dark-raised text-accent-cyan'
                  : 'text-dark-muted hover:text-dark-text'
              }`}
              title="Cards View"
              aria-label="Cards view"
              aria-pressed={viewMode === 'cards'}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-dark-raised text-accent-cyan'
                  : 'text-dark-muted hover:text-dark-text'
              }`}
              title="Table View"
              aria-label="Table view"
              aria-pressed={viewMode === 'table'}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-dark-surface border border-dark-border rounded-card p-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-dark-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, key, or description..."
            className="w-full bg-dark-bg border border-dark-border rounded-control pl-9 pr-3 py-1.5 text-xs text-dark-text placeholder-dark-muted/50 focus:outline-none focus:border-accent-cyan"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={criticalityFilter}
            onChange={(e) => setCriticalityFilter(e.target.value)}
            className="w-full sm:w-auto bg-dark-bg border border-dark-border rounded-control px-3 py-1.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
          >
            <option value="">All Criticalities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Projects Grid/Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-dark-surface border border-dark-border rounded-card" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-dark-surface border border-dark-border rounded-card p-12 text-center">
          <FolderGit2 className="w-12 h-12 text-dark-muted mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-dark-text">No Projects Found</h3>
          <p className="text-xs text-dark-muted max-w-sm mx-auto mt-1">
            {search || criticalityFilter
              ? 'No projects matched the current search criteria.'
              : 'No projects registered in the dashboard. Register a project or ingest a scan via webhook.'}
          </p>
          {canCreate && !search && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-3 py-1.5 bg-accent-cyan text-dark-bg text-xs font-semibold rounded-control inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register First Project</span>
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => {
            const counts = proj.vulnerabilityCounts || { Critical: 0, High: 0, Medium: 0, Low: 0, total: 0 };
            return (
              <div
                key={proj._id}
                className="bg-dark-surface border border-dark-border hover:border-accent-cyan/50 rounded-card p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded border border-accent-cyan/20">
                          {proj.key}
                        </span>
                        <span className="text-[11px] text-dark-muted">
                          {proj.criticality} Tier
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-dark-text mt-1.5 truncate group-hover:text-accent-cyan transition-colors">
                        {proj.name}
                      </h3>
                    </div>

                    <div
                      className={`px-2.5 py-1 rounded-card border font-mono font-bold text-xs ${getScoreColor(
                        proj.securityScore
                      )}`}
                      title="Security Posture Score"
                    >
                      {proj.securityScore}/100
                    </div>
                  </div>

                  <p className="text-xs text-dark-muted line-clamp-2 mt-2 leading-relaxed">
                    {proj.description || 'No description provided for this project.'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-dark-border/60 space-y-3">
                  {/* Severity Mini-Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-dark-muted mb-1">
                      <span>Open Findings: {counts.total}</span>
                      <span className="text-severity-critical font-bold">{counts.Critical} Crit</span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-dark-bg">
                      {[
                        { key: 'Critical', tone: 'bg-severity-critical' },
                        { key: 'High', tone: 'bg-severity-high' },
                        { key: 'Medium', tone: 'bg-severity-medium' },
                        { key: 'Low', tone: 'bg-severity-low' }
                      ].map(({ key: severityKey, tone }) => {
                        const value = counts[severityKey] || 0;
                        if (!value) return null;
                        const pct = counts.total > 0 ? (value / counts.total) * 100 : 0;
                        return (
                          <div
                            key={severityKey}
                            className={tone}
                            style={{ width: `${pct}%` }}
                            title={`${value} ${severityKey}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Stats & Navigation */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[10px] text-dark-muted font-mono">
                      Last scan:{' '}
                      {proj.lastScanAt ? new Date(proj.lastScanAt).toLocaleDateString() : 'Never'}
                    </span>
                    <button
                      onClick={() => navigate(`/vulnerabilities?project=${proj._id}`)}
                      className="text-xs text-accent-cyan hover:underline font-medium flex items-center gap-1"
                    >
                      <span>Findings</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-dark-surface border border-dark-border rounded-card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-bg/60 border-b border-dark-border text-dark-muted font-mono uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Key</th>
                <th className="p-3.5">Project Name</th>
                <th className="p-3.5">Criticality</th>
                <th className="p-3.5">Score</th>
                <th className="p-3.5">Open Findings</th>
                <th className="p-3.5">Last Scanned</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/60">
              {projects.map((proj) => {
                const counts = proj.vulnerabilityCounts || { Critical: 0, High: 0, total: 0 };
                return (
                  <tr key={proj._id} className="hover:bg-dark-raised/40 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-accent-cyan">{proj.key}</td>
                    <td className="p-3.5 font-semibold text-dark-text">{proj.name}</td>
                    <td className="p-3.5 text-dark-muted">{proj.criticality}</td>
                    <td className="p-3.5 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getScoreColor(proj.securityScore)}`}>
                        {proj.securityScore}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="text-dark-text">{counts.total} total</span>{' '}
                      {counts.Critical > 0 && (
                        <span className="text-severity-critical font-bold">({counts.Critical} crit)</span>
                      )}
                    </td>
                    <td className="p-3.5 text-dark-muted font-mono">
                      {proj.lastScanAt ? new Date(proj.lastScanAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => navigate(`/vulnerabilities?project=${proj._id}`)}
                        className="text-xs text-accent-cyan hover:underline font-medium"
                      >
                        View Vulnerabilities
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-project-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsCreateModalOpen(false);
          }}
        >
          <div className="max-w-md w-full bg-dark-surface border border-dark-border rounded-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <h3 id="create-project-title" className="text-sm font-bold text-dark-text">
                Register New Project
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close create project dialog"
                className="text-dark-muted hover:text-dark-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div>
                <label htmlFor="project-name" className="block text-xs font-medium text-dark-muted mb-1">Project Name</label>
                <input
                  id="project-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!key) {
                      setKey(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase());
                    }
                  }}
                  placeholder="e.g., Payment Gateway"
                  className="w-full bg-dark-bg border border-dark-border rounded-control px-3 py-1.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label htmlFor="project-key" className="block text-xs font-medium text-dark-muted mb-1">Project Key (Unique identifier)</label>
                <input
                  id="project-key"
                  type="text"
                  required
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  placeholder="PAY-GW"
                  className="w-full bg-dark-bg border border-dark-border rounded-control px-3 py-1.5 text-xs text-dark-text font-mono focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label htmlFor="project-criticality" className="block text-xs font-medium text-dark-muted mb-1">Criticality Tier</label>
                <select
                  id="project-criticality"
                  value={criticality}
                  onChange={(e) => setCriticality(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-control px-3 py-1.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
                >
                  <option value="Critical">Critical (Tier 1 - Customer facing / Financial)</option>
                  <option value="High">High (Tier 2 - Internal core services)</option>
                  <option value="Medium">Medium (Tier 3 - Standard applications)</option>
                  <option value="Low">Low (Tier 4 - Non-production / Tools)</option>
                </select>
              </div>

              <div>
                <label htmlFor="project-repository" className="block text-xs font-medium text-dark-muted mb-1">Git Repository URL</label>
                <input
                  id="project-repository"
                  type="url"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  placeholder="https://github.com/organization/payment-service"
                  className="w-full bg-dark-bg border border-dark-border rounded-control px-3 py-1.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label htmlFor="project-description" className="block text-xs font-medium text-dark-muted mb-1">Description</label>
                <textarea
                  id="project-description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Service architecture and scope notes..."
                  className="w-full bg-dark-bg border border-dark-border rounded-control p-2.5 text-xs text-dark-text focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-dark-muted hover:text-dark-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-accent-cyan text-dark-bg text-xs font-semibold rounded-control disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
