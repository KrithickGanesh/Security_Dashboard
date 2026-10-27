import express from 'express';
import notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// User Notifications routes
router.get('/notifications', notificationController.getNotifications);
router.patch('/notifications/read-all', notificationController.markAllAsRead);
router.patch('/notifications/:id/read', notificationController.markAsRead);
router.delete('/notifications/:id', notificationController.deleteNotification);

// Alerts routes
router.get('/alerts', notificationController.getAlerts);
router.patch('/alerts/:id/ack', notificationController.acknowledgeAlert);

export default router;
