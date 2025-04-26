import { Router } from 'express';
import { GameController } from '../controllers/GameController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

const router = Router();
const gameController = new GameController();

// Create a new game
router.post('/', AuthMiddleware.authenticate, gameController.createGame);

// Get game by ID
router.get('/:gameId', AuthMiddleware.authenticate, gameController.getGame);

// Get user's games
router.get('/user/games', AuthMiddleware.authenticate, gameController.getUserGames);

export default router;