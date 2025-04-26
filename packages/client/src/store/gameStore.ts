import create from 'zustand';
import { Chess } from 'chess.js';
import { Socket } from 'socket.io-client';
import { 
  Position, 
  FogState, 
  GameState, 
  Move, 
  Piece, 
  calculateVisibleSquares,
  algebraicToCoordinates
} from '@fearscape-chess/shared';

interface GameStore {
  // Game state
  gameState: GameState;
  fogState: FogState;
  gameId: string | null;
  chess: Chess | null;
  playerColor: 'white' | 'black' | null;
  isMyTurn: boolean;
  timeLeft: { white: number; black: number };
  gameMode: 'standard' | 'blitz';
  
  // Socket connection
  socket: Socket | null;
  
  // Actions
  initGame: (gameId: string, playerColor: 'white' | 'black', gameMode: 'standard' | 'blitz') => void;
  makeMove: (move: Move) => void;
  revealFog: (position: Position) => void;
  handleOpponentMove: (move: Move) => void;
  updateFogState: (newFogState: FogState) => void;
  resetGame: () => void;
  connectSocket: (socket: Socket) => void;
  disconnectSocket: () => void;
  updateTimeLeft: (white: number, black: number) => void;
  
  // Helpers
  isSquareVisible: (position: Position) => boolean;
  getVisiblePieces: () => Record<string, Piece>;
}

const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  gameState: {
    status: 'waiting',
    pieces: {},
    lastMove: null,
    check: false,
    checkmate: false,
  },
  fogState: {
    revealedPositions: [],
  },
  gameId: null,
  chess: null,
  playerColor: null,
  isMyTurn: false,
  timeLeft: { white: 0, black: 0 },
  gameMode: 'standard',
  socket: null,
  
  // Initialize a new game
  initGame: (gameId, playerColor, gameMode) => {
    const chess = new Chess();
    
    set({
      gameId,
      chess,
      playerColor,
      isMyTurn: playerColor === 'white',
      gameMode,
      timeLeft: gameMode === 'standard' 
        ? { white: 600, black: 600 } // 10 minutes
        : { white: 180, black: 180 }, // 3 minutes for blitz
      gameState: {
        status: 'active',
        pieces: convertChessJsToInternalRepresentation(chess),
        lastMove: null,
        check: chess.isCheck(),
        checkmate: chess.isCheckmate(),
      },
      fogState: {
        revealedPositions: [],
      }
    });
    
    // Set up socket event listeners if socket exists
    if (get().socket) {
      setupSocketListeners(get().socket, get, set);
    }
  },
  
  // Make a move and send it to the server
  makeMove: (move) => {
    const { chess, socket, gameId, playerColor } = get();
    
    if (!chess || !socket || !gameId || !playerColor) return;
    if (chess.isGameOver()) return;
    
    // Attempt to make the move
    try {
      const moveResult = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion
      });
      
      if (!moveResult) return; // Invalid move
      
      // Update game state
      set({
        gameState: {
          ...get().gameState,
          pieces: convertChessJsToInternalRepresentation(chess),
          lastMove: move,
          check: chess.isCheck(),
          checkmate: chess.isCheckmate(),
        },
        isMyTurn: false,
      });
      
      // Calculate fog-of-war reveals based on the move
      const fogReveals = calculateFogReveals(move, playerColor, get().fogState);
      
      // Update fog state with new reveals
      if (fogReveals.length > 0) {
        set({
          fogState: {
            ...get().fogState,
            revealedPositions: [
              ...get().fogState.revealedPositions,
              ...fogReveals
            ]
          }
        });
      }
      
      // Send move to the server
      socket.emit('game:move', {
        gameId,
        move,
        fogReveals
      });
    } catch (error) {
      console.error('Invalid move:', error);
    }
  },
  
  // Handle opponent's move received from the server
  handleOpponentMove: (move) => {
    const { chess } = get();
    
    if (!chess) return;
    
    // Apply opponent's move
    try {
      chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion
      });
      
      // Update game state
      set({
        gameState: {
          ...get().gameState,
          pieces: convertChessJsToInternalRepresentation(chess),
          lastMove: move,
          check: chess.isCheck(),
          checkmate: chess.isCheckmate(),
        },
        isMyTurn: true,
      });
    } catch (error) {
      console.error('Error applying opponent move:', error);
    }
  },
  
  // Reveal fog at a specific position
  revealFog: (position) => {
    const { socket, gameId, fogState } = get();
    const posKey = `${position.x},${position.y}`;
    
    if (!socket || !gameId) return;
    if (fogState.revealedPositions.includes(posKey)) return; // Already revealed
    
    // Update local fog state
    set({
      fogState: {
        ...fogState,
        revealedPositions: [...fogState.revealedPositions, posKey]
      }
    });
    
    // Send fog reveal to server
    socket.emit('game:revealFog', {
      gameId,
      position
    });
  },
  
  // Update fog state (usually from server)
  updateFogState: (newFogState) => {
    set({ fogState: newFogState });
  },
  
  // Reset the game
  resetGame: () => {
    set({
      gameState: {
        status: 'waiting',
        pieces: {},
        lastMove: null,
        check: false,
        checkmate: false,
      },
      fogState: {
        revealedPositions: [],
      },
      gameId: null,
      chess: null,
      playerColor: null,
      isMyTurn: false,
    });
  },
  
  // Connect to Socket.io
  connectSocket: (socket) => {
    set({ socket });
    setupSocketListeners(socket, get, set);
  },
  
  // Disconnect Socket.io
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.off('game:opponentMove');
      socket.off('game:fogReveal');
      socket.off('game:timeUpdate');
    }
    set({ socket: null });
  },
  
  // Update game timers
  updateTimeLeft: (white, black) => {
    set({ timeLeft: { white, black } });
  },
  
  // Check if a square is visible through fog of war
  isSquareVisible: (position) => {
    const { playerColor, gameState, fogState } = get();
    
    if (!playerColor) return true;
    
    // Use the shared utility function
    const visibleSquares = calculateVisibleSquares(
      playerColor,
      gameState.pieces,
      fogState.revealedPositions
    );
    
    const posKey = `${position.x},${position.y}`;
    return visibleSquares.has(posKey);
  },
  
  // Get only visible pieces for rendering
  getVisiblePieces: () => {
    const { gameState, playerColor } = get();
    
    if (!playerColor) return gameState.pieces;
    
    const visiblePieces: Record<string, Piece> = {};
    
    // Filter pieces to only include visible ones
    for (const [posKey, piece] of Object.entries(gameState.pieces)) {
      const [x, y] = posKey.split(',').map(Number);
      
      if (get().isSquareVisible({ x, y })) {
        visiblePieces[posKey] = piece;
      }
    }
    
    return visiblePieces;
  }
}));

