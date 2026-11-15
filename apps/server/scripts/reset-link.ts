/**
 * Make a one-time password reset link for an account, for a server that doesn't send email (or
 * when the email didn't arrive). Give the link to the account's owner privately. It works once,
 * for 60 minutes, and ends every session the account has when it is used.
 *
 *   npm run password:link -- --email you@example.com [--minutes 60]
 *
 * In Docker:  docker compose exec app node apps/server/dist/reset-link.js --email you@example.com
 */
import { parseArgs } from 'node:util';
import { loadDotEnv } from '../src/config/dotenv';
import { loadEnv } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/db/connection';
import { User } from '../src/db/models';
import { createLogger, setLogger } from '../src/lib/logger';
import { createResetLink, RESET_LINK_MINUTES } from '../src/modules/auth/password-reset.service';

async function main() {
  let values: { email?: string; minutes?: string } = {};
  try {
    ({ values } = parseArgs({
      options: { email: { type: 'string' }, minutes: { type: 'string' } },
    }));
  } catch {
    // An unknown option (such as --help): show the usage below.
  }
  const minutes = values.minutes ? Number(values.minutes) : RESET_LINK_MINUTES;
  if (!values.email || !Number.isInteger(minutes) || minutes < 5 || minutes > 7 * 24 * 60) {
    console.error('Usage: reset-link --email <account email> [--minutes 5…10080]');
    process.exit(2);
  }
  loadDotEnv();
  const env = loadEnv();
  setLogger(createLogger('warn', false));

  await connectDatabase(env.MONGODB_URI);
  try {
    const user = await User.findOne({ email: values.email.toLowerCase().trim() });
    if (!user) {
      console.error(`No account with email ${values.email}.`);
      process.exitCode = 1;
      return;
    }
    const link = await createResetLink(env, user._id, 'owner', minutes);
    console.log(`Reset link for ${user.email} (works once, for ${minutes} minutes):`);
    console.log(link);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
