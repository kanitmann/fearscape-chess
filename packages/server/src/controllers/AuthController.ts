import { Request, Response } from 'express';
import { AuthService } from '../services/auth/AuthService';
import { z } from 'zod';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(20)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const googleLoginSchema = z.object({
  idToken: z.string()
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
});

export class AuthController {
  private authService: AuthService;
  
  constructor() {
    this.authService = new AuthService();
  }
  
  // Register a new user
  public register = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Validate request body
      const validatedData = registerSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validatedData.error.errors
        });
      }
      
      const { email, password, username } = validatedData.data;
      
      // Register user
      const result = await this.authService.register(email, password, username);
      
      if (!result) {
        return res.status(400).json({
          success: false,
          message: 'User already exists'
        });
      }
      
      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
  
  // Login with email and password
  public login = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Validate request body
      const validatedData = loginSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validatedData.error.errors
        });
      }
      
      const { email, password } = validatedData.data;
      
      // Login user
      const result = await this.authService.login(email, password);
      
      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
  
  // Google OAuth login
  public googleLogin = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Validate request body
      const validatedData = googleLoginSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validatedData.error.errors
        });
      }
      
      const { idToken } = validatedData.data;
      
      // Login with Google
      const result = await this.authService.googleLogin(idToken);
      
      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Invalid Google token'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Google login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
  
  // Refresh access token
  public refreshToken = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Validate request body
      const validatedData = refreshTokenSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validatedData.error.errors
        });
      }
      
      const { refreshToken } = validatedData.data;
      
      // Refresh token
      const result = await this.authService.refreshToken(refreshToken);
      
      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
}