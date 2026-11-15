import { Types } from 'mongoose';

/**
 * Convert lean Mongo documents to API JSON: `_id` → `id`, ObjectIds → strings, Dates → ISO,
 * and drop internal fields. Applied recursively so subdocuments (milestones, attempts…) match.
 */
export function toApi<T = Record<string, unknown>>(value: unknown, omit: string[] = ['userId']): T {
  return convert(value, new Set(['__v', ...omit])) as T;
}

/** `topLevel` is true for the document itself and for items of a top-level array. */
function convert(value: unknown, omit: Set<string>, topLevel = true): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => convert(v, omit, topLevel));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (key === '__v' || (topLevel && omit.has(key))) continue;
      out[key === '_id' ? 'id' : key] = convert(v, omit, false);
    }
    return out;
  }
  return value;
}

export function oid(id: string | Types.ObjectId): Types.ObjectId {
  return typeof id === 'string' ? new Types.ObjectId(id) : id;
}

export function isObjectId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
}
