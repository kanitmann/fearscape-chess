import { Request, Response } from 'express';
import { UserService } from '../services/user/UserService';
import { z } from 'zod';

// Validation schemas
const topPlayersSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10)
});

export class UserController {
  private userService: UserService;
  
  constructor() {
    this.userService = new UserService();
  }
  
  // Get user profile
  public getUserProfile = async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }
      
      // Get user profile
      const user = await this.userService.getUserProfile(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
  
  // Get top players by rating
  public getTopPlayers = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Validate request query
      const validatedData = topPlayersSchema.safeParse(req.query);
      
      if (!validatedData.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validatedData.error.errors
        });
      }
      
      const { limit } = validatedData.data;
      
      // Get top players
      const players = await this.userService.getTopPlayers(limit);
      
      return res.status(200).json({
        success: true,
        data: players
      });
    } catch (error) {
      console.error('Get top players error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
}