import apiClient from './apiClient';
import { AuthResponse } from '@fearscape-chess/shared';

export const AuthApi = {
  // Register a new user
  register: async (email: string, password: string, username: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      username
    });
    
    return response.data.data;
  },
  
  // Login with email and password
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', {
      email,
      password
    });
    
    return response.data.data;
  },
  
  // Login with Google
  googleLogin: async (idToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/google', {
      idToken
    });
    
    return response.data.data;
  },
  
  // Refresh access token
  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    const response = await apiClient.post('/auth/refresh', {
      refreshToken
    });
    
    return response.data.data;
  },
  
  // Logout
  logout: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};