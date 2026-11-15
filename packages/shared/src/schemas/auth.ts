import { z } from 'zod';
import { timezoneSchema } from './common';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ message: 'Enter a valid email address' }));

export const passwordSchema = z
  .string()
  .min(10, { message: 'Use at least 10 characters' })
  .max(128, { message: 'Use at most 128 characters' });

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(60),
  timezone: timezoneSchema,
  inviteCode: z.string().trim().max(128).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateAccountSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
});
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128),
  confirm: z.literal('DELETE', { message: 'Type DELETE to confirm' }),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
