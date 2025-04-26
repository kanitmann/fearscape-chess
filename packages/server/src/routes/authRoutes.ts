import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();
const authController = new AuthController();

// Register a new user
router.post('/register', authController.register);

// Login with email and password
router.post('/login', authController.login);

// Google OAuth login
router.post('/google', authController.googleLogin);

// Refresh access token
router.post('/refresh', authController.refreshToken);

export default router;