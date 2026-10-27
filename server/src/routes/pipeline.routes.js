import express from 'express';
import pipelineController from '../controllers/pipeline.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Pipeline run list & detail: Accessible to all authenticated users
router.get('/', pipelineController.getPipelines);
router.get('/:id', pipelineController.getPipelineById);

export default router;
