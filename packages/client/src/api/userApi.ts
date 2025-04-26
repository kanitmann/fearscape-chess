import apiClient from './apiClient';

export const UserApi = {
  // Get user profile
  getUserProfile: async () => {
    const response = await apiClient.get('/users/profile');
    
    return response.data.data;
  },
  
  // Get top players
  getTopPlayers: async (limit: number = 10) => {
    const response = await apiClient.get('/users/leaderboard', {
      params: { limit }
    });
    
    return response.data.data;
  }
};