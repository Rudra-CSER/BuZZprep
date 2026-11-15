import type { Env } from '../../../config/env';

/**
 * AI providers the journal can use, chosen in .env:
 *
 *   AI_TRANSCRIBE_PROVIDER=auto        (speech-to-text for voice logs)
 *   AI_NOTES_PROVIDER=auto             (notes and weekly summaries)
 *
 * "auto" (the default) uses the first provider in AUTO_ORDER whose key is set. Name a
 * provider to pin it, or "none" to turn the feature off. LLM_MODEL_API_KEY can hold one key
 * for whichever provider it belongs to (see sharedKey). Cloud providers are active; the local
 * (self-hosted) providers are written out below but commented out until you want them.
 *
 * To run everything on your own machine instead:
 *   1. Uncomment the `local` and `ollama` entries below.
 *   2. Start the servers (see the comments on each entry).
 *   3. In .env set AI_TRANSCRIBE_PROVIDER=local and AI_NOTES_PROVIDER=ollama (and, if they run
 *      somewhere else, LOCAL_WHISPER_BASE_URL / OLLAMA_BASE_URL). No API keys are needed.
 */

/** Whose key format a provider expects (used to catch a key pasted under the wrong name). */
export type KeyVendor = 'openai' | 'anthropic' | 'groq';

export interface ProviderSpec {
  label: string;
  /** Which wire protocol the provider speaks. */
  api: 'openai' | 'anthropic';
  baseUrl: (env: Env) => string;
  /** The vendor's own address; a different base URL means a compatible server. */
  defaultBaseUrl: string | null;
  /** The API key, or null when the provider needs none (local servers). */
  apiKey: (env: Env) => string | null | undefined;
  /** Env variable holding the key, for setup and error messages. */
  keyEnv: string | null;
  /** Which variable the key actually came from (it may be the shared LLM_MODEL_API_KEY). */
  keyFrom?: (env: Env) => string | null;
  keyVendor: KeyVendor | null;
  defaultModel: string;
}

/**
 * One key for everything: LLM_MODEL_API_KEY (or LLM_API_KEY) is used by the provider its
 * prefix belongs to (gsk_ → Groq, sk-ant- → Anthropic, anything else → OpenAI), unless that
 * provider's own variable is set.
 */
export function sharedKey(env: Env): { key: string; from: string; vendor: KeyVendor } | null {
  const from = env.LLM_MODEL_API_KEY?.trim()
    ? 'LLM_MODEL_API_KEY'
    : env.LLM_API_KEY?.trim()
      ? 'LLM_API_KEY'
      : null;
  if (!from) return null;
  const key = (from === 'LLM_MODEL_API_KEY' ? env.LLM_MODEL_API_KEY : env.LLM_API_KEY)!.trim();
  return { key, from, vendor: keyVendorOf(key) ?? 'openai' };
}

function vendorKey(vendor: KeyVendor, own: (env: Env) => string | undefined) {
  return {
    apiKey: (env: Env) => {
      const mine = own(env)?.trim();
      if (mine) return mine;
      const shared = sharedKey(env);
      return shared?.vendor === vendor ? shared.key : undefined;
    },
    keyFrom: (env: Env) => {
      if (own(env)?.trim()) return KEY_ENV_OF[vendor];
      const shared = sharedKey(env);
      return shared?.vendor === vendor ? shared.from : null;
    },
  };
}

