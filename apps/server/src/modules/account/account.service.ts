import type { ChangePasswordInput, UpdateAccountInput } from '@buzzprep/shared';
import type { Types } from 'mongoose';
import { User, USER_OWNED_MODELS, type IUser } from '../../db/models';
import { notFound, unauthorized } from '../../lib/errors';
import { toApi } from '../../lib/serialize';
import { publicUser } from '../auth/auth.service';
import { hashPassword, verifyPassword } from '../auth/password';
import { deleteOtherSessions } from '../auth/session';
import { deleteUserAudio } from '../journal/recordings.service';

export async function updateAccount(userId: Types.ObjectId, input: UpdateAccountInput) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: input },
    { returnDocument: 'after' },
  ).lean<IUser>();
  if (!user) throw notFound('Account');
  return publicUser(user);
}

/** Change the password and sign out every other device. */
export async function changePassword(
  userId: Types.ObjectId,
  currentSessionId: Types.ObjectId,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await User.findById(userId).lean<IUser>();
  if (!user || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw unauthorized('Your current password is incorrect.');
  }
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        passwordHash: await hashPassword(input.newPassword),
        passwordChangedAt: new Date(),
      },
    },
  );
  await deleteOtherSessions(userId, currentSessionId);
}

/**
 * Everything stored about the user, as JSON (data portability). No session tokens, reset links
 * or push keys.
 */
export async function exportAccountData(userId: Types.ObjectId) {
  const user = await User.findById(userId).lean<IUser>();
  const data: Record<string, unknown> = {};
  for (const [name, model] of Object.entries(USER_OWNED_MODELS)) {
    if (name === 'sessions' || name === 'passwordResets') continue;
    const docs = await model.find({ userId }).lean();
    data[name] = toApi(docs, name === 'pushSubscriptions' ? ['userId', 'keys'] : ['userId']);
  }
  return {
    format: 'buzzprep.account-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    user: user ? publicUser(user) : null,
    data,
  };
}

/** Permanently delete the account and every document that belongs to it. */
export async function deleteAccount(userId: Types.ObjectId, password: string): Promise<void> {
  const user = await User.findById(userId).lean<IUser>();
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw unauthorized('Password is incorrect.');
  }
  for (const model of Object.values(USER_OWNED_MODELS)) {
    await model.deleteMany({ userId });
  }
  await deleteUserAudio(userId);
  await User.deleteOne({ _id: userId });
}
