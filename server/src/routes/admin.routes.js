import { Router } from 'express';
import { body, query } from 'express-validator';
import adminController from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ==========================================
// 1. Audit Logs (Admin & Auditor access)
// ==========================================
router.get(
  '/audit-logs',
  authorize('Admin', 'Auditor'),
  adminController.getAuditLogs
);

router.get(
  '/audit-logs/export',
  authorize('Admin', 'Auditor'),
  adminController.exportAuditLogsCsv
);

// ==========================================
// 2. Assignee / Directory for dropdowns
// ==========================================
router.get(
  '/users/assignees',
  authorize('Admin', 'Security Analyst', 'Developer'),
  adminController.getUsers
);

// ==========================================
// 3. Admin-Only Capabilities (scoped to /admin)
// ==========================================
router.use('/admin', authorize('Admin'));

// Admin Dashboard & Health Metrics
router.get('/admin/stats', adminController.getDashboardStats);

// User Management
router.get('/admin/users', adminController.getUsers);

router.post(
  '/admin/users',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage(
        'Password must contain an uppercase letter, lowercase letter, number, and special character'
      ),
    body('role')
      .optional()
      .isIn(['Admin', 'Security Analyst', 'Developer', 'Auditor'])
      .withMessage('Invalid role specified'),
    validate
  ],
  adminController.createUser
);

router.put(
  '/admin/users/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('role')
      .optional()
      .isIn(['Admin', 'Security Analyst', 'Developer', 'Auditor'])
      .withMessage('Invalid role specified'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validate
  ],
  adminController.updateUser
);

router.delete('/admin/users/:id', adminController.deleteUser);
router.post('/admin/users/:id/unlock', adminController.unlockUser);
router.post('/admin/users/:id/force-logout', adminController.forceLogout);

// API Key Management
router.get('/admin/api-keys', adminController.getApiKeys);

router.post(
  '/admin/api-keys',
  [
    body('name').trim().notEmpty().withMessage('API key name is required'),
    body('allowedTools').optional().isArray().withMessage('allowedTools must be an array'),
    body('autoCreateProject').optional().isBoolean(),
    validate
  ],
  adminController.createApiKey
);

router.post('/admin/api-keys/:id/revoke', adminController.revokeApiKey);

// System Settings
router.get('/admin/settings', adminController.getSettings);
router.put('/admin/settings', adminController.updateSettings);

export default router;
