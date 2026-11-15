import type { Types } from 'mongoose';
import { loadEnv } from '../src/config/env';
import {
  PushSendError,
  type PushSender,
  type PushSendOptions,
  type PushTarget,
} from '../src/modules/notifications/push-sender';
import { NotificationService } from '../src/modules/notifications/notification.service';
import type {
  JsonRequest,
  JsonWriter,
  TranscribeInput,
  Transcriber,
} from '../src/modules/ai/providers/types';

export const APP_ORIGIN = 'http://localhost:5173';
export const CLIENT_HEADERS = { 'X-Requested-With': 'buzzprep', Origin: APP_ORIGIN };

export function testEnv(overrides: Record<string, string> = {}) {
  return loadEnv({
    NODE_ENV: 'test',
    PUBLIC_APP_URL: APP_ORIGIN,
    SESSION_SECRET: 'test-secret-'.padEnd(48, 'x'),
    LOG_LEVEL: 'silent',
    ...overrides,
  });
}

/** Records pushes instead of sending them; can simulate push-service failures. */
export class FakePushSender implements PushSender {
  readonly enabled = true;
  readonly publicKey = 'BFakePublicKeyForTests';
  sent: Array<{ endpoint: string; payload: any; options: PushSendOptions }> = [];
  failWith: number | null = null;

  async send(target: PushTarget, payload: string, options: PushSendOptions) {
    if (this.failWith !== null) throw new PushSendError('simulated failure', this.failWith);
    this.sent.push({ endpoint: target.endpoint, payload: JSON.parse(payload), options });
    return { statusCode: 201 };
  }
}

/** Reconciles only when a test asks for it, so results never depend on the wall clock. */
export class ManualNotificationService extends NotificationService {
  queued = new Set<string>();
  override queueReconcile(userId: Types.ObjectId | string) {
    this.queued.add(userId.toString());
  }
}

/** Speech-to-text stand-in: records calls, returns a fixed transcript. */
export class FakeTranscriber implements Transcriber {
  readonly provider = 'fake';
  readonly label = 'Fake';
  readonly model = 'fake-transcriber';
  calls: Omit<TranscribeInput, 'audio'>[] = [];
  text = 'Spoken: Dijkstra with a min-heap.';
  /** Throw this instead of transcribing (e.g. a rejected key). */
  failWith: Error | null = null;
  async transcribe({ audio: _audio, ...rest }: TranscribeInput) {
    this.calls.push(rest);
    if (this.failWith) throw this.failWith;
    return this.text;
  }
}

/** Notes model stand-in: answers by schema name, records prompts. */
export class FakeWriter implements JsonWriter {
  readonly provider = 'fake';
  readonly label = 'Fake';
  readonly model = 'fake-writer';
  calls: JsonRequest[] = [];
  async generateJson(request: JsonRequest) {
    this.calls.push(request);
    if (request.schemaName === 'weekly_summary') {
      return {
        headline: 'A graphs week.',
        wins: ['BFS'],
        topics: [],
        weakSpots: [],
        revisionPlan: [],
        nextWeek: [],
      };
    }
    return {
      summary: 'Graphs.',
      topics: [{ name: 'BFS', keyPoints: ['Mark visited on push'], confidence: 'solid' }],
      problems: [{ name: 'Rotting Oranges', outcome: 'hints', note: '' }],
      mistakes: [],
      questions: [],
      reviseNext: ['Dijkstra'],
    };
  }
}
