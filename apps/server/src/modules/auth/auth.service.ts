import type { LoginInput, RegisterInput } from '@buzzprep/shared';
import type { Types } from 'mongoose';
import type { Env } from '../../config/env';
import { User, UserProfile, type IUser } from '../../db/models';
import { safeEqual } from '../../lib/crypto';
import { conflict, forbidden, unauthorized } from '../../lib/errors';
import { defaultProfileFields, getProfile } from '../profile/profile.service';
import { burnPasswordCheck, hashPassword, verifyPassword } from './password';

/** The account fields the API returns (never the password hash). */
export function publicUser(
  user: Pick<IUser, '_id' | 'email' | 'displayName' | 'role' | 'createdAt'>,
) {
  return {
    id: user._id.toHexString(),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * True only until the first account exists, so the sign-up screen can offer the owner account
 * even when registration is closed.
 */
export async function isSetupRequired(): Promise<boolean> {
  return (await User.estimatedDocumentCount()) === 0;
}

/**
 * Create an account with a default profile. The first account on an instance becomes its admin.
 * - invite: everyone needs the code, including the first account, so a stranger can't
 *   claim a freshly deployed server before its owner does.
 * - closed: only the very first account can be created (bootstrap), nobody after it.
 */
export async function registerUser(
  input: RegisterInput,
  env: Pick<Env, 'REGISTRATION_MODE' | 'INVITE_CODE'>,
): Promise<IUser> {
  const isFirst = await isSetupRequired();
  if (
    env.REGISTRATION_MODE === 'invite' &&
    !(input.inviteCode && env.INVITE_CODE && safeEqual(input.inviteCode, env.INVITE_CODE))
  ) {
    throw forbidden('A valid invite code is required to join this server.');
  }
  if (env.REGISTRATION_MODE === 'closed' && !isFirst) {
    throw forbidden('Registration is closed on this server.');
  }
  if (await User.exists({ email: input.email })) {
    throw conflict('An account with this email already exists.');
  }
  const user = await User.create({
    email: input.email,
    passwordHash: await hashPassword(input.password),
    displayName: input.displayName,
    role: isFirst ? 'admin' : 'user',
  });
  await UserProfile.create({ userId: user._id, ...defaultProfileFields(input.timezone) });
  return user.toObject();
}

/** Check credentials. Unknown emails take as long as wrong passwords (no user enumeration). */
export async function authenticate(
  input: LoginInput,
): Promise<{ user: IUser; onboardingCompleted: boolean }> {
  const user = await User.findOne({ email: input.email }).lean<IUser>();
  if (!user) {
    await burnPasswordCheck(input.password);
    throw unauthorized('Email or password is incorrect.');
  }
  if (!(await verifyPassword(user.passwordHash, input.password))) {
    throw unauthorized('Email or password is incorrect.');
  }
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  const profile = await getProfile(user._id);
  return { user, onboardingCompleted: !!profile.onboardingCompletedAt };
}

/** The signed-in user plus the profile fields the app needs when it starts. */
export async function getCurrentUser(userId: Types.ObjectId) {
  const [user, profile] = await Promise.all([
    User.findById(userId).lean<IUser>(),
    getProfile(userId),
  ]);
  if (!user) throw unauthorized();
  return {
    user: publicUser(user),
    onboardingCompleted: !!profile.onboardingCompletedAt,
    timezone: profile.timezone,
    theme: profile.theme,
  };
}
