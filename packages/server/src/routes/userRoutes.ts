import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

const router = Router();
const userController = new UserController();

// Get user profile
router.get('/profile', AuthMiddleware.authenticate, userController.getUserProfile);

// Get top players
router.get('/leaderboard', userController.getTopPlayers);

export default router;