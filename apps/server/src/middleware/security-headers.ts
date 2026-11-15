import helmet from 'helmet';
import type { Env } from '../config/env';

/**
 * Strict headers for a same-origin PWA: no third-party scripts, styles, fonts or frames.
 * HSTS and upgrade-insecure-requests only when the app is served over HTTPS.
 */
export function securityHeaders(env: Env) {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'worker-src': ["'self'"],
        'manifest-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
        'upgrade-insecure-requests': env.cookieSecure ? [] : null,
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: env.cookieSecure ? { maxAge: 15_552_000, includeSubDomains: false } : false,
  });
}
