import mongoose, { Schema, Document } from 'mongoose';
import { GameMode, FogState } from '@fearscape-chess/shared';

export interface IGame extends Document {
  gameId: string;
  whitePlayerId: string;
  blackPlayerId: string;
  pgn: string;
  fogState: {
    white: FogState;
    black: FogState;
  };
  timers: {
    white: number;
    black: number;
  };
  gameMode: GameMode;
  isFinished: boolean;
  winner: 'white' | 'black' | null;
  endReason: string | null;
  lastMoveTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema: Schema = new Schema({
  gameId: { type: String, required: true, unique: true },
  whitePlayerId: { type: String, required: true },
  blackPlayerId: { type: String, required: true },
  pgn: { type: String, required: true },
  fogState: {
    white: {
      revealedPositions: { type: [String], default: [] }
    },
    black: {
      revealedPositions: { type: [String], default: [] }
    }
  },
  timers: {
    white: { type: Number, required: true },
    black: { type: Number, required: true }
  },
  gameMode: { type: String, enum: ['standard', 'blitz'], default: 'standard' },
  isFinished: { type: Boolean, default: false },
  winner: { type: String, enum: ['white', 'black', null], default: null },
  endReason: { type: String, default: null },
  lastMoveTime: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model<IGame>('Game', GameSchema);