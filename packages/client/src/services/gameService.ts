import { Chess } from 'chess.js';
import apiClient from '../api/apiClient';
import { socket } from './socket';

export class GameService {
  // Get game by ID
  static async getGame(gameId: string) {
    try {
      const response = await apiClient.get(`/games/${gameId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching game:', error);
      throw error;
    }
  }

  // Update game status
  static async updateGameStatus(gameId: string, result: string) {
    try {
      const response = await apiClient.patch(`/games/${gameId}/status`, { result });
      return response.data.data;
    } catch (error) {
      console.error('Error updating game status:', error);
      throw error;
    }
  }

  // Create a new game
  static async createGame(opponentId: string, gameMode: 'standard' | 'blitz' = 'standard') {
    try {
      const response = await apiClient.post('/games', { opponentId, gameMode });
      return response.data.data;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  // Join a game
  static joinGame(gameId: string, userId: string) {
    socket.emit('join-game', { gameId, userId });
  }

  // Leave a game
  static leaveGame(gameId: string, userId: string) {
    socket.emit('leave-game', { gameId, userId });
  }

  // Check if a move is valid
  static isValidMove(chess: Chess, from: string, to: string, promotion?: string) {
    try {
      // Make a copy of the game to test the move
      const gameCopy = new Chess(chess.fen());
      
      // Try to make the move
      const result = gameCopy.move({
        from,
        to,
        promotion
      });
      
      return !!result;
    } catch (error) {
      console.error('Error validating move:', error);
      return false;
    }
  }
}