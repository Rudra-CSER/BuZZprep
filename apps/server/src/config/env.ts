import { REGISTRATION_MODES } from '@buzzprep/shared';
import { z } from 'zod';

const DEV_SECRET = 'dev-only-secret-change-me-dev-only-secret-change-me';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    /** Where users reach the app, e.g. https://prep.example.com — used for cookies, CSRF and push links. */
    PUBLIC_APP_URL: z.url().default('http://localhost:5173'),
    /** Extra origins allowed to make cookie-authenticated requests (comma separated). */
    ALLOWED_ORIGINS: z.string().default(''),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/buzzprep'),
    SESSION_SECRET: z.string().default(DEV_SECRET),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    /** Express "trust proxy" setting: number of hops, "loopback", "true"/"false", or a list. */
    TRUST_PROXY: z.string().default('loopback'),
    REGISTRATION_MODE: z.enum(REGISTRATION_MODES).default('open'),
    INVITE_CODE: z.string().optional(),
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    /** mailto: or https: contact, required by push services. */
    VAPID_SUBJECT: z.string().optional(),
    /** all = API + scheduler in one process; api / worker split them. */
    APP_ROLE: z.enum(['all', 'api', 'worker']).default('all'),
    SCHEDULER_TICK_SECONDS: z.coerce.number().int().min(5).max(300).default(15),
    RECONCILE_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(120).default(10),
    NOTIFICATION_HORIZON_HOURS: z.coerce.number().int().min(6).max(168).default(36),
    /** Serve the built PWA from this directory (production). Empty disables. */
    WEB_DIST_DIR: z.string().default(''),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (env.SESSION_SECRET === DEV_SECRET || env.SESSION_SECRET.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['SESSION_SECRET'],
          message: 'Set SESSION_SECRET to a random string of at least 32 characters',
        });
      }
    }
    const vapid = [env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT].filter(Boolean);
    if (vapid.length > 0 && vapid.length < 3) {
      ctx.addIssue({
        code: 'custom',
        path: ['VAPID_SUBJECT'],
        message: 'Set all of VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT (or none)',
      });
    }
    if (env.VAPID_SUBJECT && !/^(mailto:|https:\/\/)/.test(env.VAPID_SUBJECT)) {
      ctx.addIssue({
        code: 'custom',
        path: ['VAPID_SUBJECT'],
        message: 'VAPID_SUBJECT must start with mailto: or https://',
      });
    }
    if (env.REGISTRATION_MODE === 'invite' && !env.INVITE_CODE) {
      ctx.addIssue({
        code: 'custom',
        path: ['INVITE_CODE'],
        message: 'REGISTRATION_MODE=invite requires INVITE_CODE',
      });
    }
  });

export type Env = z.infer<typeof envSchema> & {
  appOrigin: string;
  allowedOrigins: string[];
  cookieSecure: boolean;
  pushEnabled: boolean;
  trustProxy: boolean | number | string;
};

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // `NAME=` (an empty value, as in a freshly copied .env.example) means "not set".
  const present = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
  const parsed = envSchema.safeParse(present);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  const env = parsed.data;
  const appOrigin = new URL(env.PUBLIC_APP_URL).origin;
  const extra = env.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) => new URL(o).origin);
  return {
    ...env,
    appOrigin,
    allowedOrigins: [...new Set([appOrigin, ...extra])],
    cookieSecure: appOrigin.startsWith('https://'),
    pushEnabled: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT),
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
  };
}

function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

export const isDevSecret = (secret: string) => secret === DEV_SECRET;
