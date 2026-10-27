import express from 'express';
import scanUploadController, { uploadMiddleware } from '../controllers/scanUpload.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Upload manual scan: Analyst and Admin
router.post(
  '/upload',
  authorize('Admin', 'Security Analyst'),
  uploadMiddleware.single('file'),
  scanUploadController.handleScanUpload
);

// Scan history: All authenticated roles
router.get('/history', scanUploadController.getScanHistory);

export default router;
