import mongoose from 'mongoose';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { createAiService } from '../src/modules/ai/ai.service';
import { failureMessage } from '../src/modules/ai/job-queue';
import { createAnthropicWriter } from '../src/modules/ai/providers/anthropic-writer';
import { AiProviderError } from '../src/modules/ai/providers/http';
import { createOpenAiTranscriber } from '../src/modules/ai/providers/openai-transcriber';
import { createOpenAiWriter } from '../src/modules/ai/providers/openai-writer';
import {
  buildNotesPrompt,
  buildWeeklyPrompt,
  NOTES_SCHEMA,
  transcriptionHint,
  WEEKLY_SCHEMA,
} from '../src/modules/journal/journal-prompts';
import { compileWeek } from '@buzzprep/shared';
import { CLIENT_HEADERS, FakePushSender, ManualNotificationService, testEnv } from './helpers';

// These tests never touch MongoDB or the network.
mongoose.set('bufferCommands', false);

const KEY = 'sk-test-secret-key-never-logged';

type Call = { url: string; init: RequestInit };

function mockFetch(...responses: Array<{ status?: number; body: unknown }>) {
  const calls: Call[] = [];
  const queue = [...responses];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const next = queue.shift() ?? { status: 500, body: {} };
      return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AI configuration', () => {
  it('is off without keys, and says which key enables what', () => {
    const ai = createAiService(testEnv());
    expect(ai.availability).toEqual({ transcription: false, notes: false });
    expect(ai.describe()).toEqual({ transcription: null, notes: null });
    expect(ai.notes.map((n) => n.message).join('\n')).toMatch(/OPENAI_API_KEY/);
    expect(ai.notes.map((n) => n.message).join('\n')).toMatch(/ANTHROPIC_API_KEY/);
  });

  it('uses the cloud defaults when keys are set', () => {
    const ai = createAiService(testEnv({ OPENAI_API_KEY: KEY, ANTHROPIC_API_KEY: KEY }));
    expect(ai.availability).toEqual({ transcription: true, notes: true });
    expect(ai.describe()).toEqual({
      transcription: { provider: 'OpenAI', model: 'gpt-transcribe' },
      notes: { provider: 'Anthropic', model: 'claude-sonnet-5-5' },
    });
  });

  it('lets one OpenAI key cover both, with model overrides', () => {
    const ai = createAiService(
      testEnv({ OPENAI_API_KEY: KEY, AI_NOTES_PROVIDER: 'openai', AI_NOTES_MODEL: 'gpt-6-luna' }),
    );
    expect(ai.describe().notes).toEqual({ provider: 'OpenAI', model: 'gpt-6-luna' });
  });

  it('turns features off on "none" or an unknown (commented-out) provider', () => {
    const ai = createAiService(
      testEnv({
        OPENAI_API_KEY: KEY,
        ANTHROPIC_API_KEY: KEY,
        AI_TRANSCRIBE_PROVIDER: 'local',
        AI_NOTES_PROVIDER: 'none',
      }),
    );
    expect(ai.availability).toEqual({ transcription: false, notes: false });
    expect(ai.notes.map((n) => n.message).join('\n')).toMatch(
      /AI_TRANSCRIBE_PROVIDER=local is not available/,
    );
  });

  it('picks Groq automatically when only its key is set', () => {
    const ai = createAiService(testEnv({ GROQ_API_KEY: 'gsk_test' }));
    expect(ai.describe()).toEqual({
      transcription: { provider: 'Groq', model: 'whisper-large-v3' },
      notes: { provider: 'Groq', model: 'openai/gpt-oss-120b' },
    });
    // Pinned providers win over "auto".
    const pinned = createAiService(
      testEnv({
        OPENAI_API_KEY: KEY,
        GROQ_API_KEY: 'gsk_test',
        AI_TRANSCRIBE_PROVIDER: 'groq',
        AI_TRANSCRIBE_MODEL: 'whisper-large-v3-turbo',
      }),
    );
    expect(pinned.describe().transcription).toEqual({
      provider: 'Groq',
      model: 'whisper-large-v3-turbo',
    });
  });

  it('accepts one shared LLM_MODEL_API_KEY and routes it by its prefix', () => {
    const groq = createAiService(testEnv({ LLM_MODEL_API_KEY: 'gsk_test' }));
    expect(groq.describe()).toEqual({
      transcription: { provider: 'Groq', model: 'whisper-large-v3' },
      notes: { provider: 'Groq', model: 'openai/gpt-oss-120b' },
    });
    // The shared key's provider goes first, even if another provider also has a key.
    const first = createAiService(
      testEnv({ LLM_MODEL_API_KEY: 'gsk_test', OPENAI_API_KEY: KEY, ANTHROPIC_API_KEY: KEY }),
    );
    expect(first.describe().transcription?.provider).toBe('Groq');
    expect(first.describe().notes?.provider).toBe('Groq');
    // A key without a known prefix is treated as an OpenAI key.
    const openai = createAiService(testEnv({ LLM_API_KEY: KEY }));
    expect(openai.describe()).toEqual({
      transcription: { provider: 'OpenAI', model: 'gpt-transcribe' },
      notes: { provider: 'OpenAI', model: 'gpt-6.1-sol' },
    });
  });

  it('spots a key saved under the wrong name instead of failing later', () => {
    const misplaced = createAiService(testEnv({ OPENAI_API_KEY: 'gsk_test' }));
    expect(misplaced.availability).toEqual({ transcription: false, notes: false });
    expect(misplaced.notes.map((n) => n.message).join('\n')).toMatch(
      /OPENAI_API_KEY holds a Groq key.*GROQ_API_KEY/,
    );
    // With the Groq key also in place, "auto" moves on to Groq.
    const both = createAiService(testEnv({ OPENAI_API_KEY: 'gsk_test', GROQ_API_KEY: 'gsk_test' }));
    expect(both.describe().transcription?.provider).toBe('Groq');
    // A compatible server at another address may take other keys.
    const compatible = createAiService(
      testEnv({ OPENAI_API_KEY: 'gsk_test', OPENAI_BASE_URL: 'https://api.groq.com/openai/v1' }),
    );
    expect(compatible.describe().transcription?.provider).toBe('OpenAI');
  });

  it('never exposes providers or keys publicly', async () => {
    const env = testEnv({ OPENAI_API_KEY: KEY, ANTHROPIC_API_KEY: KEY });
    const app = createApp({
      env,
      notifications: new ManualNotificationService(env, new FakePushSender()),
      ai: createAiService(env),
    });
    const meta = await request(app).get('/api/meta');
    expect(meta.body.journalAi).toEqual({ transcription: true, notes: true });
    expect(JSON.stringify(meta.body)).not.toContain(KEY);
    expect(JSON.stringify(meta.body)).not.toMatch(/anthropic|openai|claude|gpt/i);
    // The journal itself needs a session.
    const journal = await request(app).get('/api/v1/journal/tonight').set(CLIENT_HEADERS);
    expect(journal.status).toBe(401);
  });
});

