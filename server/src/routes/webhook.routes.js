import express from 'express';
import rateLimit from 'express-rate-limit';
import webhookController from '../controllers/webhook.controller.js';
import verifyWebhook from '../middleware/webhookAuth.js';

const router = express.Router();

// Webhook rate limiter (60 requests per minute)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Webhook rate limit exceeded. Please throttle CI pipeline dispatches.',
    data: null
  }
});

// Primary Webhook Ingestion Route
router.post('/scan', webhookLimiter, verifyWebhook, webhookController.handleScanWebhook);

export default router;
