import type { ResetPasswordInput } from '@buzzprep/shared';
import type { Types } from 'mongoose';
import type { Env } from '../../config/env';
import { PasswordReset, Session, User, type IUser } from '../../db/models';
import { randomToken, sha256 } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import type { Mailer } from '../../lib/mailer';
import { hashPassword } from './password';

/** How long a reset link works. */
export const RESET_LINK_MINUTES = 60;
/** At most one reset email per account in this window, so the form can't flood an inbox. */
const EMAIL_COOLDOWN_MS = 2 * 60_000;

/**
 * The page that sets the new password. The token goes in the fragment, which browsers never send
 * to a server, so it stays out of access logs and Referer headers.
 */
export function resetLinkUrl(env: Pick<Env, 'PUBLIC_APP_URL'>, token: string): string {
  const url = new URL('/reset-password', env.PUBLIC_APP_URL);
  url.hash = `token=${token}`;
  return url.toString();
}

/** A new one-time reset link for an account. It replaces any earlier link. */
export async function createResetLink(
  env: Pick<Env, 'PUBLIC_APP_URL'>,
  userId: Types.ObjectId,
  via: 'email' | 'owner',
  minutes = RESET_LINK_MINUTES,
): Promise<string> {
  const token = randomToken(32);
  await PasswordReset.deleteMany({ userId });
  await PasswordReset.create({
    userId,
    tokenHash: sha256(token),
    via,
    expiresAt: new Date(Date.now() + minutes * 60_000),
  });
  return resetLinkUrl(env, token);
}

/**
 * Email a reset link when the address belongs to an account. It reports nothing either way: the
 * route answers every address the same, so nobody can use it to learn who has an account.
 */
export async function requestPasswordReset(
  email: string,
  env: Pick<Env, 'PUBLIC_APP_URL'>,
  mailer: Mailer | null,
): Promise<void> {
  if (!mailer) return;
  const user = await User.findOne({ email })
    .select({ email: 1, displayName: 1 })
    .lean<Pick<IUser, '_id' | 'email' | 'displayName'>>();
  if (!user) return;
  const recent = await PasswordReset.exists({
    userId: user._id,
    via: 'email',
    createdAt: { $gt: new Date(Date.now() - EMAIL_COOLDOWN_MS) },
  });
  if (recent) return;
  const link = await createResetLink(env, user._id, 'email');
  await mailer.send({ to: user.email, ...resetEmail(user.displayName, link) });
}

/**
 * Set a new password with a reset link's token. The link is used up, every other link and every
 * signed-in device for the account end, and the new password is stored as an Argon2id hash.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<IUser> {
  const reset = await PasswordReset.findOneAndDelete({
    tokenHash: sha256(input.token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!reset) throw invalidLink();
  const user = await User.findOneAndUpdate(
    { _id: reset.userId },
    { $set: { passwordHash: await hashPassword(input.password), passwordChangedAt: new Date() } },
    { returnDocument: 'after' },
  ).lean<IUser>();
  if (!user) throw invalidLink();
  await Promise.all([
    PasswordReset.deleteMany({ userId: user._id }),
    Session.deleteMany({ userId: user._id }),
  ]);
  return user;
}

const invalidLink = () =>
  new AppError(
    410,
    'reset_link_invalid',
    'This reset link has expired or has already been used. Ask for a new one.',
  );

export function resetEmail(displayName: string, link: string) {
  const name = displayName.trim() || 'there';
  const text = [
    `Hi ${name},`,
    '',
    `Someone asked to reset the password for your buZZprep account. If it was you, open this link within ${RESET_LINK_MINUTES} minutes to choose a new one:`,
    '',
    link,
    '',
    'If it wasn’t you, ignore this email. Your password stays the same.',
  ].join('\n');
  const html = `<p>Hi ${escapeHtml(name)},</p>
<p>Someone asked to reset the password for your buZZprep account. If it was you, open this link within ${RESET_LINK_MINUTES} minutes to choose a new one:</p>
<p><a href="${escapeHtml(link)}">Choose a new password</a></p>
<p>If it wasn’t you, ignore this email. Your password stays the same.</p>`;
  return { subject: 'Reset your buZZprep password', text, html };
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
