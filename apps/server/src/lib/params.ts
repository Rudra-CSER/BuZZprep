import { isLocalDate, type LocalDate } from '@buzzprep/shared';
import { Types } from 'mongoose';
import { badRequest, notFound } from './errors';

/** Parse a route parameter as an ObjectId. Anything malformed is reported as "not found". */
export function parseId(value: unknown, what = 'Resource'): Types.ObjectId {
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value) || value.length !== 24) {
    throw notFound(what);
  }
  return new Types.ObjectId(value);
}

/** Parse a route parameter as a local date (YYYY-MM-DD). */
export function parseDate(value: unknown): LocalDate {
  if (typeof value !== 'string' || !isLocalDate(value)) {
    throw badRequest('Invalid date (YYYY-MM-DD)');
  }
  return value;
}
