import Notification from '../models/Notification.js';
import Alert from '../models/Alert.js';
import User from '../models/User.js';
import { emitToUser, broadcastSecurityAlert } from '../sockets/socket.js';
import { sendEmail } from '../utils/email.js';
import logger from '../utils/logger.js';

export class NotificationService {
  /**
   * Create and deliver a notification via DB persistence, WebSocket, and optional Email.
   */
  async createNotification({
    userId,
    type,
    title,
    message,
    severity = 'Info',
    link = '',
    sendEmailAlert = false
  }) {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      severity,
      link,
      isRead: false
    });

    // Real-time WebSocket delivery to private user room
    emitToUser(userId, 'notification', notification);

    // Email dispatch for critical events or explicitly requested alerts
    const isCritical = severity === 'Critical' || type === 'PIPELINE_GATE_FAILED' || type === 'SLA_BREACH';
    if (sendEmailAlert || isCritical) {
      try {
        const recipient = await User.findById(userId);
        if (recipient && recipient.notificationPreferences?.email !== false) {
          await sendEmail({
            to: recipient.email,
            subject: `[DevSecOps Alert] ${title}`,
            text: `${message}\n\nReview link: ${process.env.CLIENT_URL || 'http://localhost:5173'}${link}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; background: #0B1220; color: #E6EDF7; border-radius: 8px;">
                <h3 style="color: ${severity === 'Critical' ? '#EF4444' : '#22D3EE'}; margin-top: 0;">${title}</h3>
                <p style="font-size: 14px; line-height: 1.5;">${message}</p>
                <div style="margin: 20px 0;">
                  <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}${link}" style="background: #22D3EE; color: #0B1220; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 4px;">View In Dashboard</a>
                </div>
              </div>
            `
          });
        }
      } catch (err) {
        logger.error(`Failed to send email notification to user ${userId}: ${err.message}`);
      }
    }

    return notification;
  }

  /**
   * Notify multiple users (e.g. project team, administrators).
   */
  async notifyUsers(userIds, notificationData) {
    const results = [];
    for (const uid of userIds) {
      const n = await this.createNotification({ ...notificationData, userId: uid });
      results.push(n);
    }
    return results;
  }

  /**
   * Fetch paginated notifications for current user with unread counter.
   */
  async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false, type = '' } = {}) {
    const query = { user: userId };
    if (unreadOnly === true || unreadOnly === 'true') {
      query.isRead = false;
    }
    if (type) {
      query.type = type;
    }

    const numericPage = Math.max(1, parseInt(page, 10));
    const numericLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (numericPage - 1) * numericLimit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(numericLimit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: userId, isRead: false })
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        pages: Math.ceil(total / numericLimit)
      }
    };
  }

  /**
   * Mark single notification as read.
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }
    return notification;
  }

  /**
   * Mark all notifications as read for current user.
   */
  async markAllAsRead(userId) {
    await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
    return { success: true, message: 'All notifications marked as read.' };
  }

  /**
   * Delete notification.
   */
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId
    });
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }
    return { success: true, message: 'Notification deleted.' };
  }

  /**
   * Get system alerts for dashboard live alert feed.
   */
  async getAlerts({ limit = 20, severity = '', isAcknowledged = null } = {}) {
    const query = {};
    if (severity) query.severity = severity;
    if (isAcknowledged !== null) query.isAcknowledged = isAcknowledged === 'true';

    return Alert.find(query)
      .populate('project', 'name key')
      .populate('vulnerability', 'cve title severity')
      .populate('pipelineRun', 'runId branch')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 20)
      .lean();
  }

  /**
   * Acknowledge an alert.
   */
  async acknowledgeAlert(alertId, user) {
    const alert = await Alert.findByIdAndUpdate(
      alertId,
      {
        isAcknowledged: true,
        acknowledgedBy: user._id,
        acknowledgedAt: new Date()
      },
      { new: true }
    );
    if (!alert) {
      const error = new Error('Alert not found');
      error.statusCode = 404;
      throw error;
    }
    return alert;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
