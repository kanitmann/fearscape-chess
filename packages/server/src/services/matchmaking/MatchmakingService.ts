// packages/server/src/services/matchmaking/MatchmakingService.ts

import { v4 as uuidv4 } from 'uuid';
import { GameService } from '../game/GameService';

interface QueuedPlayer {
  userId: string;
  rating: number;
  queueTime: number;
  gameMode: 'standard' | 'blitz';
}

export class MatchmakingService {
  private gameService: GameService;
  private standardQueue: QueuedPlayer[] = [];
  private blitzQueue: QueuedPlayer[] = [];
  private matchmakingInterval: NodeJS.Timeout;
  
  constructor(gameService: GameService) {
    this.gameService = gameService;
    
    // Run matchmaking every 5 seconds
    this.matchmakingInterval = setInterval(() => this.matchPlayers(), 5000);
  }
  
  // Add player to the queue
  addToQueue(userId: string, rating: number, gameMode: 'standard' | 'blitz') {
    const queue = gameMode === 'standard' ? this.standardQueue : this.blitzQueue;
    
    // Check if player is already in queue
    const existingIndex = queue.findIndex(p => p.userId === userId);
    
    if (existingIndex !== -1) {
      // Update existing entry
      queue[existingIndex].queueTime = Date.now();
      return;
    }
    
    // Add new player to queue
    queue.push({
      userId,
      rating,
      queueTime: Date.now(),
      gameMode
    });
  }
  
  // Remove player from queue
  removeFromQueue(userId: string, gameMode: 'standard' | 'blitz') {
    const queue = gameMode === 'standard' ? this.standardQueue : this.blitzQueue;
    
    const index = queue.findIndex(p => p.userId === userId);
    
    if (index !== -1) {
      queue.splice(index, 1);
    }
  }
  
  // Match players in the queue
  private matchPlayers() {
    this.matchPlayersInQueue(this.standardQueue, 'standard');
    this.matchPlayersInQueue(this.blitzQueue, 'blitz');
  }
  
  private matchPlayersInQueue(queue: QueuedPlayer[], gameMode: 'standard' | 'blitz') {
    if (queue.length < 2) return;
    
    // Sort by queue time (oldest first)
    queue.sort((a, b) => a.queueTime - b.queueTime);
    
    const maxRatingDiff = 200; // Maximum rating difference
    const timeFactorMs = 10000; // Rating difference increases after this time
    
    // Try to match players
    for (let i = 0; i < queue.length; i++) {
      const player = queue[i];
      const waitTime = Date.now() - player.queueTime;
      
      // Increase acceptable rating difference based on wait time
      const ratingDiffFactor = Math.floor(waitTime / timeFactorMs);
      const acceptableDiff = maxRatingDiff + (ratingDiffFactor * 50);
      
      // Find opponent
      for (let j = 0; j < queue.length; j++) {
        if (i === j) continue;
        
        const opponent = queue[j];
        const ratingDiff = Math.abs(player.rating - opponent.rating);
        
        if (ratingDiff <= acceptableDiff) {
          // Create game
          this.gameService.createGame(player.userId, opponent.userId, gameMode);
          
          // Remove players from queue
          queue.splice(Math.max(i, j), 1);
          queue.splice(Math.min(i, j), 1);
          
          // Adjust indices and continue matching
          i--;
          break;
        }
      }
    }
  }
  
  // Clean up on service shutdown
  cleanup() {
    clearInterval(this.matchmakingInterval);
  }
}