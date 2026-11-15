/**
 * Reset an account's password from the server (there is no email-based reset).
 * Prints a new random password once and signs the account out everywhere.
 *
 *   npm run password:reset -- --email you@example.com
 *
 * In Docker:  docker compose exec app node apps/server/dist/reset-password.js --email you@example.com
 */
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { loadDotEnv } from '../src/config/dotenv';
import { loadEnv } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/db/connection';
import { Session, User } from '../src/db/models';
import { createLogger, setLogger } from '../src/lib/logger';
import { hashPassword } from '../src/modules/auth/password';

async function main() {
  const { values } = parseArgs({ options: { email: { type: 'string' } } });
  if (!values.email) {
    console.error('Usage: reset-password --email <account email>');
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
    const password = randomBytes(15).toString('base64url');
    user.passwordHash = await hashPassword(password);
    user.passwordChangedAt = new Date();
    await user.save();
    const { deletedCount } = await Session.deleteMany({ userId: user._id });
    console.log(`New password for ${user.email}: ${password}`);
    console.log(
      `Signed out of ${deletedCount} session(s). Sign in, then change it in Profile → Change password.`,
    );
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
