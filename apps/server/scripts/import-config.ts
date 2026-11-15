/**
 * Import a config bundle (template, personal seed or export) into an existing account.
 *
 *   npm run config:import -- --email you@example.com --file config/personal.local.json [--mode replace]
 *
 * In Docker:  docker compose exec app node apps/server/dist/import-config.js --email … --file /config/personal.local.json
 */
import { configBundleSchema } from '@buzzprep/shared';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadDotEnv } from '../src/config/dotenv';
import { loadEnv } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/db/connection';
import { User } from '../src/db/models';
import { createLogger, setLogger } from '../src/lib/logger';
import { importConfiguration } from '../src/modules/config/config-import.service';

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      file: { type: 'string' },
      mode: { type: 'string', default: 'replace' },
    },
  });
  if (!values.email || !values.file) {
    console.error(
      'Usage: import-config --email <account email> --file <bundle.json> [--mode replace|merge]',
    );
    process.exit(2);
  }
  if (values.mode !== 'replace' && values.mode !== 'merge') {
    console.error('--mode must be "replace" or "merge"');
    process.exit(2);
  }
  loadDotEnv();
  const env = loadEnv();
  setLogger(createLogger('warn', false));

  // npm runs workspace scripts from apps/server; resolve paths from where the command was typed.
  const file = path.resolve(process.env.INIT_CWD ?? process.cwd(), values.file);
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const parsed = configBundleSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('The file is not a valid buZZprep config bundle:');
    for (const issue of parsed.error.issues.slice(0, 20)) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  await connectDatabase(env.MONGODB_URI);
  try {
    const user = await User.findOne({ email: values.email.toLowerCase().trim() }).lean();
    if (!user) {
      console.error(`No account with email ${values.email}. Register in the app first.`);
      process.exit(1);
    }
    const summary = await importConfiguration(user._id, parsed.data, values.mode);
    console.log(`Imported into ${user.email} (${values.mode}):`, summary);
    console.log('Reminders are re-planned by the scheduler within 10 minutes.');
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
