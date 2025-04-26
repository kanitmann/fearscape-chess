// packages/server/src/services/auth/AuthService.ts

import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import UserModel from '../../models/User';
import { OAuth2Client } from 'google-auth-library';
import config from '../../config/config';

export class AuthService {
  private googleClient: OAuth2Client;
  
  constructor() {
    this.googleClient = new OAuth2Client(config.googleClientId);
  }
  
  async register(email: string, password: string, username: string) {
    const existingUser = await UserModel.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    const user = await UserModel.create({
      email,
      password, // Will be hashed via mongoose pre-save hook
      username
    });
    
    return {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        rating: user.rating
      },
      token: this.generateToken(user._id),
      refreshToken: this.generateRefreshToken(user._id)
    };
  }
  
  async login(email: string, password: string) {
    const user = await UserModel.findOne({ email });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }
    
    return {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        rating: user.rating
      },
      token: this.generateToken(user._id),
      refreshToken: this.generateRefreshToken(user._id)
    };
  }
  
  async googleLogin(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: config.googleClientId
    });
    
    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      throw new Error('Invalid Google token');
    }
    
    let user = await UserModel.findOne({ email: payload.email });
    
    if (!user) {
      // Create new user
      user = await UserModel.create({
        email: payload.email,
        username: payload.name?.replace(/\s+/g, '_').toLowerCase() || `user_${Date.now()}`,
        googleId: payload.sub
      });
    }
    
    return {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        rating: user.rating
      },
      token: this.generateToken(user._id),
      refreshToken: this.generateRefreshToken(user._id)
    };
  }
  
  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
      
      if (typeof decoded !== 'object' || !decoded.id) {
        throw new Error('Invalid token');
      }
      
      const user = await UserModel.findById(decoded.id);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        token: this.generateToken(user._id)
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
  
  private generateToken(userId: string) {
    return jwt.sign(
      { id: userId },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  }
  
  private generateRefreshToken(userId: string) {
    return jwt.sign(
      { id: userId },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiresIn }
    );
  }
}