import mongoose, { Schema, Document } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '@fearscape-chess/shared';

// Extend the shared User interface for the Document
export interface IUser extends User, Document {
  password?: string;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  username: { type: String, required: true, unique: true },
  googleId: { type: String },
  rating: { type: Number, default: 1200 },
  gamesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 }
}, { timestamps: true });

// Pre-save hook to hash password
UserSchema.pre<IUser>('save', async function(next) {
  // Only hash the password if it has been modified or is new
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);