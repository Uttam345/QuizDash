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
  body('marks')
    .isInt({ min: 1 }).withMessage('Marks must be at least 1'),
  body('imageUrl')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Image URL must be 2000 characters or less'),
  body('options')
    .if(body('type').isIn(['single-correct', 'multiple-correct']))
    .isArray({ min: 2 }).withMessage('At least 2 options are required for MCQ')
    .custom((options) => {
      if (!options.every(opt => opt.text && opt.text.trim().length > 0)) {
        throw new Error('All options must have text');
      }
      return true;
    }),
  body('correctAnswerIndex')
    .if(body('type').equals('single-correct'))
    .isInt({ min: 0 }).withMessage('Correct answer index must be a positive number')
    .custom((value, { req }) => {
      if (req.body.options && value >= req.body.options.length) {
        throw new Error('Correct answer index is out of bounds');
      }
      return true;
    }),
  body('correctAnswerIndices')
    .if(body('type').equals('multiple-correct'))
    .isArray({ min: 1 }).withMessage('At least one correct answer is required')
    .custom((indices, { req }) => {
      if (req.body.options && indices.some(idx => idx >= req.body.options.length)) {
        throw new Error('One or more correct answer indices are out of bounds');
      }
      return true;
    }),
  body('correctAnswerText')
    .if(body('type').equals('fill-in-the-blank'))
    .trim()
    .notEmpty().withMessage('Correct answer text is required for fill-in-the-blank questions')
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
