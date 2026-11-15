import type { LocalDate } from '@buzzprep/shared';
import { del, get, set } from 'idb-keyval';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { requestWakeLock } from '@/lib/pwa';

/**
 * Microphone recording for the night log.
 *
 * - Records with MediaRecorder in a format the transcription APIs accept (WebM/Opus where
 *   available, MP4/AAC on Safari).
 * - Keeps the screen awake while recording. iOS stops the microphone when the screen locks or
 *   the app goes to the background, so the clip is saved at that point instead of being lost.
 * - Writes chunks to IndexedDB as it goes; if the app is killed mid-recording, the next visit
 *   recovers what was captured (see recoverRecording).
 * - Exposes the live input level as a CSS variable (--level, 0–1) on `levelRef`, without
 *   re-rendering every frame.
 */

export type RecorderStatus = 'idle' | 'starting' | 'recording' | 'denied' | 'unsupported' | 'error';

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
const IN_PROGRESS = 'journal-recording-in-progress';
const MIN_SECONDS = 1;

interface InProgress {
  date: LocalDate;
  mimeType: string;
  startedAt: number;
  updatedAt: number;
  chunks: Blob[];
}

export function recordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function pickMimeType(): string | undefined {
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t));
}

/** A recording interrupted by the app being closed: hand it over as a clip, once. */
export async function recoverRecording(): Promise<{
  date: LocalDate;
  blob: Blob;
  seconds: number;
} | null> {
  const saved = await get<InProgress>(IN_PROGRESS).catch(() => undefined);
  if (!saved) return null;
  await del(IN_PROGRESS);
  const blob = new Blob(saved.chunks, { type: saved.mimeType });
  const seconds = Math.round((saved.updatedAt - saved.startedAt) / 1000);
  if (blob.size === 0 || seconds < MIN_SECONDS) return null;
  return { date: saved.date, blob, seconds };
}

export function useRecorder({
  date,
  maxSeconds,
  onClip,
}: {
  date: LocalDate;
  maxSeconds: number;
  onClip: (blob: Blob, seconds: number, reason: 'stopped' | 'limit' | 'interrupted') => void;
}) {
  const [status, setStatus] = useState<RecorderStatus>(() =>
    recordingSupported() ? 'idle' : 'unsupported',
  );
  const [seconds, setSeconds] = useState(0);
  const levelRef = useRef<HTMLElement | null>(null);
  const session = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    audio: AudioContext | null;
    frame: number;
    timer: ReturnType<typeof setInterval>;
    wakeLock: { release(): Promise<void> } | null;
    startedAt: number;
    reason: 'stopped' | 'limit' | 'interrupted';
  } | null>(null);
  const onClipRef = useRef(onClip);
  useLayoutEffect(() => {
    onClipRef.current = onClip;
  });

  const stop = useCallback((reason: 'stopped' | 'limit' | 'interrupted' = 'stopped') => {
    const s = session.current;
    if (!s || s.recorder.state === 'inactive') return;
    s.reason = reason;
    s.recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (session.current || !recordingSupported()) return;
    setStatus('starting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      const name = (err as DOMException).name;
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
      return;
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64_000 });
    } catch {
      recorder = new MediaRecorder(stream);
    }
    const type = recorder.mimeType || mimeType || 'audio/webm';
    const chunks: Blob[] = [];
    const startedAt = Date.now();

    recorder.ondataavailable = (e) => {
      if (!e.data.size) return;
      chunks.push(e.data);
      void set(IN_PROGRESS, {
        date,
        mimeType: type,
        startedAt,
        updatedAt: Date.now(),
        chunks,
      } satisfies InProgress).catch(() => undefined);
    };

    recorder.onstop = () => {
      const s = session.current;
      session.current = null;
      if (s) {
        clearInterval(s.timer);
        cancelAnimationFrame(s.frame);
        void s.audio?.close().catch(() => undefined);
        void s.wakeLock?.release().catch(() => undefined);
      }
      stream.getTracks().forEach((t) => t.stop());
      levelRef.current?.style.setProperty('--level', '0');
      setStatus('idle');
      setSeconds(0);
      void del(IN_PROGRESS).catch(() => undefined);
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      const blob = new Blob(chunks, { type });
      if (blob.size > 0 && elapsed >= MIN_SECONDS) {
        onClipRef.current(blob, Math.min(elapsed, maxSeconds), s?.reason ?? 'stopped');
      }
    };

    // Live level for the visual ring.
    let audio: AudioContext | null = null;
    let frame = 0;
    try {
      const Ctx =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        audio = new Ctx();
        const analyser = audio.createAnalyser();
        analyser.fftSize = 512;
        audio.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        let smooth = 0;
        const draw = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) sum += ((v - 128) / 128) ** 2;
          const rms = Math.sqrt(sum / data.length);
          smooth = smooth * 0.8 + Math.min(1, rms * 4) * 0.2;
          levelRef.current?.style.setProperty('--level', smooth.toFixed(3));
          frame = requestAnimationFrame(draw);
          if (session.current) session.current.frame = frame;
        };
        frame = requestAnimationFrame(draw);
      }
    } catch {
      audio = null;
    }

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= maxSeconds) stop('limit');
    }, 250);

    session.current = {
      recorder,
      stream,
      audio,
      frame,
      timer,
      wakeLock: null,
      startedAt,
      reason: 'stopped',
    };
    recorder.start(4000);
    setStatus('recording');
    const lock = await requestWakeLock();
    if (session.current) session.current.wakeLock = lock;
    else void lock?.release();
  }, [date, maxSeconds, stop]);

  // The microphone stops in the background (always on iOS): save what we have.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') stop('interrupted');
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      stop('interrupted');
    };
  }, [stop]);

  return { status, seconds, start, stop, levelRef };
}
