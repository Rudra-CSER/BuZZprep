export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

/**
 * Same-origin JSON client. The session lives in an httpOnly cookie (never readable by JS);
 * every request carries the X-Requested-With header the server requires for CSRF defence.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [k, v] of Object.entries(options.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'X-Requested-With': 'buzzprep',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin',
      signal: options.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'network_error', 'You appear to be offline.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = (
      data as { error?: { code?: string; message?: string; issues?: ApiError['issues'] } } | null
    )?.error;
    throw new ApiError(
      res.status,
      e?.code ?? 'http_error',
      e?.message ?? `Request failed (${res.status})`,
      e?.issues,
    );
  }
  return data as T;
}

/** POST a binary body (audio) and read the JSON answer, with the same errors as `api`. */
export async function uploadBlob<T>(
  path: string,
  blob: Blob,
  query: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [k, v] of Object.entries(query))
    if (v !== undefined) url.searchParams.set(k, String(v));
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'buzzprep',
        'Content-Type': blob.type || 'application/octet-stream',
      },
      body: blob,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'network_error', 'You appear to be offline.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      res.status,
      e?.code ?? 'http_error',
      e?.message ?? `Upload failed (${res.status})`,
    );
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

/** Field → message map for forms. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !err.issues) return {};
  return Object.fromEntries(err.issues.map((i) => [i.path, i.message]));
}

/** Download a file the API serves as an attachment (exports), keeping its filename. */
export async function download(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'buzzprep' },
  });
  if (!res.ok) throw new Error('Download failed');
  const name =
    /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
