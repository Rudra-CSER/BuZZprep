/**
 * Cloudflare Worker for the web app (configured in wrangler.jsonc; see docs/DEPLOYMENT.md).
 *
 * Cloudflare serves the built PWA (apps/web/dist) on its own, with the single-page-app fallback
 * and the headers from public/_headers. This code runs for /api/* (and for requests no file
 * matched): it forwards API calls to the buZZprep server at API_ORIGIN, and answers 503 while
 * no server is connected, so the app shows a clear message instead of parsing index.html.
 */

interface Env {
  /** The built web app, bound as `assets.binding` in wrangler.jsonc. */
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** Where the buZZprep server runs, e.g. https://api.example.com (a dashboard variable). */
  API_ORIGIN?: string;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return forwardToServer(request, url, env.API_ORIGIN);
    return env.ASSETS.fetch(request);
  },
};

export default worker;

async function forwardToServer(request: Request, url: URL, apiOrigin: string | undefined) {
  if (!apiOrigin) {
    return apiError(503, 'server_unavailable', 'The buZZprep server isn’t connected yet.');
  }
  // Method, body, cookies, Origin and X-Requested-With pass through unchanged: the server checks
  // Origin against its PUBLIC_APP_URL, so set that to this site's address.
  const forwarded = new Request(new URL(url.pathname + url.search, apiOrigin), request);
  try {
    return await fetch(forwarded);
  } catch {
    return apiError(502, 'server_unreachable', 'Can’t reach the buZZprep server right now.');
  }
}

/** Same shape as the server's errors (`{ error: { code, message } }`), which the app displays. */
function apiError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
