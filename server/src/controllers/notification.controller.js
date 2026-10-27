import notificationService from '../services/notification.service.js';

export class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const result = await notificationService.getUserNotifications(
        req.user._id,
        req.query
      );
      res.status(200).json({
        success: true,
        message: 'Notifications retrieved',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const result = await notificationService.markAsRead(
        req.params.id,
        req.user._id
      );
      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: { notification: result }
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user._id);
      res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      const result = await notificationService.deleteNotification(
        req.params.id,
        req.user._id
      );
      res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  async getAlerts(req, res, next) {
    try {
      const alerts = await notificationService.getAlerts(req.query);
      res.status(200).json({
        success: true,
        message: 'Alerts retrieved',
        data: { alerts }
      });
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeAlert(req, res, next) {
    try {
      const alert = await notificationService.acknowledgeAlert(
        req.params.id,
        req.user
      );
      res.status(200).json({
        success: true,
        message: 'Alert acknowledged',
        data: { alert }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
export default notificationController;
