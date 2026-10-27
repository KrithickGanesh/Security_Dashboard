import express from 'express';
import complianceController from '../controllers/compliance.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Frameworks routes
router.get('/frameworks', complianceController.getFrameworks);
router.get('/frameworks/:id', complianceController.getFrameworkById);
router.post('/frameworks', authorize('Admin'), complianceController.createFramework);
router.post('/frameworks/:id/controls', authorize('Admin'), complianceController.addControl);

// Assessment routes
router.get('/assessments', complianceController.getAssessments);
router.patch(
  '/assessments/:id',
  authorize('Admin', 'Security Analyst'),
  complianceController.updateAssessment
);
router.post(
  '/assessments/evaluate/:projectId',
  authorize('Admin', 'Security Analyst'),
  complianceController.evaluateProject
);

export default router;
