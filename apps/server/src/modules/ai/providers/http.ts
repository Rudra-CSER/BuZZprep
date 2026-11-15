/**
 * Minimal HTTP helpers for AI providers (no SDKs): timeouts, error classification, and error
 * messages that never contain the API key or the request body.
 */

export class AiProviderError extends Error {
  constructor(
    message: string,
    /** HTTP status from the provider, or null for network errors and bad responses. */
    readonly status: number | null,
    /** Worth retrying later (rate limits, overload, timeouts, network). */
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}

/** Who is being called, so errors can name the provider and the variable holding its key. */
export interface ProviderRef {
  label: string;
  keyEnv: string | null;
}

interface RequestOptions {
  headers: Record<string, string>;
  timeoutMs: number;
  provider?: ProviderRef;
}

export async function postJson(
  url: string,
  body: unknown,
  { headers, timeoutMs, provider }: RequestOptions,
): Promise<unknown> {
  return send(url, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs,
    provider,
  });
}

export async function postForm(
  url: string,
  form: FormData,
  { headers, timeoutMs, provider }: RequestOptions,
): Promise<unknown> {
  // fetch sets the multipart boundary itself; never set content-type by hand here.
  return send(url, { method: 'POST', headers, body: form, timeoutMs, provider });
}

async function send(
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string | FormData;
    timeoutMs: number;
    provider?: ProviderRef;
  },
): Promise<unknown> {
  const who = init.provider?.label;
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      signal: AbortSignal.timeout(init.timeoutMs),
    });
  } catch (err) {
    const timedOut = (err as Error).name === 'TimeoutError';
    throw new AiProviderError(
      timedOut
        ? `${who ?? 'The AI provider'} did not answer in time.`
        : `Could not reach ${who ?? 'the AI provider'}.`,
      null,
      true,
    );
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON error pages (proxies, gateways) are handled below by status.
  }
  if (!res.ok) {
    throw new AiProviderError(
      describeFailure(res.status, data, init.provider),
      res.status,
      isRetryable(res.status),
    );
  }
  if (data === null) {
    throw new AiProviderError(
      `${who ?? 'The AI provider'} sent an empty answer.`,
      res.status,
      true,
    );
  }
  return data;
}

export function isRetryable(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function describeFailure(status: number, data: unknown, provider?: ProviderRef): string {
  const who = provider?.label ?? 'The AI provider';
  if (status === 401 || status === 403) {
    const which = provider?.keyEnv ? `${provider.keyEnv} in` : 'the key in';
    return `${who} rejected the API key. Check ${which} the server’s .env file.`;
  }
  if (status === 429) return `${who} is rate limiting requests. It will be retried.`;
  if (status >= 500) return `${who} is having trouble right now. It will be retried.`;
  const message = providerMessage(data);
  return message ? `${who} refused the request: ${message}` : `AI request failed (${status}).`;
}

/** OpenAI and Groq: { error: { message } } · Anthropic: { type: "error", error: { message } }. */
function providerMessage(data: unknown): string | null {
  const err = (data as { error?: { message?: unknown } } | null)?.error;
  const message = typeof err?.message === 'string' ? err.message : null;
  return message ? message.slice(0, 300) : null;
}

/** Parse JSON a model returned as text, tolerating Markdown code fences (local models). */
export function parseModelJson(text: unknown): unknown {
  if (typeof text !== 'string' || !text.trim()) {
    throw new AiProviderError('The model returned no content.', null, true);
  }
  const unfenced = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(unfenced);
  } catch {
    throw new AiProviderError('The model returned malformed JSON.', null, true);
  }
}
