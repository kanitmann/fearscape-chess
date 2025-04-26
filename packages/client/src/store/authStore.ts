import create from 'zustand';
import { AuthResponse, User } from '@fearscape-chess/shared';
import { AuthApi } from '../api/authApi';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  register: (email: string, password: string, username: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  
  // Register a new user
  register: async (email, password, username) => {
    try {
      set({ isLoading: true, error: null });
      
      const authResponse = await AuthApi.register(email, password, username);
      
      // Save tokens to localStorage
      localStorage.setItem('token', authResponse.token);
      localStorage.setItem('refreshToken', authResponse.refreshToken);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      
      set({
        user: authResponse.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Registration failed'
      });
    }
  },
  
  // Login with email and password
  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      
      const authResponse = await AuthApi.login(email, password);
      
      // Save tokens to localStorage
      localStorage.setItem('token', authResponse.token);
      localStorage.setItem('refreshToken', authResponse.refreshToken);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      
      set({
        user: authResponse.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Login failed'
      });
    }
  },
  
  // Login with Google
  googleLogin: async (idToken) => {
    try {
      set({ isLoading: true, error: null });
      
      const authResponse = await AuthApi.googleLogin(idToken);
      
      // Save tokens to localStorage
      localStorage.setItem('token', authResponse.token);
      localStorage.setItem('refreshToken', authResponse.refreshToken);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      
      set({
        user: authResponse.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Google login failed'
      });
    }
  },
  
  // Logout
  logout: () => {
    AuthApi.logout();
    
    set({
      user: null,
      isAuthenticated: false
    });
  },
  
  // Load user from localStorage
  loadUser: async () => {
    try {
      set({ isLoading: true });
      
      const userJson = localStorage.getItem('user');
      
      if (userJson) {
        const user = JSON.parse(userJson) as User;
        
        set({
          user,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  },
  
  // Clear error
  clearError: () => {
    set({ error: null });
  }
}));

export default useAuthStore;