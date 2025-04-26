import { Chess } from 'chess.js';

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
      // In standard mode, captures reveal surrounding squares
      const capturedPiece = game.history({ verbose: true }).slice(-1)[0]?.captured;
      
      if (capturedPiece) {
        // Reveal a 3x3 area around the capture
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
        
        const toFile = to.charAt(0);
        const toRank = to.charAt(1);
        
        const fileIndex = files.indexOf(toFile);
        const rankIndex = ranks.indexOf(toRank);
        
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
            
            const square = `${files[newFileIndex]}${ranks[newRankIndex]}`;
            
            // Skip if already visible
            if (visibleSquares.has(square)) {
              continue;
            }
            
            // Add to revealed squares
            revealedSquares.push(square);
          }
        }
      }
      
      // Check if move is a check
      if (game.isCheck()) {
        // Find the king's position
        const board = game.board();
        let kingSquare = '';
        
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 8; j++) {
            const piece = board[i][j];
            if (piece && piece.type === 'k' && piece.color === game.turn()) {
              const file = String.fromCharCode(97 + j); // Convert 0-7 to a-h
              const rank = 8 - i; // Convert 0-7 to 8-1
              kingSquare = `${file}${rank}`;
              break;
            }
          }
          if (kingSquare) break;
        }
        
        // If king is found and not already visible, reveal it
        if (kingSquare && !visibleSquares.has(kingSquare)) {
          revealedSquares.push(kingSquare);
        }
      }
    } else if (gameMode === 'blitz') {
      // In blitz mode, any move reveals adjacent squares in the direction of movement
      
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
          const piece = game.get(square);
          if (piece) {
            break;
          }
        }
      }
      
      // Additionally, in blitz mode, any capture reveals the 8 surrounding squares
      const capturedPiece = game.history({ verbose: true }).slice(-1)[0]?.captured;
      
      if (capturedPiece) {
        // Reveal a 3x3 area around the capture
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
        
        const toFileBlitz = to.charAt(0);
        const toRankBlitz = to.charAt(1);
        
        const fileIndex = files.indexOf(toFileBlitz);
        const rankIndex = ranks.indexOf(toRankBlitz);
        
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
            
            const square = `${files[newFileIndex]}${ranks[newRankIndex]}`;
            
            // Skip if already visible
            if (visibleSquares.has(square)) {
              continue;
            }
            
            // Add to revealed squares
            revealedSquares.push(square);
          }
        }
      }
    }
    
    return revealedSquares;
  }
  
  /**
   * Check if all opponent pieces have been revealed
   */
  static allOpponentPiecesRevealed(
    game: Chess, 
    playerColor: 'white' | 'black', 
    visibleSquares: Set<string>
  ): boolean {
    const board = game.board();
    const opponentColor = playerColor === 'white' ? 'b' : 'w';
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.color === opponentColor) {
          const file = String.fromCharCode(97 + j); // Convert 0-7 to a-h
          const rank = 8 - i; // Convert 0-7 to 8-1
          const square = `${file}${rank}`;
          
          if (!visibleSquares.has(square)) {
            return false;
          }
        }
      }
    }
    
    return true;
  }
}