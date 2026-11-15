import type { Env } from '../../config/env';
import { createAnthropicWriter } from './providers/anthropic-writer';
import { createOpenAiTranscriber } from './providers/openai-transcriber';
import { createOpenAiWriter } from './providers/openai-writer';
import {
  AUTO_ORDER,
  KEY_ENV_OF,
  keyVendorOf,
  NOTES_PROVIDERS,
  sharedKey,
  TRANSCRIBE_PROVIDERS,
  type KeyVendor,
  type ProviderSpec,
} from './providers/registry';
import type { JsonWriter, Transcriber } from './providers/types';

/** Which AI features this server offers. Safe to show anyone: no keys, no provider details. */
export interface AiAvailability {
  transcription: boolean;
  notes: boolean;
}

/** Provider and model per feature, for signed-in users (privacy: where their words go). */
export interface AiDescription {
  transcription: { provider: string; model: string } | null;
  notes: { provider: string; model: string } | null;
}

/**
 * The configured AI providers. Everything AI is optional: with no keys the journal still works
 * (typed logs, manual notes, the compiled weekly sheet) and these features report "off".
 */
export class AiService {
  constructor(
    readonly transcriber: Transcriber | null,
    readonly writer: JsonWriter | null,
    readonly dailyLimit: number,
    /** Setup notes for the startup log (e.g. which key is missing, or a misplaced key). */
    readonly notes: SetupNote[] = [],
  ) {}

  get availability(): AiAvailability {
    return { transcription: this.transcriber !== null, notes: this.writer !== null };
  }

  describe(): AiDescription {
    return {
      transcription: this.transcriber
        ? { provider: this.transcriber.label, model: this.transcriber.model }
        : null,
      notes: this.writer ? { provider: this.writer.label, model: this.writer.model } : null,
    };
  }
}

export interface SetupNote {
  level: 'info' | 'warn';
  message: string;
}

interface Resolved {
  id: string;
  spec: ProviderSpec;
  baseUrl: string;
  apiKey: string | null;
  /** The variable the key came from, named in error messages. */
  keyEnv: string | null;
  model: string;
}

type Feature = 'Voice transcription' | 'Notes';

const VENDOR_LABEL: Record<KeyVendor, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq',
};

/** One provider: usable, or null with the reason added to `notes` (when it is worth saying). */
function resolveOne(
  env: Env,
  feature: Feature,
  id: string,
  spec: ProviderSpec,
  modelOverride: string | undefined,
  notes: SetupNote[],
  { quietIfMissing }: { quietIfMissing: boolean },
): Resolved | null {
  const key = spec.apiKey(env)?.trim();
  if (spec.keyEnv && !key) {
    if (!quietIfMissing) {
      notes.push({
        level: 'info',
        message: `${feature} is off: set ${spec.keyEnv} in .env to use ${spec.label}.`,
      });
    }
    return null;
  }
  const baseUrl = spec.baseUrl(env);
  // A Groq key under OPENAI_API_KEY (and similar) can only fail; say where it belongs. Skipped
  // when the base URL points elsewhere, since compatible servers accept other keys.
  const vendor = key ? keyVendorOf(key) : null;
  if (spec.keyVendor && vendor && vendor !== spec.keyVendor && baseUrl === spec.defaultBaseUrl) {
    notes.push({
      level: 'warn',
      message: `${spec.keyEnv} holds a ${VENDOR_LABEL[vendor]} key, so ${spec.label} can't use it. Move it to ${KEY_ENV_OF[vendor]}.`,
    });
    return null;
  }
  return {
    id,
    spec,
    baseUrl,
    apiKey: key ?? null,
    keyEnv: spec.keyFrom?.(env) ?? spec.keyEnv,
    model: modelOverride?.trim() || spec.defaultModel,
  };
}

function resolve(
  env: Env,
  feature: Feature,
  variable: 'AI_TRANSCRIBE_PROVIDER' | 'AI_NOTES_PROVIDER',
  registry: Record<string, ProviderSpec>,
  autoOrder: readonly string[],
  modelOverride: string | undefined,
  notes: SetupNote[],
): Resolved | null {
  const id = env[variable].trim().toLowerCase();
  if (id === 'none' || id === 'off') return null;
  if (id === 'auto' || id === '') {
    const preferred = sharedKey(env)?.vendor;
    const order =
      preferred && autoOrder.includes(preferred)
        ? [preferred, ...autoOrder.filter((c) => c !== preferred)]
        : [...autoOrder];
    const candidates = order.filter((c) => registry[c]);
    for (const c of candidates) {
      const r = resolveOne(env, feature, c, registry[c]!, modelOverride, notes, {
        quietIfMissing: true,
      });
      if (r) return r;
    }
    const keys = candidates.map((c) => registry[c]!.keyEnv).filter(Boolean);
    notes.push({
      level: 'info',
      message: `${feature} is off: set ${keys.join(' or ')} (or LLM_MODEL_API_KEY) in .env.`,
    });
    return null;
  }
  const spec = registry[id];
  if (!spec) {
    notes.push({
      level: 'warn',
      message:
        `${feature} is off: ${variable}=${id} is not available (choose auto, ${Object.keys(registry).join(', ')} or none). ` +
        'Local providers are commented out in apps/server/src/modules/ai/providers/registry.ts.',
    });
    return null;
  }
  return resolveOne(env, feature, id, spec, modelOverride, notes, { quietIfMissing: false });
}

export function createAiService(env: Env): AiService {
  const notes: SetupNote[] = [];
  const timeoutMs = env.AI_REQUEST_TIMEOUT_SECONDS * 1000;

  const t = resolve(
    env,
    'Voice transcription',
    'AI_TRANSCRIBE_PROVIDER',
    TRANSCRIBE_PROVIDERS,
    AUTO_ORDER.transcription,
    env.AI_TRANSCRIBE_MODEL,
    notes,
  );
  const transcriber = t
    ? createOpenAiTranscriber({
        provider: t.id,
        label: t.spec.label,
        keyEnv: t.keyEnv,
        baseUrl: t.baseUrl,
        apiKey: t.apiKey,
        model: t.model,
        timeoutMs,
      })
    : null;

  const n = resolve(
    env,
    'Notes',
    'AI_NOTES_PROVIDER',
    NOTES_PROVIDERS,
    AUTO_ORDER.notes,
    env.AI_NOTES_MODEL,
    notes,
  );
  let writer: JsonWriter | null = null;
  if (n) {
    const base = {
      provider: n.id,
      label: n.spec.label,
      keyEnv: n.keyEnv,
      baseUrl: n.baseUrl,
      model: n.model,
      timeoutMs,
    };
    writer =
      n.spec.api === 'anthropic'
        ? createAnthropicWriter({ ...base, apiKey: n.apiKey ?? '' })
        : createOpenAiWriter({ ...base, apiKey: n.apiKey });
  }

  // Both features may report the same misplaced key; say it once.
  const unique = notes.filter((n, i) => notes.findIndex((m) => m.message === n.message) === i);
  return new AiService(transcriber, writer, env.AI_DAILY_LIMIT, unique);
}