// Helper functions
function setupSocketListeners(socket: Socket, get: () => GameStore, set: (state: Partial<GameStore>) => void) {
  socket.on('game:opponentMove', (data: { move: Move, fogReveals: string[] }) => {
    get().handleOpponentMove(data.move);
    
    // Update fog reveals from opponent's move
    if (data.fogReveals.length > 0) {
      set({
        fogState: {
          ...get().fogState,
          revealedPositions: [
            ...get().fogState.revealedPositions,
            ...data.fogReveals
          ]
        }
      });
    }
  });
  
  socket.on('game:fogReveal', (data: { position: Position }) => {
    const posKey = `${data.position.x},${data.position.y}`;
    set({
      fogState: {
        ...get().fogState,
        revealedPositions: [
          ...get().fogState.revealedPositions,
          posKey
        ]
      }
    });
  });
  
  socket.on('game:timeUpdate', (data: { white: number, black: number }) => {
    get().updateTimeLeft(data.white, data.black);
  });
}

function convertChessJsToInternalRepresentation(chess: Chess): Record<string, Piece> {
  const pieces: Record<string, Piece> = {};
  
  // Chess.js board is an 8x8 array with pieces or null
  const board = chess.board();
  
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const square = board[y][x];
      if (square) {
        pieces[`${x},${y}`] = {
          type: square.type as any,
          color: square.color === 'w' ? 'white' : 'black',
        };
      }
    }
  }
  
  return pieces;
}

function calculateFogReveals(
  move: Move, 
  playerColor: 'white' | 'black',
  currentFogState: FogState
): string[] {
  // Implementation of fog-of-war reveal rules
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
        if (!currentFogState.revealedPositions.includes(posKey)) {
          newReveals.push(posKey);
        }
      }
    }
  }
  
  return newReveals;
}

export default useGameStore;