/** Speech-to-text. Every entry must speak the OpenAI /audio/transcriptions API. */
export const TRANSCRIBE_PROVIDERS: Record<string, ProviderSpec> = {
  openai: {
    label: 'OpenAI',
    api: 'openai',
    baseUrl: (env) => env.OPENAI_BASE_URL,
    defaultBaseUrl: 'https://api.openai.com/v1',
    ...vendorKey('openai', (env) => env.OPENAI_API_KEY),
    keyEnv: 'OPENAI_API_KEY',
    keyVendor: 'openai',
    // OpenAI's recommended transcription model (whisper-1 and the gpt-4o-*-transcribe models
    // are scheduled to shut down on 2027-02-26).
    defaultModel: 'gpt-transcribe',
  },
  groq: {
    label: 'Groq',
    api: 'openai',
    baseUrl: (env) => env.GROQ_BASE_URL,
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    ...vendorKey('groq', (env) => env.GROQ_API_KEY),
    keyEnv: 'GROQ_API_KEY',
    keyVendor: 'groq',
    // The more accurate Whisper on Groq; whisper-large-v3-turbo is cheaper and a bit less exact.
    defaultModel: 'whisper-large-v3',
  },

  // ── Local speech-to-text (commented out) ───────────────────────────────────────
  // Any OpenAI-compatible speech server works, for example Speaches (faster-whisper):
  //   docker run --rm -p 8000:8000 ghcr.io/speaches-ai/speaches:latest-cpu
  // "small" is quick on a laptop CPU; with a GPU, deepdml/faster-whisper-large-v3-turbo-ct2
  // is far more accurate. Some servers download a model the first time it is requested.
  //
  // local: {
  //   label: 'Local Whisper',
  //   api: 'openai',
  //   baseUrl: (env) => env.LOCAL_WHISPER_BASE_URL ?? 'http://localhost:8000/v1',
  //   defaultBaseUrl: null,
  //   apiKey: () => null,
  //   keyEnv: null,
  //   keyVendor: null,
  //   defaultModel: 'Systran/faster-whisper-small',
  // },
};

/** Notes and weekly summaries (structured JSON output). */
export const NOTES_PROVIDERS: Record<string, ProviderSpec> = {
  anthropic: {
    label: 'Anthropic',
    api: 'anthropic',
    baseUrl: (env) => env.ANTHROPIC_BASE_URL,
    defaultBaseUrl: 'https://api.anthropic.com',
    ...vendorKey('anthropic', (env) => env.ANTHROPIC_API_KEY),
    keyEnv: 'ANTHROPIC_API_KEY',
    keyVendor: 'anthropic',
    // Good at faithful, well-structured notes. For lower cost set AI_NOTES_MODEL=claude-haiku-5-5.
    defaultModel: 'claude-sonnet-5-5',
  },
  openai: {
    label: 'OpenAI',
    api: 'openai',
    baseUrl: (env) => env.OPENAI_BASE_URL,
    defaultBaseUrl: 'https://api.openai.com/v1',
    ...vendorKey('openai', (env) => env.OPENAI_API_KEY),
    keyEnv: 'OPENAI_API_KEY',
    keyVendor: 'openai',
    // Lets one OpenAI key cover both voice and notes. Cheaper: AI_NOTES_MODEL=gpt-6-luna.
    defaultModel: 'gpt-6.1-sol',
  },
  groq: {
    label: 'Groq',
    api: 'openai',
    baseUrl: (env) => env.GROQ_BASE_URL,
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    ...vendorKey('groq', (env) => env.GROQ_API_KEY),
    keyEnv: 'GROQ_API_KEY',
    keyVendor: 'groq',
    // Supports strict JSON Schema output on Groq. Faster and cheaper: openai/gpt-oss-20b.
    defaultModel: 'openai/gpt-oss-120b',
  },

  // ── Local notes model (commented out) ──────────────────────────────────────────
  // Ollama serves an OpenAI-compatible API on port 11434:
  //   ollama pull qwen3:8b        (about 5 GB; runs on 16 GB laptops)
  // Bigger models write better notes if your machine can run them (e.g. qwen3:14b).
  //
  // ollama: {
  //   label: 'Ollama (local)',
  //   api: 'openai',
  //   baseUrl: (env) => env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  //   defaultBaseUrl: null,
  //   apiKey: () => null,
  //   keyEnv: null,
  //   keyVendor: null,
  //   defaultModel: 'qwen3:8b',
  // },
};

/**
 * Which providers "auto" tries, in order, for each feature. The provider of the shared
 * LLM_MODEL_API_KEY goes first when it is set.
 */
export const AUTO_ORDER = {
  transcription: ['openai', 'groq'],
  notes: ['anthropic', 'openai', 'groq'],
} as const;

/**
 * Recognise a key by its prefix, to spot one saved under the wrong variable. Only distinctive
 * prefixes count: plain "sk-" is used by OpenAI and by many compatible services.
 */
export function keyVendorOf(key: string): KeyVendor | null {
  if (key.startsWith('gsk_')) return 'groq';
  if (key.startsWith('sk-ant-')) return 'anthropic';
  return null;
}

export const KEY_ENV_OF: Record<KeyVendor, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  groq: 'GROQ_API_KEY',
};