describe('providers', () => {
  it('transcribes over the OpenAI audio API', async () => {
    const calls = mockFetch({ body: { text: '  Today I did BFS.  ' } });
    const t = createOpenAiTranscriber({
      provider: 'openai',
      label: 'OpenAI',
      keyEnv: 'OPENAI_API_KEY',
      baseUrl: 'https://api.openai.com/v1/',
      apiKey: KEY,
      model: 'gpt-transcribe',
      timeoutMs: 5000,
    });
    const text = await t.transcribe({
      audio: new Uint8Array([1, 2, 3]),
      mimeType: 'audio/mp4',
      filename: 'journal.mp4',
      prompt: 'A study log about: Graphs.',
    });
    expect(text).toBe('Today I did BFS.');
    expect(calls[0]!.url).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe(`Bearer ${KEY}`);
    const form = calls[0]!.init.body as FormData;
    expect(form.get('model')).toBe('gpt-transcribe');
    expect(form.get('prompt')).toBe('A study log about: Graphs.');
    expect((form.get('file') as File).name).toBe('journal.mp4');
  });

  it('talks to Groq through the same OpenAI-compatible API', async () => {
    const calls = mockFetch({ status: 401, body: { error: { message: 'Invalid API Key' } } });
    const t = createOpenAiTranscriber({
      provider: 'groq',
      label: 'Groq',
      keyEnv: 'GROQ_API_KEY',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: 'gsk_test',
      model: 'whisper-large-v3',
      timeoutMs: 5000,
    });
    const err = await t
      .transcribe({ audio: new Uint8Array([1]), mimeType: 'audio/webm', filename: 'journal.webm' })
      .catch((e: Error) => e);
    expect(calls[0]!.url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe(
      'Bearer gsk_test',
    );
    expect((err as Error).message).toBe(
      'Groq rejected the API key. Check GROQ_API_KEY in the server’s .env file.',
    );
  });

  it('asks Claude for schema-constrained JSON', async () => {
    const calls = mockFetch({
      body: { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"summary":"ok"}' }] },
    });
    const w = createAnthropicWriter({
      provider: 'anthropic',
      label: 'Anthropic',
      keyEnv: 'ANTHROPIC_API_KEY',
      baseUrl: 'https://api.anthropic.com',
      apiKey: KEY,
      model: 'claude-sonnet-5-5',
      timeoutMs: 5000,
    });
    const out = await w.generateJson({
      system: 'sys',
      user: 'log',
      schemaName: 'journal_notes',
      schema: NOTES_SCHEMA,
      maxTokens: 1000,
    });
    expect(out).toEqual({ summary: 'ok' });
    expect(calls[0]!.url).toBe('https://api.anthropic.com/v1/messages');
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe(KEY);
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body).toMatchObject({
      model: 'claude-sonnet-5-5',
      max_tokens: 1000,
      system: 'sys',
      messages: [{ role: 'user', content: 'log' }],
      output_config: { format: { type: 'json_schema', schema: NOTES_SCHEMA } },
    });
  });

  it('classifies provider failures without leaking the key', async () => {
    const w = createAnthropicWriter({
      provider: 'anthropic',
      label: 'Anthropic',
      keyEnv: 'ANTHROPIC_API_KEY',
      baseUrl: 'https://api.anthropic.com',
      apiKey: KEY,
      model: 'claude-sonnet-5-5',
      timeoutMs: 5000,
    });
    const req = { system: 's', user: 'u', schemaName: 'n', schema: NOTES_SCHEMA, maxTokens: 10 };

    mockFetch({ status: 401, body: { type: 'error', error: { message: `bad key ${KEY}` } } });
    const auth = await w.generateJson(req).catch((e: AiProviderError) => e);
    expect(auth).toMatchObject({ status: 401, retryable: false });
    expect((auth as Error).message).toBe(
      'Anthropic rejected the API key. Check ANTHROPIC_API_KEY in the server’s .env file.',
    );
    expect((auth as Error).message).not.toContain(KEY);

    mockFetch({ status: 529, body: { type: 'error', error: { message: 'Overloaded' } } });
    expect(await w.generateJson(req).catch((e) => e)).toMatchObject({ retryable: true });

    mockFetch({ body: { stop_reason: 'refusal', content: [] } });
    expect(await w.generateJson(req).catch((e) => e)).toMatchObject({ retryable: false });

    mockFetch({ body: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] } });
    expect(await w.generateJson(req).catch((e) => e)).toMatchObject({ retryable: true });

    expect(failureMessage(new Error(`internal ${KEY}`))).not.toContain(KEY);
  });

  it('uses JSON Schema on chat completions, falling back to JSON mode', async () => {
    const calls = mockFetch(
      {
        status: 400,
        body: { error: { message: "Invalid parameter: 'response_format' json_schema" } },
      },
      { body: { choices: [{ message: { content: '```json\n{"headline":"Good week"}\n```' } }] } },
    );
    const w = createOpenAiWriter({
      provider: 'ollama',
      label: 'Ollama',
      keyEnv: null,
      baseUrl: 'http://localhost:11434/v1',
      apiKey: null,
      model: 'qwen3:8b',
      timeoutMs: 5000,
    });
    const out = await w.generateJson({
      system: 'sys',
      user: 'notes',
      schemaName: 'weekly_summary',
      schema: WEEKLY_SCHEMA,
      maxTokens: 1000,
    });
    expect(out).toEqual({ headline: 'Good week' });
    expect(calls).toHaveLength(2);
    expect(calls[0]!.url).toBe('http://localhost:11434/v1/chat/completions');
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBeUndefined();
    expect(JSON.parse(calls[0]!.init.body as string).response_format.type).toBe('json_schema');
    const second = JSON.parse(calls[1]!.init.body as string);
    expect(second.response_format).toEqual({ type: 'json_object' });
    expect(second.messages[0].content).toContain('JSON Schema');
  });
});

