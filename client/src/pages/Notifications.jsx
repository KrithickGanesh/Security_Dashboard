import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Filter,
  CheckCheck
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import notificationsApi from '../api/notifications.api';
import SeverityBadge from '../components/common/SeverityBadge';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const Notifications = () => {
  const navigate = useNavigate();
  const { refreshNotifications } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const res = await notificationsApi.getNotifications({
        limit: 50,
        unreadOnly
      });
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
      }
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [unreadOnly]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      refreshNotifications();
    } catch {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      refreshNotifications();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to update notifications');
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      refreshNotifications();
      toast.success('Notification removed');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to remove notification');
    }
  };

  // Group notifications by date (Today, Yesterday, Earlier)
  const groupNotifications = (list) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const groups = { Today: [], Yesterday: [], Earlier: [] };

    list.forEach((item) => {
      const itemDate = new Date(item.createdAt).toDateString();
      if (itemDate === today) {
        groups.Today.push(item);
      } else if (itemDate === yesterday) {
        groups.Yesterday.push(item);
      } else {
        groups.Earlier.push(item);
      }
    });

    return groups;
  };

  const grouped = groupNotifications(notifications);
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-dark-text tracking-tight">
            Security Notifications Center
          </h2>
          <p className="text-xs text-dark-muted mt-0.5">
            Real-time feed of CI/CD pipeline gate failures, critical findings, and remediation SLA alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 rounded-control text-xs font-medium border transition-colors ${
              unreadOnly
                ? 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/40 font-semibold'
                : 'bg-dark-surface border-dark-border text-dark-muted hover:text-dark-text'
            }`}
          >
            {unreadOnly ? 'Showing Unread Only' : 'Show All'}
          </button>

          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={!hasUnread}
            className="px-3 py-1.5 bg-dark-raised hover:bg-dark-border text-dark-text text-xs font-semibold rounded-control flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-dark-surface rounded-card border border-dark-border" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-dark-surface border border-dark-border rounded-card p-12 text-center">
            <Bell className="w-12 h-12 text-dark-muted mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-semibold text-dark-text">No Notifications</h3>
            <p className="text-xs text-dark-muted mt-1">
              {unreadOnly
                ? 'All notifications have been reviewed.'
                : 'You are all caught up! No active security alerts or notifications.'}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([period, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={period} className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-dark-muted px-1 block font-semibold">
                  {period}
                </span>

                <div className="bg-dark-surface border border-dark-border rounded-card divide-y divide-dark-border/50 overflow-hidden">
                  {items.map((n) => (
                    <div
                      key={n._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!n.isRead) handleMarkAsRead(n._id);
                        if (n.link) navigate(n.link);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!n.isRead) handleMarkAsRead(n._id);
                          if (n.link) navigate(n.link);
                        }
                      }}
                      aria-label={`${n.isRead ? 'Read' : 'Unread'} notification: ${n.title}`}
                      className={`p-4 flex items-start justify-between gap-4 transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-cyan/60 ${
                        !n.isRead
                          ? 'bg-accent-cyan/5 hover:bg-accent-cyan/10'
                          : 'hover:bg-dark-raised/50'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="pt-0.5 shrink-0">
                          <SeverityBadge severity={n.severity || 'Info'} size="xs" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-xs font-semibold truncate ${
                                !n.isRead ? 'text-accent-cyan' : 'text-dark-text'
                              }`}
                            >
                              {n.title}
                            </h4>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-accent-cyan shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className="text-xs text-dark-muted leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-dark-muted font-mono block">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(n._id)}
                            className="p-1 rounded text-dark-muted hover:text-accent-success hover:bg-dark-raised"
                            title="Mark as read"
                            aria-label={`Mark “${n.title}” as read`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(n)}
                          className="p-1 rounded text-dark-muted hover:text-severity-critical hover:bg-dark-raised"
                          title="Delete notification"
                          aria-label={`Delete “${n.title}”`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-notification-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setDeleteTarget(null);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-card border border-dark-border bg-dark-surface shadow-2xl">
            <div className="flex items-start gap-3 border-b border-dark-border px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-severity-critical/25 bg-severity-critical/10 text-severity-critical">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 id="delete-notification-title" className="text-sm font-semibold text-dark-text">
                  Delete this notification?
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-dark-muted">
                  <span className="font-medium text-dark-text">{deleteTarget.title}</span> will be
                  permanently removed from your inbox.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget._id)}
                className="btn-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
