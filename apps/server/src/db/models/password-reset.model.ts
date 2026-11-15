import { Schema, model, type Types } from 'mongoose';

/**
 * A one-time password reset link. Only the SHA-256 of its token is stored, so a database leak
 * can't be turned into working links; expired links are removed by the TTL index.
 */
export interface IPasswordReset {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  /** Emailed to the account (`email`) or made by the server owner on the command line (`owner`). */
  via: 'email' | 'owner';
  createdAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    via: { type: String, enum: ['email', 'owner'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
passwordResetSchema.index({ tokenHash: 1 }, { unique: true });
passwordResetSchema.index({ userId: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = model<IPasswordReset>('PasswordReset', passwordResetSchema);
