import type { Types } from 'mongoose';

export interface AuthContext {
  userId: Types.ObjectId;
  sessionId: Types.ObjectId;
  role: 'user' | 'admin';
  email: string;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
