import { Router } from 'express';
import { body } from 'express-validator';
import incidentController from '../controllers/incident.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

// View list & details (All authenticated roles)
router.get('/', incidentController.getIncidents);
router.get('/:id', incidentController.getIncidentById);

// Create incident (Admin & Security Analyst)
router.post(
  '/',
  authorize('Admin', 'Security Analyst'),
  [
    body('title').trim().notEmpty().withMessage('Incident title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('project').isMongoId().withMessage('Valid project ID is required'),
    body('severity')
      .optional()
      .isIn(['Critical', 'High', 'Medium', 'Low'])
      .withMessage('Invalid severity'),
    body('status')
      .optional()
      .isIn(['Detected', 'Triaged', 'Contained', 'Resolved', 'Post-mortem'])
      .withMessage('Invalid status'),
    validate
  ],
  incidentController.createIncident
);

// Update status (Admin, Analyst, Developer)
router.patch(
  '/:id/status',
  authorize('Admin', 'Security Analyst', 'Developer'),
  [
    body('status')
      .isIn(['Detected', 'Triaged', 'Contained', 'Resolved', 'Post-mortem'])
      .withMessage('Valid status required'),
    body('notes').optional().isString(),
    validate
  ],
  incidentController.updateStatus
);

// Reassign incident (Admin, Analyst)
router.patch(
  '/:id/assign',
  authorize('Admin', 'Security Analyst'),
  [body('assignedTo').optional({ nullable: true }).isMongoId().withMessage('Valid user ID required'), validate],
  incidentController.assignIncident
);

// Post-mortem update (Admin, Analyst)
router.patch(
  '/:id/post-mortem',
  authorize('Admin', 'Security Analyst'),
  [
    body('rootCause').optional().isString(),
    body('impactSummary').optional().isString(),
    body('preventativeActions').optional().isString(),
    validate
  ],
  incidentController.updatePostMortem
);

export default router;
