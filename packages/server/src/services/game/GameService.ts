import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';
import { 
  Move, 
  GameState, 
  Position, 
  FogState,
  GameMode,
  algebraicToCoordinates
} from '@fearscape-chess/shared';
import { UserService } from '../user/UserService';
import GameModel, { IGame } from '../../models/Game';

export class GameService {
  private activeGames: Map<string, {
    chess: Chess;
    playerIds: {
      white: string;
      black: string;
    };
    fogState: {
      white: FogState;
      black: FogState;
    };
    timers: {
      white: number;
      black: number;
    };
    lastMoveTime: number;
    gameMode: GameMode;
  }> = new Map();
  
  private timerIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  private userService: UserService;
  
  constructor(userService: UserService) {
    this.userService = userService;
  }
  
  // Create a new game between two players
  public createGame(whitePlayerId: string, blackPlayerId: string, gameMode: GameMode = 'standard'): string {
    const gameId = uuidv4();
    const chess = new Chess();
    
    // Set initial timers based on game mode
    const initialTime = gameMode === 'standard' ? 600 : 180; // 10 min or 3 min
    
    this.activeGames.set(gameId, {
      chess,
      playerIds: {
        white: whitePlayerId,
        black: blackPlayerId
      },
      fogState: {
        white: { revealedPositions: [] },
        black: { revealedPositions: [] }
      },
      timers: {
        white: initialTime,
        black: initialTime
      },
      lastMoveTime: Date.now(),
      gameMode
    });
    
    // Start the game timer
    this.startGameTimer(gameId);
    
    // Save game to database
    this.saveGameToDb(gameId);
    
    return gameId;
  }
  
  // Process a player's move
  public makeMove(gameId: string, playerId: string, move: Move): {
    success: boolean;
    state?: GameState;
    fogReveals?: string[];
    error?: string;
  } {
    const game = this.activeGames.get(gameId);
    if (!game) return { success: false, error: 'Game not found' };
    
    // Check if it's the player's turn
    const isWhiteTurn = game.chess.turn() === 'w';
    const playerColor = game.playerIds.white === playerId ? 'white' : 'black';
    
    if ((isWhiteTurn && playerColor !== 'white') || 
        (!isWhiteTurn && playerColor !== 'black')) {
      return { success: false, error: 'Not your turn' };
    }
    
    // Attempt to make the move
    try {
      const result = game.chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion
      });
      
      if (!result) {
        return { success: false, error: 'Invalid move' };
      }
      
      // Calculate fog-of-war reveals
      const fogReveals = this.calculateFogReveals(move, playerColor, game);
      
      // Update fog state for the player
      if (fogReveals.length > 0) {
        game.fogState[playerColor].revealedPositions = [
          ...game.fogState[playerColor].revealedPositions,
          ...fogReveals
        ];
      }
      
