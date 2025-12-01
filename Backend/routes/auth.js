import express from 'express';
import { body } from 'express-validator';
import { register, login, logout, validateSessionToken } from '../controllers/authController.js';

const router = express.Router();

// Validation rules with sanitization
const registerValidation = [
  body('name')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage('Name can only contain letters, spaces, and common name characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['student', 'teacher'])
    .withMessage('Role must be either student or teacher'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password is too long'),
];

const logoutValidation = [
  body('userId')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format'),
];

const validateSessionValidation = [
  body('userId')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  body('sessionToken')
    .trim()
    .notEmpty()
    .withMessage('Session token is required')
    .isLength({ min: 10, max: 256 })
    .withMessage('Invalid session token format'),
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', logoutValidation, logout);
router.post('/validate', validateSessionValidation, validateSessionToken);
router.post('/logout', logout);
router.post('/validate', validateSessionToken);

export default router;
