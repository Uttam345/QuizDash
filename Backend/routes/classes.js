import express from 'express';
import { body, param } from 'express-validator';
import {
  getClassesByTeacher,
  getClassesByStudent,
  getStudentsByClass,
  createClass,
  updateClass,
  deleteClass,
  joinClass,
} from '../controllers/classController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const joinClassValidation = [
  body('studentId')
    .trim()
    .notEmpty()
    .withMessage('Student ID is required')
    .isMongoId()
    .withMessage('Invalid student ID format'),
  body('joinCode')
    .trim()
    .notEmpty()
    .withMessage('Join code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Join code must be exactly 6 characters')
    .matches(/^[A-Z0-9]+$/i)
    .withMessage('Join code must contain only letters and numbers'),
];

const createClassValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Class name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Class name must be between 3 and 100 characters'),
  body('teacherId')
    .trim()
    .notEmpty()
    .withMessage('Teacher ID is required')
    .isMongoId()
    .withMessage('Invalid teacher ID format'),
];

const updateClassValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid class ID format'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Class name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Class name must be between 3 and 100 characters'),
];

router.get('/teacher/:teacherId', authenticate, getClassesByTeacher);
router.get('/student/:studentId', authenticate, getClassesByStudent);
router.get('/:classId/students', authenticate, getStudentsByClass);
router.post('/', authenticate, authorizeRoles('teacher'), createClassValidation, createClass);
router.put('/:id', authenticate, authorizeRoles('teacher'), updateClassValidation, updateClass);
router.delete('/:id', authenticate, authorizeRoles('teacher'), deleteClass);
router.post('/join', authenticate, authorizeRoles('student'), joinClassValidation, joinClass);

export default router;
