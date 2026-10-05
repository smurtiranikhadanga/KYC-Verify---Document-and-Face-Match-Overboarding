import { Router } from 'express';
import { login, requestOtp, verifyOtp, getMe, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', requireAuth, getMe);
router.post('/logout', logout);

export default router;
