import { Schema, model, type Types } from 'mongoose';

export interface ISession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** SHA-256 of the cookie token; the raw token is never stored. */
  tokenHash: string;
  expiresAt: Date;
  lastSeenAt: Date;
  userAgent: string | null;
  createdAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, default: () => new Date() },
    userAgent: { type: String, default: null, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = model<ISession>('Session', sessionSchema);
