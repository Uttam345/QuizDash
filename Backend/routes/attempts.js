import express from 'express';
import { body, param } from 'express-validator';
import {
  getAttemptByQuizAndStudent,
  getAttemptsByQuiz,
  saveAttempt,
  updateAttempt,
} from '../controllers/attemptController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const saveAttemptValidation = [
  body('quizId')
    .notEmpty().withMessage('Quiz ID is required')
    .isMongoId().withMessage('Invalid quiz ID format'),
  body('studentId')
    .notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Invalid student ID format'),
  body('answers')
    .optional()
    .isObject().withMessage('Answers must be an object'),
  body('tabSwitches')
    .optional()
    .isInt({ min: 0 }).withMessage('Tab switch count must be a non-negative number'),
  body('score')
    .optional()
    .isNumeric().withMessage('Score must be a number'),
  body('startTime')
    .optional()
    .isNumeric().withMessage('Start time must be a number'),
];

const updateAttemptValidation = [
  param('id').isMongoId().withMessage('Invalid attempt ID format'),
  body('answers')
    .optional()
    .isObject().withMessage('Answers must be an object'),
  body('tabSwitches')
    .optional()
    .isInt({ min: 0 }).withMessage('Tab switch count must be a non-negative number'),
  body('score')
    .optional()
    .isNumeric().withMessage('Score must be a number'),
  body('endTime')
    .optional()
    .isNumeric().withMessage('End time must be a number'),
  body('submitted')
    .optional()
    .isBoolean().withMessage('Submitted must be a boolean'),
];

const getAttemptByQuizAndStudentValidation = [
  param('quizId').isMongoId().withMessage('Invalid quiz ID format'),
  param('studentId').isMongoId().withMessage('Invalid student ID format'),
];

const getAttemptsByQuizValidation = [
  param('quizId').isMongoId().withMessage('Invalid quiz ID format'),
];

// Routes
router.get('/quiz/:quizId/student/:studentId', authenticate, getAttemptByQuizAndStudentValidation, getAttemptByQuizAndStudent);
router.get('/quiz/:quizId', authenticate, authorizeRoles('teacher'), getAttemptsByQuizValidation, getAttemptsByQuiz);
router.post('/', authenticate, saveAttemptValidation, saveAttempt);
router.put('/:id', authenticate, updateAttemptValidation, updateAttempt);

export default router;
