import { body, param } from 'express-validator';
import validate from '../validate.js';

export const createProjectValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 120 })
    .withMessage('Project name cannot exceed 120 characters'),
  body('key')
    .trim()
    .notEmpty()
    .withMessage('Project key is required')
    .matches(/^[A-Za-z0-9_-]{2,20}$/)
    .withMessage('Key must be 2-20 alphanumeric characters, dashes, or underscores'),
  body('criticality')
    .optional()
    .isIn(['Critical', 'High', 'Medium', 'Low'])
    .withMessage('Criticality must be Critical, High, Medium, or Low'),
  body('repositoryUrl')
    .optional()
    .trim(),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  validate
];

export const updateProjectValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Project name cannot be empty')
    .isLength({ max: 120 }),
  body('key')
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9_-]{2,20}$/),
  body('criticality')
    .optional()
    .isIn(['Critical', 'High', 'Medium', 'Low']),
  validate
];