      // Update timers
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - game.lastMoveTime) / 1000);
      
      // Deduct time from the player who just moved
      game.timers[playerColor] = Math.max(0, game.timers[playerColor] - elapsedSeconds);
      game.lastMoveTime = now;
      
      // Check if the game is over by timeout
      if (game.timers[playerColor] === 0) {
        // The player who just moved ran out of time, so the opponent wins
        this.endGame(gameId, playerColor === 'white' ? 'black' : 'white', 'timeout');
      }
      
      // Check if the game is over by checkmate or draw
      if (game.chess.isGameOver()) {
        const winner = game.chess.isCheckmate() 
          ? (game.chess.turn() === 'w' ? 'black' : 'white') 
          : null; // Draw
        
        this.endGame(gameId, winner, game.chess.isCheckmate() ? 'checkmate' : 'draw');
      }
      
      // Save game state to the database
      this.saveGameToDb(gameId);
      
      return {
        success: true,
        state: this.getGameState(game.chess),
        fogReveals
      };
    } catch (error) {
      console.error('Error making move:', error);
      return { success: false, error: 'Invalid move' };
    }
  }
  
  // Handle fog reveal action
  public revealFog(gameId: string, playerId: string, position: Position): {
    success: boolean;
    error?: string;
  } {
    const game = this.activeGames.get(gameId);
    if (!game) return { success: false, error: 'Game not found' };
    
    const playerColor = game.playerIds.white === playerId ? 'white' : 'black';
    const posKey = `${position.x},${position.y}`;
    
    // Check if the position is already revealed
    if (game.fogState[playerColor].revealedPositions.includes(posKey)) {
      return { success: false, error: 'Position already revealed' };
    }
    
    // Add the position to the revealed list
    game.fogState[playerColor].revealedPositions.push(posKey);
    
    // Save game state
    this.saveGameToDb(gameId);
    
    return { success: true };
  }
  
  // Get current game state
  public getGame(gameId: string): {
    state: GameState;
    fogState: { white: FogState; black: FogState };
    playerIds: { white: string; black: string };
    timers: { white: number; black: number };
    gameMode: GameMode;
  } | null {
    const game = this.activeGames.get(gameId);
    if (!game) return null;
    
    return {
      state: this.getGameState(game.chess),
      fogState: game.fogState,
      playerIds: game.playerIds,
      timers: game.timers,
      gameMode: game.gameMode
    };
  }
  
  // Get game by ID from database
  public async getGameById(gameId: string): Promise<IGame | null> {
    try {
      return await GameModel.findOne({ gameId });
    } catch (error) {
      console.error('Error getting game by ID:', error);
      return null;
    }
  }
  
  // Get user's recent games
  public async getUserGames(userId: string, limit: number = 10): Promise<IGame[]> {
    try {
      return await GameModel.find({
        $or: [
          { whitePlayerId: userId },
          { blackPlayerId: userId }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error getting user games:', error);
      return [];
    }
  }
  
  // End a game
  private endGame(gameId: string, winner: 'white' | 'black' | null, reason: 'checkmate' | 'draw' | 'timeout' | 'resignation'): void {
    const game = this.activeGames.get(gameId);
    if (!game) return;
    
    // Stop the timer
    const interval = this.timerIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.timerIntervals.delete(gameId);
    }
    
    // Update player ratings
    if (winner) {
      const winnerId = winner === 'white' ? game.playerIds.white : game.playerIds.black;
      const loserId = winner === 'white' ? game.playerIds.black : game.playerIds.white;
      
      // Update ratings in user service
      this.userService.updateRating(winnerId, true);
      this.userService.updateRating(loserId, false);
    } else {
      // Draw - update both ratings as a draw
      this.userService.updateRating(game.playerIds.white, null);
      this.userService.updateRating(game.playerIds.black, null);
    }
    
    // Save final game state to the database
    this.saveGameToDb(gameId, true, winner, reason);
    
    // Remove game from active games after a delay
    setTimeout(() => {
      this.activeGames.delete(gameId);
    }, 300000); // Keep game in memory for 5 minutes after it ends
  }
  
  // Start the game timer
  private startGameTimer(gameId: string): void {
    const interval = setInterval(() => {
      const game = this.activeGames.get(gameId);
      if (!game) {
        clearInterval(interval);
        this.timerIntervals.delete(gameId);
        return;
      }
      
      // Update time for the player whose turn it is
      const isWhiteTurn = game.chess.turn() === 'w';
      const currentPlayer = isWhiteTurn ? 'white' : 'black';
      
      // Deduct one second
      game.timers[currentPlayer] = Math.max(0, game.timers[currentPlayer] - 1);
      
      // Check for timeout
      if (game.timers[currentPlayer] === 0) {
        this.endGame(gameId, isWhiteTurn ? 'black' : 'white', 'timeout');
      }
    }, 1000);
    
    this.timerIntervals.set(gameId, interval);
  }
  
  // Calculate fog-of-war reveals based on a move
  private calculateFogReveals(
    move: Move, 
    playerColor: 'white' | 'black',
    game: any
  ): string[] {
    // Similar logic to the client-side calculation
    const newReveals: string[] = [];
    
    // Convert algebraic notation to coordinates
    const toCoord = algebraicToCoordinates(move.to);
    
    // Define opponent's back rows (which have fog)
    const opponentBackRows = playerColor === 'white' ? [0, 1] : [6, 7];
    
    // If the move goes to opponent's back rows
    if (opponentBackRows.includes(toCoord.y)) {
      // Get adjacent squares that should be revealed
      const adjacentOffsets = [
        {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1},
        {x: -1, y: 0},                  {x: 1, y: 0},
        {x: -1, y: 1},  {x: 0, y: 1},   {x: 1, y: 1}
      ];
      
      for (const offset of adjacentOffsets) {
        const revealX = toCoord.x + offset.x;
        const revealY = toCoord.y + offset.y;
        
        // Check bounds
        if (revealX >= 0 && revealX < 8 && revealY >= 0 && revealY < 8) {
          const posKey = `${revealX},${revealY}`;
          
          // Only add if not already revealed
          if (!game.fogState[playerColor].revealedPositions.includes(posKey)) {
            newReveals.push(posKey);
          }
        }
      }
    }
    
    return newReveals;
  }
  
  // Get game state in the format expected by the client
  private getGameState(chess: Chess): GameState {
    return {
      status: chess.isGameOver() ? 'finished' : 'active',
      pieces: this.convertChessJsToInternalRepresentation(chess),
      lastMove: this.getLastMove(chess),
      check: chess.isCheck(),
      checkmate: chess.isCheckmate()
    };
  }
  
  // Convert Chess.js board to our internal representation
  private convertChessJsToInternalRepresentation(chess: Chess): Record<string, any> {
    const pieces: Record<string, any> = {};
    const board = chess.board();
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const square = board[y][x];
        if (square) {
          pieces[`${x},${y}`] = {
            type: square.type,
            color: square.color === 'w' ? 'white' : 'black',
          };
        }
      }
    }
    
    return pieces;
  }
  
  // Get the last move from chess.js history
  private getLastMove(chess: Chess): Move | null {
    const history = chess.history({ verbose: true });
    if (history.length === 0) return null;
    
    const lastMoveObj = history[history.length - 1];
    return {
      from: lastMoveObj.from,
      to: lastMoveObj.to,
      promotion: lastMoveObj.promotion
    };
  }
  
  // Save the game state to the database
  private async saveGameToDb(
    gameId: string, 
    isFinished: boolean = false,
    winner: 'white' | 'black' | null = null,
    reason: string | null = null
  ): Promise<void> {
    const game = this.activeGames.get(gameId);
    if (!game) return;
    
    try {
      // Convert the game state to a format suitable for the database
      const gameData = {
        gameId,
        whitePlayerId: game.playerIds.white,
        blackPlayerId: game.playerIds.black,
        pgn: game.chess.pgn(),
        fogState: game.fogState,
        timers: game.timers,
        gameMode: game.gameMode,
        isFinished,
        winner,
        endReason: reason,
        lastMoveTime: game.lastMoveTime
      };
      
      // Upsert the game in the database
      await GameModel.findOneAndUpdate(
        { gameId },
        gameData,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error saving game to database:', error);
    }
  }
}