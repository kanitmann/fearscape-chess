import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserService } from '../services/user/UserService';
import config from '../config/config';

// Add user property to Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export class AuthMiddleware {
  private static userService = new UserService();
  
  // Authenticate JWT token
  public static authenticate = async (
    req: Request, 
    res: Response, 
    next: NextFunction
  ): Promise<void | Response> => {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
      
      // Check if user exists
      const user = await AuthMiddleware.userService.getUserById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
      
      // Set user in request
      req.user = {
        id: decoded.id
      };
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  };
  
  // Verify token for Socket.IO
  public static verifyToken = async (token: string): Promise<{ id: string } | null> => {
    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
      
      // Check if user exists
      const user = await AuthMiddleware.userService.getUserById(decoded.id);
      
      if (!user) {
        return null;
      }
      
      return { id: decoded.id };
    } catch (error) {
      return null;
    }
  };
}