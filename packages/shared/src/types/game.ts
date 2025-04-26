// Game state types
export type ChessPieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type ChessPieceColor = 'white' | 'black';

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: ChessPieceType;
  color: ChessPieceColor;
}

export interface Move {
  from: string;
  to: string;
  promotion?: string;
}

export interface GameState {
  status: 'waiting' | 'active' | 'finished';
  pieces: Record<string, Piece>;
  lastMove: Move | null;
  check: boolean;
  checkmate: boolean;
}

export interface FogState {
  revealedPositions: string[];
}

export type GameMode = 'standard' | 'blitz';

// Socket event types
export interface SocketGameEvents {
  'game:join': (data: { gameId: string }) => void;
  'game:state': (data: {
    state: GameState;
    fogState: FogState;
    playerColor: ChessPieceColor;
    timers: { white: number; black: number };
    gameMode: GameMode;
  }) => void;
  'game:move': (data: { gameId: string; move: Move; fogReveals: string[] }) => void;
  'game:opponentMove': (data: { move: Move; fogReveals: string[]; state: GameState }) => void;
  'game:revealFog': (data: { gameId: string; position: Position }) => void;
  'game:fogReveal': (data: { position: Position }) => void;
  'game:timeUpdate': (data: { white: number; black: number }) => void;
  'game:error': (data: { message: string }) => void;
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

// Auth types
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}