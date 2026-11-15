import { AiProviderError, parseModelJson, postJson } from './http';
import type { JsonRequest, JsonWriter } from './types';

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

interface ChatResponse {
  choices?: { message?: { content?: string | null; refusal?: string | null } }[];
}

/**
 * Chat Completions with a JSON Schema response format. Widely implemented, so the same code
 * talks to OpenAI and to OpenAI-compatible local servers (Ollama, LM Studio, vLLM). Servers
 * that don't support schemas get plain JSON mode with the schema in the instructions.
 */
export function createOpenAiWriter(cfg: Config): JsonWriter {
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const headers: Record<string, string> = cfg.apiKey
    ? { authorization: `Bearer ${cfg.apiKey}` }
    : {};
  const call = (body: unknown) =>
    postJson(url, body, {
      headers,
      timeoutMs: cfg.timeoutMs,
      provider: cfg,
    }) as Promise<ChatResponse>;

  return {
    provider: cfg.provider,
    label: cfg.label,
    model: cfg.model,
    async generateJson({ system, user, schemaName, schema }: JsonRequest) {
      const messages = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ];
      let data: ChatResponse;
      try {
        data = await call({
          model: cfg.model,
          messages,
          response_format: {
            type: 'json_schema',
            json_schema: { name: schemaName, strict: true, schema },
          },
        });
      } catch (err) {
        const unsupported =
          err instanceof AiProviderError &&
          err.status === 400 &&
          /response_format|json_schema|schema/i.test(err.message);
        if (!unsupported) throw err;
        data = await call({
          model: cfg.model,
          messages: [
            {
              role: 'system',
              content: `${system}\n\nReply with only a JSON object that matches this JSON Schema:\n${JSON.stringify(schema)}`,
            },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
        });
      }
      const message = data.choices?.[0]?.message;
      if (message?.refusal) {
        throw new AiProviderError('The model declined to process this entry.', null, false);
      }
      return parseModelJson(message?.content);
    },
  };
}
