import express from 'express';
import { body, param } from 'express-validator';
import {
  getQuestionsByAuthor,
  getQuestionsBySubject,
  getQuestionsByIds,
  createQuestion,
  deleteQuestion,
} from '../controllers/questionController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const createQuestionValidation = [
  body('type')
    .isIn(['single-correct', 'multiple-correct', 'fill-in-the-blank'])
    .withMessage('Invalid question type'),
  body('text')
    .trim()
    .notEmpty().withMessage('Question text is required')
    .isLength({ min: 5, max: 2000 }).withMessage('Question text must be 5-2000 characters'),
  body('difficulty')
    .isIn(['Easy', 'Medium', 'Hard'])
    .withMessage('Invalid difficulty level'),
  body('authorId')
    .notEmpty().withMessage('Author ID is required')
    .isMongoId().withMessage('Invalid author ID format'),
  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required')
    .isLength({ max: 100 }).withMessage('Subject must be 100 characters or less'),
  body('options')
    .optional()
    .isArray({ min: 2 }).withMessage('At least 2 options are required for MCQ'),
  body('correctAnswerIndex')
    .optional()
    .isInt({ min: 0 }).withMessage('Correct answer index must be a positive number'),
  body('correctAnswerIndices')
    .optional()
    .isArray({ min: 1 }).withMessage('At least one correct answer is required'),
  body('correctAnswerText')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 }).withMessage('Correct answer text must be 1-500 characters'),
];

const getQuestionsByIdsValidation = [
  body('questionIds')
    .isArray({ min: 1 }).withMessage('Question IDs array is required')
    .custom((value) => {
      if (!value.every(id => /^[0-9a-fA-F]{24}$/.test(id))) {
        throw new Error('Invalid question ID format');
      }
      return true;
    }),
];

const deleteQuestionValidation = [
  param('id').isMongoId().withMessage('Invalid question ID format'),
];

const getQuestionsByAuthorValidation = [
  param('authorId').isMongoId().withMessage('Invalid author ID format'),
];

const getQuestionsBySubjectValidation = [
  param('subject').trim().notEmpty().withMessage('Subject is required'),
];

// Routes
router.get('/author/:authorId', authenticate, getQuestionsByAuthorValidation, getQuestionsByAuthor);
router.get('/subject/:subject', authenticate, getQuestionsBySubjectValidation, getQuestionsBySubject);
router.post('/batch', authenticate, getQuestionsByIdsValidation, getQuestionsByIds);
router.post('/', authenticate, authorizeRoles('teacher'), createQuestionValidation, createQuestion);
router.delete('/:id', authenticate, authorizeRoles('teacher'), deleteQuestionValidation, deleteQuestion);

export default router;
