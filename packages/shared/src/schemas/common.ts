import { z } from 'zod';
import { isLocalDate, isLocalTime, isValidZone } from '../time';

export const localDateSchema = z
  .string()
  .refine(isLocalDate, { message: 'Expected a date in YYYY-MM-DD format' });

export const localTimeSchema = z
  .string()
  .refine(isLocalTime, { message: 'Expected a time in HH:mm format' });

export const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine(isValidZone, { message: 'Unknown timezone' });

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, { message: 'Invalid id' });

/** Client-side reference used inside config bundles (templates, imports). */
export const refSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[\w.-]+$/, { message: 'Refs may contain letters, digits, "_", "-" and "."' });

export const weekdaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

export const weekdaysSchema = z
  .array(weekdaySchema)
  .max(7)
  .transform((days) => [...new Set(days)].sort((a, b) => a - b));

export const urlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (v) => {
      try {
        const u = new URL(v);
        return u.protocol === 'https:' || u.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { message: 'Expected an http(s) URL' },
  );

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const dateRangeQuerySchema = z
  .object({ from: localDateSchema, to: localDateSchema })
  .refine((v) => v.from <= v.to, { message: '"from" must not be after "to"', path: ['to'] });
