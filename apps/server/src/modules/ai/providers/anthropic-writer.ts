import { AiProviderError, parseModelJson, postJson } from './http';
import type { JsonWriter } from './types';

interface Config {
  provider: string;
  label: string;
  /** Env variable holding the key, named in error messages. */
  keyEnv: string | null;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

const API_VERSION = '2023-06-01';

/**
 * Claude Messages API with structured outputs: the JSON Schema goes in
 * `output_config.format`, and the reply's text block is JSON matching it.
 */
export function createAnthropicWriter(cfg: Config): JsonWriter {
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/v1/messages`;
  return {
    provider: cfg.provider,
    label: cfg.label,
    model: cfg.model,
    async generateJson({ system, user, schema, maxTokens }) {
      const data = (await postJson(
        url,
        {
          model: cfg.model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: user }],
          output_config: { format: { type: 'json_schema', schema } },
        },
        {
          headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': API_VERSION },
          timeoutMs: cfg.timeoutMs,
          provider: cfg,
        },
      )) as { stop_reason?: string; content?: { type: string; text?: string }[] };

      if (data.stop_reason === 'refusal') {
        throw new AiProviderError('The model declined to process this entry.', null, false);
      }
      if (data.stop_reason === 'max_tokens') {
        throw new AiProviderError('The answer was too long and got cut off.', null, false);
      }
      const text = data.content?.find((b) => b.type === 'text')?.text;
      return parseModelJson(text);
    },
  };
}
