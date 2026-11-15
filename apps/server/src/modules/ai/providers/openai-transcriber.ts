import { postForm } from './http';
import type { Transcriber } from './types';

interface Config {
  provider: string;
  label: string;
  /** Env variable holding the key, named in error messages. */
  keyEnv: string | null;
  baseUrl: string;
  apiKey: string | null;
  model: string;
  timeoutMs: number;
}

/**
 * Speech-to-text over the OpenAI audio API (POST /audio/transcriptions, multipart). The same
 * API is offered by self-hosted servers (faster-whisper based), so this also covers local use.
 */
export function createOpenAiTranscriber(cfg: Config): Transcriber {
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/audio/transcriptions`;
  const headers: Record<string, string> = cfg.apiKey
    ? { authorization: `Bearer ${cfg.apiKey}` }
    : {};
  return {
    provider: cfg.provider,
    label: cfg.label,
    model: cfg.model,
    async transcribe({ audio, mimeType, filename, prompt }) {
      const form = new FormData();
      // Copy into a fresh ArrayBuffer-backed view so Blob accepts it everywhere.
      form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), filename);
      form.append('model', cfg.model);
      if (prompt) form.append('prompt', prompt);
      const data = (await postForm(url, form, {
        headers,
        timeoutMs: cfg.timeoutMs,
        provider: cfg,
      })) as {
        text?: unknown;
      };
      return typeof data.text === 'string' ? data.text.trim() : '';
    },
  };
}
