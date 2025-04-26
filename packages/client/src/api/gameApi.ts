import apiClient from './apiClient';
import { GameMode } from '@fearscape-chess/shared';

export const GameApi = {
  // Create a new game
  createGame: async (opponentId: string, gameMode: GameMode = 'standard') => {
    const response = await apiClient.post('/games', {
      opponentId,
      gameMode
    });
    
    return response.data.data;
  },
  
  // Get game by ID
  getGame: async (gameId: string) => {
    const response = await apiClient.get(`/games/${gameId}`);
    
    return response.data.data;
  },
  
  // Get user's games
  getUserGames: async () => {
    const response = await apiClient.get('/games/user/games');
    
    return response.data.data;
  }
};