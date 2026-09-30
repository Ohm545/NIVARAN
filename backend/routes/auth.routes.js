/**
 * NIVARAN — Auth Routes
 *
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 */

import { Router } from 'express';
import { login, logout, me } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { loginRules, validateRequest } from '../validators/auth.validator.js';

const router = Router();

router.post('/login',  authLimiter, loginRules, validateRequest, login);
router.post('/logout', authenticate, logout);
router.get('/me',      authenticate, me);

export default router;
