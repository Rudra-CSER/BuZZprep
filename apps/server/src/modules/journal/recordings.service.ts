import { pipeline } from 'node:stream/promises';
import { Transform, type Readable } from 'node:stream';
import mongoose, { type Types } from 'mongoose';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';

/**
 * Voice recordings in GridFS (bucket "journal_audio"). Audio is kept only until it has been
 * transcribed, unless the user chose to keep recordings. Every file carries its owner in
 * metadata so account deletion can remove it.
 */

const BUCKET = 'journal_audio';

function bucket() {
  const db = mongoose.connection.db;
  if (!db) throw new AppError(503, 'unavailable', 'The database is not connected.');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET });
}

/** Audio formats the transcription APIs accept, by MIME type (parameters ignored). */
const EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'video/webm': 'webm', // some browsers label audio-only WebM as video
  'video/mp4': 'mp4',
};

export function audioExtension(mimeType: string): string | null {
  return EXTENSIONS[mimeType.split(';')[0]!.trim().toLowerCase()] ?? null;
}

export async function storeAudio(
  source: Readable,
  meta: { userId: Types.ObjectId; entryId: Types.ObjectId; mimeType: string },
  maxBytes: number,
): Promise<{ fileId: Types.ObjectId; bytes: number }> {
  const upload = bucket().openUploadStream(`journal-${meta.entryId.toHexString()}`, {
    metadata: { userId: meta.userId, entryId: meta.entryId, mimeType: meta.mimeType },
  });
  let bytes = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        callback(
          new AppError(
            413,
            'payload_too_large',
            'That recording is too large. Keep clips shorter.',
          ),
        );
      } else {
        callback(null, chunk);
      }
    },
  });
  try {
    await pipeline(source, limit, upload);
  } catch (err) {
    await upload.abort().catch(() => undefined);
    if (err instanceof AppError) throw err;
    throw new AppError(400, 'upload_failed', 'The recording did not upload completely. Try again.');
  }
  if (bytes === 0) {
    await deleteAudio(upload.id as Types.ObjectId);
    throw new AppError(400, 'empty_upload', 'The recording was empty.');
  }
  return { fileId: upload.id as Types.ObjectId, bytes };
}

export async function readAudio(fileId: Types.ObjectId): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of bucket().openDownloadStream(fileId)) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export function openAudioStream(fileId: Types.ObjectId): Readable {
  return bucket().openDownloadStream(fileId);
}

export async function deleteAudio(fileId: Types.ObjectId): Promise<void> {
  try {
    await bucket().delete(fileId);
  } catch (err) {
    // Already gone is fine; anything else is logged, never surfaced to the user.
    if (!/FileNotFound|not found/i.test(String((err as Error).message))) {
      logger.warn({ err, fileId }, 'Could not delete journal audio');
    }
  }
}

/** Remove every recording a user owns (account deletion). */
export async function deleteUserAudio(userId: Types.ObjectId): Promise<number> {
  const files = await bucket().find({ 'metadata.userId': userId }).project({ _id: 1 }).toArray();
  for (const f of files) await deleteAudio(f._id as Types.ObjectId);
  return files.length;
}
