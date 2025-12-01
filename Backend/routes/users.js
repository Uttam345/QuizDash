import express from 'express';
import { getUserById, getUserByEmail } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/:id', authenticate, getUserById);
router.get('/email/:email', authenticate, getUserByEmail);

export default router;
