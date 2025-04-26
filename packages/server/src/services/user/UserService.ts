import UserModel, { IUser } from '../../models/User';

export class UserService {
  // Get user by ID
  public async getUserById(userId: string): Promise<IUser | null> {
    try {
      return await UserModel.findById(userId).select('-password');
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }
  
  // Get user by email
  public async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      return await UserModel.findOne({ email });
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }
  
  // Update user rating after a game
  public async updateRating(userId: string, isWin: boolean | null): Promise<void> {
    try {
      const user = await UserModel.findById(userId);
      
      if (!user) return;
      
      // Increment games played
      user.gamesPlayed += 1;
      
      // Update win/loss/draw count
      if (isWin === true) {
        user.wins += 1;
        user.rating += 15; // Simple rating increase for win
      } else if (isWin === false) {
        user.losses += 1;
        user.rating = Math.max(1000, user.rating - 15); // Don't go below 1000
      } else {
        user.draws += 1;
        user.rating += 5; // Small rating increase for draw
      }
      
      await user.save();
    } catch (error) {
      console.error('Error updating user rating:', error);
    }
  }
  
  // Get top players by rating
  public async getTopPlayers(limit: number = 10): Promise<IUser[]> {
    try {
      return await UserModel.find()
        .sort({ rating: -1 })
        .limit(limit)
        .select('-password');
    } catch (error) {
      console.error('Error getting top players:', error);
      return [];
    }
  }
  
  // Get user profile
  public async getUserProfile(userId: string): Promise<IUser | null> {
    try {
      return await UserModel.findById(userId).select('-password');
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
}