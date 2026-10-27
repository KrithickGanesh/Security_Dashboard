import express from 'express';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  updateProfileValidator
} from '../middleware/validators/auth.validators.js';

const router = express.Router();

// Stricter rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    data: null
  }
});

// Public endpoints
router.post('/register', authLimiter, registerValidator, authController.register);
router.post('/login', authLimiter, loginValidator, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPasswordValidator, authController.resetPassword);

// Protected endpoints
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getMe);
router.put('/update-profile', authenticate, updateProfileValidator, authController.updateProfile);
router.put('/change-password', authenticate, changePasswordValidator, authController.changePassword);

export default router;
