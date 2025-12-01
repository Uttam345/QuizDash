import express from 'express';
import { body, param } from 'express-validator';
import {
  getSubjectsByTeacher,
  createSubject,
  deleteSubject,
} from '../controllers/subjectController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const createSubjectValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Subject name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Subject name must be between 2 and 100 characters'),
  body('teacherId')
    .notEmpty().withMessage('Teacher ID is required')
    .isMongoId().withMessage('Invalid teacher ID format')
];

const getSubjectsByTeacherValidation = [
  param('teacherId')
    .notEmpty().withMessage('Teacher ID is required')
    .isMongoId().withMessage('Invalid teacher ID format')
];

const deleteSubjectValidation = [
  param('id')
    .notEmpty().withMessage('Subject ID is required')
    .isMongoId().withMessage('Invalid subject ID format')
];

router.get('/teacher/:teacherId', authenticate, getSubjectsByTeacherValidation, getSubjectsByTeacher);
router.post('/', authenticate, authorizeRoles('teacher'), createSubjectValidation, createSubject);
router.delete('/:id', authenticate, authorizeRoles('teacher'), deleteSubjectValidation, deleteSubject);

export default router;
