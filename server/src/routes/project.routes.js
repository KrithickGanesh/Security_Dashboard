import express from 'express';
import projectController from '../controllers/project.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createProjectValidator,
  updateProjectValidator
} from '../middleware/validators/project.validators.js';

const router = express.Router();

router.use(authenticate);

// List and details are accessible to all authenticated roles
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);

// Create and update: Security Analyst and Admin
router.post(
  '/',
  authorize('Admin', 'Security Analyst'),
  createProjectValidator,
  projectController.createProject
);
router.put(
  '/:id',
  authorize('Admin', 'Security Analyst'),
  updateProjectValidator,
  projectController.updateProject
);

// Delete: Admin only
router.delete('/:id', authorize('Admin'), projectController.deleteProject);

export default router;
