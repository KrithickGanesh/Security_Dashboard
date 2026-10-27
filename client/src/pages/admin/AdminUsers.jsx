import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Users,
  UserPlus,
  Search,
  Lock,
  Unlock,
  LogOut,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Loader2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../../api/admin.api';

const ROLES = ['Admin', 'Security Analyst', 'Developer', 'Auditor'];

const ROLE_BADGE = {
  Admin: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  'Security Analyst': 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  Developer: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  Auditor: 'border-violet-500/25 bg-violet-500/10 text-violet-300'
};

function ModalShell({ onClose, labelledBy, children, maxWidth = 'max-w-md' }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-card border border-dark-border bg-dark-surface shadow-raised scroll-thin animate-scale-in ${maxWidth}`}
      >
        {children}
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Developer'
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'Developer',
    isActive: true
  });

  // Queries
  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getDashboardStats
  });

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-users', { page, search, role: roleFilter, isActive: statusFilter }],
    queryFn: () =>
      adminApi.getUsers({ page, limit: 12, search, role: roleFilter, isActive: statusFilter }),
    placeholderData: keepPreviousData
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      invalidate();
      toast.success('User account created successfully');
      setShowCreateModal(false);
      setNewUser({ name: '', email: '', password: '', role: 'Developer' });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: payload }) => adminApi.updateUser(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('User updated successfully');
      setShowEditModal(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update user');
    }
  });

  const unlockMutation = useMutation({
    mutationFn: adminApi.unlockUser,
    onSuccess: (res) => {
      invalidate();
      toast.success(res.message || 'Account unlocked');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to unlock user');
    }
  });

  const forceLogoutMutation = useMutation({
    mutationFn: adminApi.forceLogout,
    onSuccess: (res) => {
      invalidate();
      toast.success(res.message || 'User sessions terminated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to terminate session');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: (res) => {
      invalidate();
      toast.success(res.message || 'User removed');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  });

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    setShowEditModal(true);
  };

  const users = data?.users || [];
  const pagination = data?.pagination;

  const stats = [
    {
      label: 'Total users',
      value: statsData?.totalUsers ?? '—',
      hint: 'Registered accounts',
      icon: Users,
      tone: 'text-dark-text',
      tile: 'border-dark-border bg-dark-raised text-dark-muted'
    },
    {
      label: 'Active users',
      value: statsData?.activeUsers ?? '—',
      hint: 'Permitted logins',
      icon: CheckCircle2,
      tone: 'text-emerald-400',
      tile: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
    },
    {
      label: 'Locked accounts',
      value: statsData?.lockedUsers ?? '—',
      hint: '5+ failed attempts',
      icon: Lock,
      tone: 'text-severity-critical',
      tile: 'border-severity-critical/25 bg-severity-critical/10 text-severity-critical'
    },
    {
      label: 'Roles active',
      value: ROLES.filter((role) => statsData?.usersByRole?.[role]).length || '—',
      hint: 'Enforced across routes',
      icon: ShieldCheck,
      tone: 'text-accent-cyan',
      tile: 'border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan'
    }
  ];

  return (
    <div className="page animate-fade-in">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="page-title mt-1 flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-cyan" />
            Users &amp; access
          </h1>
          <p className="page-subtitle">
            Manage accounts, RBAC roles, credential state and account lockouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-secondary"
            aria-label="Refresh user directory"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary">
            <UserPlus className="h-4 w-4" />
            Add user
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dark-muted">
                  {item.label}
                </p>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border ${item.tile}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className={`mt-2 font-mono text-2xl font-semibold tracking-tight ${item.tone}`}>
                {item.value}
              </p>
              <p className="mt-1 text-[10.5px] text-dark-muted">{item.hint}</p>
            </div>
          );
        })}
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
            placeholder="Search by name or email…"
            aria-label="Search users"
            className="input py-2 pl-9 text-xs"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
            className="select py-2 text-xs sm:w-44"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="select py-2 text-xs sm:w-44"
          >
            <option value="">All statuses</option>
            <option value="true">Active only</option>
            <option value="false">Deactivated only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-control bg-dark-raised" />
            ))}
          </div>
        ) : isError ? (
          <div className="empty-state py-14">
            <ShieldAlert className="h-6 w-6 text-severity-critical" />
            <p className="text-sm font-medium text-dark-text">Failed to load the user directory</p>
            <p className="text-xs text-dark-muted">Check the API connection and try again.</p>
            <button type="button" onClick={() => refetch()} className="btn-secondary mt-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state py-14">
            <Users className="h-6 w-6 text-dark-muted/60" />
            <p className="text-sm font-medium text-dark-text">No users match these filters</p>
            <p className="text-xs text-dark-muted">Adjust the search term, role or status filter.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
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
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Registered</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-cyan/25 bg-accent-cyan/10 text-[11px] font-semibold text-accent-cyan">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-dark-text">{user.name}</span>
                            {user.isLocked && (
                              <span className="badge border-severity-critical/25 bg-severity-critical/10 text-severity-critical">
                                <Lock className="h-2.5 w-2.5" />
                                Locked
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[10.5px] text-dark-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          ROLE_BADGE[user.role] || 'border-dark-border bg-dark-raised text-dark-muted'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td>
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-dark-muted">
                          <XCircle className="h-3.5 w-3.5" />
                          Deactivated
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap font-mono text-[10.5px] text-dark-muted">
                      {user.lastLogin
                        ? format(new Date(user.lastLogin), 'MMM d, yyyy HH:mm')
                        : 'Never'}
                    </td>

                    <td className="whitespace-nowrap font-mono text-[10.5px] text-dark-muted">
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '—'}
                    </td>

                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {user.isLocked && (
                          <button
                            type="button"
                            onClick={() => unlockMutation.mutate(user._id)}
                            disabled={unlockMutation.isPending}
                            title="Unlock account"
                            aria-label={`Unlock ${user.name}`}
                            className="rounded-md border border-severity-critical/35 bg-severity-critical/10 p-1.5 text-severity-critical transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-50"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => forceLogoutMutation.mutate(user._id)}
                          disabled={forceLogoutMutation.isPending}
                          title="Force session logout"
                          aria-label={`Force logout ${user.name}`}
                          className="rounded-md border border-dark-border p-1.5 text-dark-muted transition-colors hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-400 disabled:opacity-50"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditClick(user)}
                          title="Edit user"
                          aria-label={`Edit ${user.name}`}
                          className="rounded-md border border-dark-border p-1.5 text-dark-muted transition-colors hover:border-accent-cyan/40 hover:bg-accent-cyan/10 hover:text-accent-cyan"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(user)}
                          title="Delete user"
                          aria-label={`Delete ${user.name}`}
                          className="rounded-md border border-dark-border p-1.5 text-dark-muted transition-colors hover:border-severity-critical/40 hover:bg-severity-critical/10 hover:text-severity-critical"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
              <span className="font-mono text-dark-text">{pagination.total}</span> users
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

      {/* Create user modal */}
      {showCreateModal && (
        <ModalShell onClose={() => setShowCreateModal(false)} labelledBy="create-user-title">
          <div className="flex items-start justify-between gap-3 border-b border-dark-border px-5 py-4">
            <div>
              <h3
                id="create-user-title"
                className="flex items-center gap-2 text-sm font-semibold text-dark-text"
              >
                <UserPlus className="h-4 w-4 text-accent-cyan" />
                Provision user account
              </h3>
              <p className="mt-1 text-[11px] text-dark-muted">
                Create credentials and assign an RBAC security role.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-icon h-8 w-8"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(newUser);
            }}
            className="space-y-3.5 px-5 py-4"
          >
            <div>
              <label htmlFor="new-user-name" className="label">
                Full name
              </label>
              <input
                id="new-user-name"
                type="text"
                required
                autoComplete="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="e.g. Alex Mercer"
                className="input text-xs"
              />
            </div>

            <div>
              <label htmlFor="new-user-email" className="label">
                Email address
              </label>
              <input
                id="new-user-email"
                type="email"
                required
                autoComplete="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="alex.mercer@company.com"
                className="input text-xs"
              />
            </div>

            <div>
              <label htmlFor="new-user-password" className="label">
                Temporary password
              </label>
              <input
                id="new-user-password"
                type="password"
                required
                autoComplete="new-password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Min 8 chars, upper, lower, digit, symbol"
                className="input text-xs"
              />
            </div>

            <div>
              <label htmlFor="new-user-role" className="label">
                RBAC role
              </label>
              <select
                id="new-user-role"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="select text-xs"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 border-t border-dark-border pt-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Edit user modal */}
      {showEditModal && selectedUser && (
        <ModalShell onClose={() => setShowEditModal(false)} labelledBy="edit-user-title">
          <div className="flex items-start justify-between gap-3 border-b border-dark-border px-5 py-4">
            <div className="min-w-0">
              <h3
                id="edit-user-title"
                className="flex items-center gap-2 text-sm font-semibold text-dark-text"
              >
                <Edit2 className="h-4 w-4 text-accent-cyan" />
                Edit user
              </h3>
              <p className="mt-1 truncate font-mono text-[10.5px] text-dark-muted">
                {selectedUser.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="btn-icon h-8 w-8"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ id: selectedUser._id, data: editFormData });
            }}
            className="space-y-3.5 px-5 py-4"
          >
            <div>
              <label htmlFor="edit-user-name" className="label">
                Name
              </label>
              <input
                id="edit-user-name"
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label htmlFor="edit-user-email" className="label">
                Email
              </label>
              <input
                id="edit-user-email"
                type="email"
                required
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label htmlFor="edit-user-role" className="label">
                Role
              </label>
              <select
                id="edit-user-role"
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                className="select text-xs"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <label
              htmlFor="edit-user-active"
              className="flex cursor-pointer items-start gap-2.5 rounded-control border border-dark-border bg-dark-bg/40 px-3 py-2.5"
            >
              <input
                id="edit-user-active"
                type="checkbox"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="checkbox mt-0.5"
              />
              <span>
                <span className="block text-[11.5px] font-medium text-dark-text">Account active</span>
                <span className="block text-[10.5px] text-dark-muted">
                  Uncheck to suspend all login permissions for this user.
                </span>
              </span>
            </label>

            <div className="flex justify-end gap-2 border-t border-dark-border pt-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ModalShell onClose={() => setDeleteTarget(null)} labelledBy="delete-user-title">
          <div className="flex items-start gap-3 border-b border-dark-border px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-severity-critical/25 bg-severity-critical/10 text-severity-critical">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 id="delete-user-title" className="text-sm font-semibold text-dark-text">
                Delete user permanently?
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-dark-muted">
                <span className="font-medium text-dark-text">{deleteTarget.name}</span> (
                {deleteTarget.email}) will lose access immediately. This action cannot be undone,
                but the audit trail is retained.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 py-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(deleteTarget._id)}
              disabled={deleteMutation.isPending}
              className="btn-danger"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete user
                </>
              )}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
