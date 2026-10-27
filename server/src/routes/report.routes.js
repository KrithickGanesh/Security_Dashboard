import { Router } from 'express';
import reportController from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Executive PDF Report
router.get('/executive-summary/pdf', reportController.getExecutivePdf);

// Vulnerability Dataset CSV Export
router.get('/vulnerabilities/csv', reportController.exportVulnerabilitiesCsv);

// Compliance Matrix CSV Export
router.get('/compliance/csv', reportController.exportComplianceCsv);

export default router;