describe('prompts and output schemas', () => {
  it('uses strict schemas every structured-output API accepts', () => {
    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      for (const banned of [
        'minLength',
        'maxLength',
        'minimum',
        'maximum',
        'minItems',
        'maxItems',
      ]) {
        expect(n).not.toHaveProperty(banned);
      }
      if (n.type === 'object') {
        expect(n.additionalProperties).toBe(false);
        expect(n.required).toEqual(Object.keys(n.properties as object));
      }
      expect(Array.isArray(n.type)).toBe(false); // no union types
      Object.values(n).forEach(walk);
    };
    walk(NOTES_SCHEMA);
    walk(WEEKLY_SCHEMA);
  });

  it('wraps the learner’s words as data and adds the day’s context', () => {
    const prompt = buildNotesPrompt({
      date: '2026-11-13',
      mood: 'good',
      energy: 4,
      studied: [{ title: 'Graphs', category: 'dsa', status: 'completed', minutes: 70 }],
      typedLog: 'Typed: BFS on grids.',
      transcripts: ['Spoken one.', 'Spoken two.'],
      closing: [{ question: 'First thing tomorrow?', answer: 'Dijkstra' }],
    });
    expect(prompt).toContain('Date: Friday 13 November 2026');
    expect(prompt).toContain('- Graphs (DSA, 70 min, marked done)');
    expect(prompt).toContain('How the day felt: mood good, energy 4/5');
    expect(prompt).toContain('<log>\nTyped: BFS on grids.\n</log>');
    expect(prompt).toContain('[Part 1]\nSpoken one.\n\n[Part 2]\nSpoken two.');
    expect(prompt).toContain('<closing>\nFirst thing tomorrow? Dijkstra\n</closing>');
    expect(
      transcriptionHint([{ title: 'Graphs' }, { title: 'Graphs' }, { title: 'LRU cache' }]),
    ).toBe('A study log about: Graphs, LRU cache.');
    expect(transcriptionHint([])).toBeUndefined();
  });

  it('builds the weekly prompt from the compiled week', () => {
    const week = compileWeek([
      {
        date: '2026-11-10',
        mood: null,
        energy: null,
        completed: true,
        log: null,
        notes: {
          summary: 'Heaps',
          topics: [{ name: 'Heaps', keyPoints: ['Sift down is O(log n)'], confidence: 'shaky' }],
          problems: [{ name: 'Kth Largest', outcome: 'hints', note: null }],
          mistakes: [],
          questions: [],
          reviseNext: [],
        },
      },
    ]);
    const prompt = buildWeeklyPrompt({
      weekStart: '2026-11-09',
      weekEnd: '2026-11-15',
      week,
      sessions: { planned: 10, done: 7, skipped: 1 },
    });
    expect(prompt).toContain('Study sessions: 7 done, 1 skipped, of 10 planned so far');
    expect(prompt).toContain('Topic: Heaps (2026-11-10; latest confidence shaky)');
    expect(prompt).toContain('- 2026-11-10 Kth Largest: hints');
    expect(prompt).toContain('Marked for revision:\n  - Heaps');
  });
});
