import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateBody, registerSchema, loginSchema } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', authMiddleware, getMe);

export default router;
