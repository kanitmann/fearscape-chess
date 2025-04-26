import { Position } from '../types/game';

// Convert algebraic notation to coordinates
export function algebraicToCoordinates(algebraic: string): Position {
  const file = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(algebraic[1]);
  return { x: file, y: rank };
}

// Convert coordinates to algebraic notation
export function coordinatesToAlgebraic(position: Position): string {
  const file = String.fromCharCode(position.x + 'a'.charCodeAt(0));
  const rank = 8 - position.y;
  return `${file}${rank}`;
}

// Calculate which squares are visible through fog of war
export function calculateVisibleSquares(
  playerColor: 'white' | 'black',
  pieces: Record<string, { type: string; color: string }>,
  revealedPositions: string[]
): Set<string> {
  const visibleSquares = new Set<string>();
  
  // Add all revealed positions
  revealedPositions.forEach(pos => visibleSquares.add(pos));
  
  // Player's half of the board is always visible
  const playerRows = playerColor === 'white' ? [4, 5, 6, 7] : [0, 1, 2, 3];
  
  for (let y = 0; y < 8; y++) {
    // Add all squares in player's half
    if (playerRows.includes(y)) {
      for (let x = 0; x < 8; x++) {
        visibleSquares.add(`${x},${y}`);
      }
    }
  }
  
  // Add all squares adjacent to player's pieces
  for (const [posKey, piece] of Object.entries(pieces)) {
    if (piece.color !== playerColor) continue;
    
    const [x, y] = posKey.split(',').map(Number);
    
    // Add surrounding squares
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const newX = x + dx;
        const newY = y + dy;
        
        // Check bounds
        if (newX >= 0 && newX < 8 && newY >= 0 && newY < 8) {
          visibleSquares.add(`${newX},${newY}`);
        }
      }
    }
  }
  
  return visibleSquares;
}