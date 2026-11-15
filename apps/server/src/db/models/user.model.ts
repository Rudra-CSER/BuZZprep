import { Schema, model, type Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  displayName: string;
  role: 'user' | 'admin';
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
userSchema.index({ email: 1 }, { unique: true });

export const User = model<IUser>('User', userSchema);
