import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Command,
  UploadCloud,
  FileSpreadsheet,
  SunMedium,
  Bug
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getSearchableItemsForRole } from './navigation';

/**
 * Cmd/Ctrl+K command palette: route navigation + a few quick actions.
 */
export const CommandPalette = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleTheme } = useTheme();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const commands = useMemo(() => {
    const role = user?.role || 'Developer';

    const navCommands = getSearchableItemsForRole(role).map((item) => ({
      id: `nav-${item.path}`,
      label: item.name,
      hint: item.description,
      group: 'Navigate',
      icon: item.icon,
      run: () => navigate(item.path)
    }));

    const actions = [];

    if (['Admin', 'Security Analyst'].includes(role)) {
      actions.push({
        id: 'action-import',
        label: 'Import scan report',
        hint: 'Upload a Trivy, Snyk or Gitleaks report',
        group: 'Actions',
        icon: UploadCloud,
        run: () => navigate('/scans/import')
      });
    }

    actions.push(
      {
        id: 'action-reports',
        label: 'Export a report',
        hint: 'Download CSV or PDF compliance reports',
        group: 'Actions',
        icon: FileSpreadsheet,
        run: () => navigate('/reports')
      },
      {
        id: 'action-theme',
        label: 'Toggle theme',
        hint: 'Switch between dark and light appearance',
        group: 'Actions',
        icon: SunMedium,
        run: () => toggleTheme()
      }
    );

    const term = query.trim();
    const searchCommand = term
      ? [
          {
            id: 'action-search',
            label: `Search vulnerabilities for “${term}”`,
            hint: 'Open the vulnerability workspace with this query',
            group: 'Actions',
            icon: Bug,
            run: () => navigate(`/vulnerabilities?search=${encodeURIComponent(term)}`)
          }
        ]
      : [];

    return [...searchCommand, ...navCommands, ...actions];
  }, [user?.role, query, navigate, toggleTheme]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return commands;
    // The generated search command is already query-specific; keep it pinned.
    return commands.filter(
      (cmd) =>
        cmd.id === 'action-search' ||
        cmd.label.toLowerCase().includes(term) ||
        cmd.hint?.toLowerCase().includes(term)
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    // Autofocus after the dialog mounts
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the highlighted row in view
  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) =>
        filtered.length ? (i - 1 + filtered.length) % filtered.length : 0
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const command = filtered[activeIndex];
      if (command) {
        onClose();
        command.run();
      }
    }
  };

  // Group preserving first-seen order
  const groups = filtered.reduce((acc, cmd) => {
    const existing = acc.find((g) => g.name === cmd.group);
    if (existing) existing.items.push(cmd);
    else acc.push({ name: cmd.group, items: [cmd] });
    return acc;
  }, []);

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/60 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-card border border-dark-border bg-dark-surface shadow-raised animate-scale-in"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-dark-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-dark-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions, vulnerabilities…"
            aria-label="Search commands"
            className="w-full bg-transparent text-sm text-dark-text placeholder:text-dark-muted/70 focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-dark-border bg-dark-raised px-1.5 py-0.5 text-[10px] text-dark-muted sm:block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto scroll-thin py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-dark-muted">
              No matches for “{query}”.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.name} className="py-1">
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-dark-muted/80">
                  {group.name}
                </p>
                {group.items.map((cmd) => {
                  flatIndex += 1;
                  const index = flatIndex;
                  const Icon = cmd.icon;
                  const isActive = index === activeIndex;

                  return (
                    <button
                      type="button"
                      key={cmd.id}
                      data-index={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        onClose();
                        cmd.run();
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-accent-cyan/10' : 'hover:bg-dark-raised/60'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                          isActive
                            ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
                            : 'border-dark-border bg-dark-raised text-dark-muted'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-dark-text">
                          {cmd.label}
                        </span>
                        {cmd.hint && (
                          <span className="block truncate text-[11px] text-dark-muted">
                            {cmd.hint}
                          </span>
                        )}
                      </span>
                      {isActive && (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-dark-muted" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-dark-border bg-dark-raised/30 px-4 py-2 text-[10px] text-dark-muted">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              open
            </span>
          </span>
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
