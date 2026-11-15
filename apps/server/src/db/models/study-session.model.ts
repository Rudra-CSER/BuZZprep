import { Schema, model, type Types } from 'mongoose';

export interface IStudySession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  trackId: Types.ObjectId | null;
  topicId: Types.ObjectId | null;
  activityId: Types.ObjectId | null;
  occurrenceDate: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  focus: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const studySessionSchema = new Schema<IStudySession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    trackId: { type: Schema.Types.ObjectId, ref: 'LearningTrack', default: null },
    topicId: { type: Schema.Types.ObjectId, ref: 'LearningTopic', default: null },
    activityId: { type: Schema.Types.ObjectId, ref: 'Activity', default: null },
    occurrenceDate: { type: String, default: null },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: null },
    focus: { type: Number, default: null, min: 1, max: 5 },
    notes: { type: String, default: null, maxlength: 5000 },
  },
  { timestamps: true },
);
studySessionSchema.index({ userId: 1, startedAt: -1 });

export const StudySession = model<IStudySession>('StudySession', studySessionSchema);
