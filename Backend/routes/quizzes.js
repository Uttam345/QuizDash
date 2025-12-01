import express from 'express';
import { body, param } from 'express-validator';
import {
  getQuizzesByClass,
  getQuiz,
  createQuiz,
  updateQuiz,
  updateQuizStatus,
} from '../controllers/quizController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const createQuizValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Quiz title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('classId')
    .notEmpty().withMessage('Class ID is required')
    .isMongoId().withMessage('Invalid class ID format'),
  body('questionIds')
    .isArray({ min: 1 }).withMessage('Quiz must have at least one question')
    .custom((value) => {
      if (!value.every(id => /^[0-9a-fA-F]{24}$/.test(id))) {
        throw new Error('Invalid question ID format');
      }
      return true;
    }),
  body('durationMinutes')
    .isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  body('tabSwitchThreshold')
    .isInt({ min: 0, max: 100 }).withMessage('Tab switch threshold must be between 0 and 100'),
  body('totalMarks')
    .isInt({ min: 0 }).withMessage('Total marks must be a positive number'),
  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required')
    .isLength({ max: 100 }).withMessage('Subject must be 100 characters or less'),
  body('createdBy')
    .notEmpty().withMessage('Creator ID is required')
    .isMongoId().withMessage('Invalid creator ID format'),
];

const updateQuizValidation = [
  param('id').isMongoId().withMessage('Invalid quiz ID format'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1, max: 480 }).withMessage('Duration must be between 1 and 480 minutes'),
  body('tabSwitchThreshold')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Tab switch threshold must be between 0 and 100'),
];

const updateQuizStatusValidation = [
  param('id').isMongoId().withMessage('Invalid quiz ID format'),
  body('isReleased')
    .optional()
    .isBoolean().withMessage('isReleased must be a boolean'),
  body('answersReleased')
    .optional()
    .isBoolean().withMessage('answersReleased must be a boolean'),
];

const getQuizByIdValidation = [
  param('id').isMongoId().withMessage('Invalid quiz ID format'),
];

const getQuizzesByClassValidation = [
  param('classId').isMongoId().withMessage('Invalid class ID format'),
];

// Routes
router.get('/class/:classId', authenticate, getQuizzesByClassValidation, getQuizzesByClass);
router.get('/:id', authenticate, getQuizByIdValidation, getQuiz);
router.post('/', authenticate, authorizeRoles('teacher'), createQuizValidation, createQuiz);
router.put('/:id', authenticate, authorizeRoles('teacher'), updateQuizValidation, updateQuiz);
router.put('/:id/status', authenticate, authorizeRoles('teacher'), updateQuizStatusValidation, updateQuizStatus);

export default router;
