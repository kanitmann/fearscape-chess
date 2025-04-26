import * as jwt from 'jsonwebtoken';
import UserModel, { IUser } from '../../models/User';
import { OAuth2Client } from 'google-auth-library';
import config from '../../config/config';
import { AuthResponse } from '@fearscape-chess/shared';

export class AuthService {
  private readonly googleClient: OAuth2Client;
  
  constructor() {
    // Initialize Google OAuth client
    this.googleClient = new OAuth2Client(config.googleClientId);
  }
  
  // Register a new user
  public async register(email: string, password: string, username: string): Promise<AuthResponse | null> {
    try {
      // Check if user already exists
      const existingUser = await UserModel.findOne({ 
        $or: [{ email }, { username }]
      });
      
      if (existingUser) {
        return null;
      }
      
      // Create new user
      const user = await UserModel.create({
        email,
        password,
        username
      });
      
      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);
      
      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          rating: user.rating,
          gamesPlayed: user.gamesPlayed,
          wins: user.wins,
          losses: user.losses,
          draws: user.draws
        },
        token,
        refreshToken
      };
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  }
  
  // Login with email and password
  public async login(email: string, password: string): Promise<AuthResponse | null> {
    try {
      // Find user by email
      const user = await UserModel.findOne({ email });
      
      if (!user || !user.password) {
        return null;
      }
      
      // Validate password
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return null;
      }
      
      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);
      
      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          rating: user.rating,
          gamesPlayed: user.gamesPlayed,
          wins: user.wins,
          losses: user.losses,
          draws: user.draws
        },
        token,
        refreshToken
      };
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }
  
  // Google OAuth login
  public async googleLogin(idToken: string): Promise<AuthResponse | null> {
    try {
      // Verify Google token
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: config.googleClientId
      });
      
      const payload = ticket.getPayload();
      
      if (!payload || !payload.email) {
        return null;
      }
      
      // Check if user exists
      let user = await UserModel.findOne({ email: payload.email });
      
      if (!user) {
        // Create new user from Google data
        user = await UserModel.create({
          email: payload.email,
          username: payload.name?.replace(/\s+/g, '_').toLowerCase() || `user_${Date.now()}`,
          googleId: payload.sub
        });
      } else if (!user.googleId) {
        // Update existing user with Google ID
        user.googleId = payload.sub;
        await user.save();
      }
      
      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);
      
      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          rating: user.rating,
          gamesPlayed: user.gamesPlayed,
          wins: user.wins,
          losses: user.losses,
          draws: user.draws
        },
        token,
        refreshToken
      };
    } catch (error) {
      console.error('Google login error:', error);
      return null;
    }
  }
  
  // Refresh access token
  public async refreshToken(refreshToken: string): Promise<{ token: string } | null> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { id: string };
      
      // Get user
      const user = await UserModel.findById(decoded.id);
      
      if (!user) {
        return null;
      }
      
      // Generate new access token
      const token = this.generateToken(user);
      
      return { token };
    } catch (error) {
      console.error('Refresh token error:', error);
      return null;
    }
  }
  
  // Generate JWT token
  private generateToken(user: IUser): string {
    return jwt.sign(
      { id: user._id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  }
  
  // Generate refresh token
  private generateRefreshToken(user: IUser): string {
    return jwt.sign(
      { id: user._id },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiresIn }
    );
  }
  
  // Verify token
  public verifyToken(token: string): Promise<{ id: string } | null> {
    return new Promise((resolve) => {
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
        resolve(decoded);
      } catch (error) {
        resolve(null);
      }
    });
  }
}