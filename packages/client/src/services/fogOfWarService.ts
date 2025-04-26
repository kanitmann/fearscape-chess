// packages/client/src/services/fogOfWarService.ts (updated)

import { Chess, Square } from 'chess.js';

export class FogOfWarService {
  /**
   * Calculate which squares should be revealed after a move
   */
  static calculateRevealedSquares(
    from: string,
    to: string,
    playerColor: 'white' | 'black',
    game: Chess,
    visibleSquares: Set<string>,
    gameMode: 'standard' | 'blitz'
  ): string[] {
    const revealedSquares: string[] = [];
    
    // Different game modes have different reveal rules
    if (gameMode === 'standard') {
      // In standard mode, captures and checks reveal squares
      const lastMove = game.history({ verbose: true }).slice(-1)[0];
      const capturedPiece = lastMove?.captured;
      
      if (capturedPiece) {
        // Reveal a 3x3 area around the capture
        this.revealAreaAroundSquare(to, visibleSquares, revealedSquares);
      }
      
      // Check if move is a check
      if (game.isCheck()) {
        // Find the king's position
        const kingPosition = this.findKingPosition(game);
        if (kingPosition && !visibleSquares.has(kingPosition)) {
          revealedSquares.push(kingPosition);
          // Also reveal a small area around the king
          this.revealAreaAroundSquare(kingPosition, visibleSquares, revealedSquares);
        }
      }
    } else if (gameMode === 'blitz') {
      // In blitz mode, reveal in the direction of movement
      this.revealInMoveDirection(from, to, game, visibleSquares, revealedSquares);
      
      // Additionally, in blitz mode, any capture reveals the 8 surrounding squares
      const lastMove = game.history({ verbose: true }).slice(-1)[0];
      const capturedPiece = lastMove?.captured;
      
      if (capturedPiece) {
        this.revealAreaAroundSquare(to, visibleSquares, revealedSquares);
      }
    }
    
    return revealedSquares;
  }
  
  /**
   * Reveal a 3x3 area around a square
   */
  private static revealAreaAroundSquare(
    square: string, 
    visibleSquares: Set<string>, 
    revealedSquares: string[]
  ): void {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    const file = square.charAt(0);
    const rank = square.charAt(1);
    
    const fileIndex = files.indexOf(file);
    const rankIndex = ranks.indexOf(rank);
    
    // Check surrounding squares
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const newFileIndex = fileIndex + i;
        const newRankIndex = rankIndex + j;
        
        // Skip if out of bounds
        if (
          newFileIndex < 0 || 
          newFileIndex >= files.length || 
          newRankIndex < 0 || 
          newRankIndex >= ranks.length
        ) {
          continue;
        }
        
        const newSquare = `${files[newFileIndex]}${ranks[newRankIndex]}`;
        
        // Skip if already visible
        if (visibleSquares.has(newSquare)) {
          continue;
        }
        
        // Add to revealed squares
        revealedSquares.push(newSquare);
      }
    }
  }
  
  /**
   * Reveal squares in the direction of movement
   */
  private static revealInMoveDirection(
    from: string,
    to: string,
    game: Chess,
    visibleSquares: Set<string>,
    revealedSquares: string[]
  ): void {
    // Determine movement direction
    const fromFile = from.charCodeAt(0);
    const fromRank = parseInt(from.charAt(1));
    const toFile = to.charCodeAt(0);
    const toRank = parseInt(to.charAt(1));
    
    const fileDirection = Math.sign(toFile - fromFile);
    const rankDirection = Math.sign(toRank - fromRank);
    
    // Continue in the same direction for revealing
    let currentFile = toFile;
    let currentRank = toRank;
    
    // Only continue in direction if it's a straight or diagonal move
    if (fileDirection !== 0 || rankDirection !== 0) {
      // Reveal up to 2 squares in the direction of movement
      for (let i = 0; i < 2; i++) {
        currentFile += fileDirection;
        currentRank += rankDirection;
        
        // Check if we're still on the board
        if (
          currentFile < 97 || currentFile > 104 || // 'a' to 'h'
          currentRank < 1 || currentRank > 8
        ) {
          break;
        }
        
        const square = `${String.fromCharCode(currentFile)}${currentRank}`;
        
        // Skip if already visible
        if (visibleSquares.has(square)) {
          continue;
        }
        
        // Add to revealed squares
        revealedSquares.push(square);
        
        // Stop revealing if we hit a piece
        const piece = game.get(square as Square);
        if (piece) {
          break;
        }
      }
    }
  }
  
  /**
   * Find the king's position
   */
  private static findKingPosition(game: Chess): string | null {
    const board = game.board();
    const turn = game.turn();
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const file = String.fromCharCode(97 + j); // Convert 0-7 to a-h
          const rank = 8 - i; // Convert 0-7 to 8-1
          return `${file}${rank}`;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check if a square should be visible
   */
  static isSquareVisible(
    square: string,
    playerColor: 'white' | 'black',
    visibleSquares: Set<string>
  ): boolean {
    // Player can always see their own half of the board
    const rank = parseInt(square[1]);
    const playerHalf = playerColor === 'white' ? [1, 2, 3, 4] : [5, 6, 7, 8];
    
    if (playerHalf.includes(rank)) {
      return true;
    }
    
    // Otherwise check if it's in the visible squares set
    return visibleSquares.has(square);
  }
}