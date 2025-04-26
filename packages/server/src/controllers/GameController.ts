import { Request, Response } from 'express';
import { GameService } from '../services/game/Gameservice';
import { UserService } from '../services/user/Userservice';
import { z } from 'zod';
import { GameMode } from '@fearscape-chess/shared';

// Validation schemas
const createGameSchema = z.object({
  opponentId: z.string(),
  gameMode: z.enum(['standard', 'blitz']).optional()
});

const getGameSchema = z.object({
  gameId: z.string()
});

export class GameController {
  private gameService: GameService;
  private userService: UserService;
  
  constructor() {
    this.userService = new UserService();
    this.gameService = new GameService(this.userService);
  }
  
  // Create a new game
  public createGame = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Validate request body
      const validatedData = createGameSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validatedData.error.errors
        });
      }
      
      const { opponentId, gameMode = 'standard' } = validatedData.data;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }
      
      // Randomly assign colors
      const isWhite = Math.random() >= 0.5;
      const whitePlayerId = isWhite ? userId : opponentId;
      const blackPlayerId = isWhite ? opponentId : userId;
      
      // Create game
      const gameId = this.gameService.createGame(
        whitePlayerId, 
        blackPlayerId, 
        gameMode as GameMode
      );
      
      return res.status(201).json({
        success: true,
        data: {
          gameId,
          whitePlayerId,
          blackPlayerId,
          gameMode
        }
      });
    } catch (error) {
      console.error('Create game error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
  
  // Get game by ID
  public getGame = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Validate request params
      const validatedData = getGameSchema.safeParse(req.params);
      
      if (!validatedData.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validatedData.error.errors
        });
      }
      
      const { gameId } = validatedData.data;
      
      // Get game from service
      const activeGame = this.gameService.getGame(gameId);
      
      if (activeGame) {
        return res.status(200).json({
          success: true,
          data: activeGame
        });
      }
      
      // If game not active, try to get from database
      const dbGame = await this.gameService.getGameById(gameId);
      
      if (!dbGame) {
        return res.status(404).json({
          success: false,
          message: 'Game not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: dbGame
      });
    } catch (error) {
      console.error('Get game error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
  
  // Get user's games
  public getUserGames = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }
      
      // Get user's games
      const games = await this.gameService.getUserGames(userId);
      
      return res.status(200).json({
        success: true,
        data: games
      });
    } catch (error) {
      console.error('Get user games error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
}