import {
  isLocalDate,
  MAX_CLIP_SECONDS,
  type JournalEntryInput,
  type LocalDate,
  type Mood,
} from '@buzzprep/shared';
import { Check, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { instantTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isProcessing, useSaveEntry, useTonight } from './api';
import { enqueueClip, usePendingClips } from './clip-queue';
import { ClipList } from './components/ClipList';
import { MicButton } from './components/MicButton';
import { EnergyPicker, MoodPicker } from './components/MoodPicker';
import { NotesStatus } from './components/NotesStatus';
import { NotesView } from './components/NotesView';
import { dayLabel } from './format';
import { recoverRecording, useRecorder } from './hooks/useRecorder';
import type { TonightResponse } from './types';

const STEPS = ['How it felt', 'Study log', 'Close the day', 'Goodnight'] as const;

/**
 * Tonight's journal: a calm, full-screen wind-down in four short steps. Opened from the
 * reminder a few minutes before bed, in place of the last scroll of the day.
 */
export function TonightPage() {
  const [params] = useSearchParams();
  const requested = params.get('date');
  const { data, error, refetch } = useTonight(
    requested && isLocalDate(requested) ? requested : undefined,
  );
  if (!data) {
    return (
      <NightFrame>
        <div className="mx-auto grid w-full max-w-lg gap-4 px-6 pt-10">
          {error ? (
            <>
              <p className="font-serif text-[26px]">Tonight’s journal didn’t load.</p>
              <p className="text-muted-foreground">{errorMessage(error)}</p>
              <Button className="w-fit" onClick={() => void refetch()}>
                Try again
              </Button>
            </>
          ) : (
            <>
              <Skeleton className="h-10 w-3/4 bg-muted" />
              <Skeleton className="h-40 w-full bg-muted" />
            </>
          )}
        </div>
      </NightFrame>
    );
  }
  return <TonightSession key={data.date} data={data} />;
}

function NightFrame({ children, header }: { children: ReactNode; header?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="night fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain pt-[var(--safe-top)] safe-x">
      {header ?? (
        <div className="px-3 pt-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={() => navigate('/journal')}
          >
            <X />
          </Button>
        </div>
      )}
      {children}
    </div>
  );
}

interface Draft {
  mood: Mood | null;
  energy: number | null;
  body: string;
  answers: Record<string, string>;
  savedAt: number;
}

const draftKey = (date: LocalDate) => `bp-journal-draft:${date}`;

function initialDraft(data: TonightResponse): Draft {
  const e = data.entry;
  const fromEntry: Draft = {
    mood: e?.mood ?? null,
    energy: e?.energy ?? null,
    body: e?.body ?? '',
    answers: Object.fromEntries((e?.answers ?? []).map((a) => [a.key, a.answer])),
    savedAt: e ? Date.parse(e.updatedAt) : 0,
  };
  try {
    const stored = JSON.parse(localStorage.getItem(draftKey(data.date)) ?? 'null') as Draft | null;
    if (stored && stored.savedAt > fromEntry.savedAt) return stored;
  } catch {
    /* ignore a broken draft */
  }
  return fromEntry;
}

function TonightSession({ data }: { data: TonightResponse }) {
  const navigate = useNavigate();
  const { date, entry, prompts, studied, ai } = data;
  const [step, setStep] = useState(entry?.completedAt ? 3 : 0);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(data));
  const [mode, setMode] = useState<'voice' | 'type'>(ai.voice ? 'voice' : 'type');
  const [savedOffline, setSavedOffline] = useState(false);
  const save = useSaveEntry();
  const pending = usePendingClips(date);
  const heading = useRef<HTMLHeadingElement>(null);
  const bed = data.bedtime ? instantTime(data.bedtime, data.timezone, data.hour12) : null;

  const recorder = useRecorder({
    date,
    maxSeconds: MAX_CLIP_SECONDS,
    onClip: (blob, seconds, reason) => {
      void enqueueClip(date, blob, seconds);
      if (reason === 'interrupted') {
        toast('Recording saved. The microphone stops when the screen locks or you switch apps.');
      } else if (reason === 'limit') {
        toast('That recording reached its 15-minute limit and was saved. Tap to keep talking.');
      }
    },
  });

  // A recording cut off by the app closing last time is uploaded now.
  useEffect(() => {
    void recoverRecording().then((r) => {
      if (!r) return;
      void enqueueClip(r.date, r.blob, r.seconds);
      toast('Recovered a recording that was interrupted.');
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(date), JSON.stringify(draft));
    } catch {
      /* storage full or unavailable: the server copy still saves */
    }
  }, [date, draft]);

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const update = (patch: Partial<Draft>) =>
    setDraft((d) => ({ ...d, ...patch, savedAt: Date.now() }));

  const persist = (extra: Partial<JournalEntryInput> = {}) => {
    const body: JournalEntryInput = {
      mood: draft.mood,
      energy: draft.energy,
      body: draft.body.trim() ? draft.body : null,
      answers: prompts.map((p) => ({ key: p.key, answer: draft.answers[p.key] ?? '' })),
      ...extra,
    };
    if (!navigator.onLine) setSavedOffline(true);
    save.mutate(
      { type: 'evening', date, body },
      {
        onSuccess: () => {
          if (extra.completed) localStorage.removeItem(draftKey(date));
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  const go = (next: number) => {
    if (recorder.status === 'recording') recorder.stop();
    if (step < 3) persist(next === 3 ? { completed: true } : {});
    setStep(next);
  };

  const close = () => {
    if (recorder.status === 'recording') recorder.stop();
    if (step < 3) persist();
    navigate('/journal');
  };

  const clips = entry?.clips ?? [];
  const voiceBlocked = !ai.server.transcription
    ? 'Voice logs need speech-to-text on the server. Typing works the same.'
    : !ai.useAi
      ? 'AI is off in your journal settings, so voice logs are off too.'
      : !window.isSecureContext
        ? 'Recording needs the app to be opened over HTTPS. Typing works the same.'
        : recorder.status === 'unsupported'
          ? 'This browser can’t record audio. Typing works the same.'
          : null;

  return (
    <NightFrame
      header={
        <header className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-3 pt-2">
          <Button variant="ghost" size="icon" aria-label="Close" onClick={close}>
            <X />
          </Button>
          <div className="text-center">
            <p className="text-[15px] font-medium">Tonight</p>
            <p className="text-[13px] text-muted-foreground">
              {dayLabel(date)}
              {bed ? ` · bed at ${bed}` : ''}
            </p>
          </div>
          <span />
        </header>
      }
    >
      <nav aria-label="Steps" className="mx-auto mt-3 flex w-full max-w-lg gap-1.5 px-6">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => (i <= step || entry?.completedAt ? go(i) : undefined)}
            aria-current={i === step ? 'step' : undefined}
            aria-label={`Step ${i + 1} of ${STEPS.length}: ${label}`}
            className="grid h-6 flex-1 place-items-center"
          >
            <span
              className={cn(
                'h-[3px] w-full rounded-full transition-colors',
                i <= step ? 'bg-primary' : 'bg-muted',
              )}
            />
          </button>
        ))}
      </nav>

      <main className="mx-auto grid w-full max-w-lg flex-1 content-start gap-7 px-6 pb-8 pt-8">
        {step === 0 ? (
          <>
            <Prompt ref={heading}>How did today feel?</Prompt>
            <MoodPicker value={draft.mood} onChange={(mood) => update({ mood })} />
            <div className="grid gap-3">
              <p className="text-[15px]">Energy</p>
              <EnergyPicker value={draft.energy} onChange={(energy) => update({ energy })} />
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div className="grid gap-3">
              <Prompt ref={heading}>Walk me through what you studied.</Prompt>
              <p className="text-[16px] leading-relaxed text-muted-foreground">
                Topic by topic: what clicked, what didn’t, and how the problems went.
              </p>
            </div>
            {studied.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-[13px] text-muted-foreground">On your schedule today</p>
                <ul className="flex flex-wrap gap-2">
                  {studied.map((s) => (
                    <li
                      key={`${s.activityId}-${s.start}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[14px]"
                    >
                      {s.status === 'completed' ? (
                        <Check className="size-3.5 text-primary" aria-label="Done" />
                      ) : null}
                      {s.title}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!voiceBlocked ? (
              <Segmented
                ariaLabel="How to log"
                value={mode}
                onValueChange={(m) => {
                  if (recorder.status === 'recording') recorder.stop();
                  setMode(m);
                }}
                options={[
                  { value: 'voice', label: 'Talk' },
                  { value: 'type', label: 'Type' },
                ]}
                className="w-44"
                itemClassName="data-[state=on]:bg-night-glow/15 data-[state=on]:text-night-glow"
              />
            ) : null}

            {mode === 'voice' && !voiceBlocked ? (
              <div className="grid justify-items-center gap-3 py-2">
                <MicButton
                  status={recorder.status}
                  seconds={recorder.seconds}
                  maxSeconds={MAX_CLIP_SECONDS}
                  levelRef={recorder.levelRef as React.Ref<HTMLDivElement>}
                  onStart={() => void recorder.start()}
                  onStop={() => recorder.stop()}
                />
                <p className="max-w-xs text-center text-[13px] leading-snug text-muted-foreground">
                  {recorder.status === 'denied'
                    ? 'Microphone access is blocked. Allow it in your browser’s settings for this site, or type instead.'
                    : 'Keep this screen open while you talk. You can record more than once.'}
                </p>
              </div>
            ) : (
              <Textarea
                value={draft.body}
                onChange={(e) => update({ body: e.target.value })}
                rows={9}
                placeholder="Today I worked on…"
                aria-label="What you studied today"
                className="text-[16px]"
              />
            )}

            {voiceBlocked ? (
              <p className="text-[13px] text-muted-foreground">{voiceBlocked}</p>
            ) : null}

            <ClipList date={date} clips={clips} pending={pending} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Prompt ref={heading}>Close the day.</Prompt>
            {prompts.map((p) => (
              <label key={p.key} className="grid gap-2">
                <span className="text-[16px]">{p.question}</span>
                <Textarea
                  rows={2}
                  className="min-h-16 text-[16px]"
                  value={draft.answers[p.key] ?? ''}
                  onChange={(e) =>
                    update({ answers: { ...draft.answers, [p.key]: e.target.value } })
                  }
                />
              </label>
            ))}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="grid gap-3">
              <Prompt ref={heading} large>
                That’s the day.
              </Prompt>
              <p className="text-[18px] text-muted-foreground">
                {bed ? `Phone down. Bed at ${bed}.` : 'Phone down. Sleep well.'}
              </p>
              {savedOffline ? (
                <p className="text-[14px] text-muted-foreground">
                  Saved on this device. It syncs when you’re back online.
                </p>
              ) : null}
            </div>
            {ai.notes && ((save.isPending && !save.isPaused) || isProcessing(entry)) ? (
              <p
                className="flex items-center gap-3 text-[15px] text-muted-foreground"
                role="status"
              >
                <span aria-hidden className="size-2 animate-pulse rounded-full bg-primary" />
                Writing your notes. They’ll be ready in the morning.
              </p>
            ) : entry?.notes ? (
              <section className="grid gap-4 rounded-[18px] border bg-card px-5 py-5">
                <h2 className="text-[15px] font-medium text-muted-foreground">Tonight’s notes</h2>
                <NotesView notes={entry.notes} compact />
                <Link
                  to={`/journal/${date}`}
                  className="w-fit text-[15px] text-primary underline-offset-4 hover:underline"
                >
                  Open the full notes
                </Link>
              </section>
            ) : entry ? (
              <NotesStatus entry={entry} aiNotes={ai.notes} />
            ) : null}
          </>
        ) : null}
      </main>

      <footer className="sticky bottom-0 bg-[color-mix(in_oklch,var(--night)_92%,transparent)] backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-lg gap-3 px-6 pb-[max(var(--safe-bottom),1rem)] pt-3">
          {step === 3 ? (
            <>
              <Button variant="ghost" size="lg" onClick={() => setStep(1)}>
                Edit
              </Button>
              <Button size="lg" className="flex-1" onClick={() => navigate('/journal')}>
                Close
              </Button>
            </>
          ) : (
            <>
              {step > 0 ? (
                <Button variant="ghost" size="lg" onClick={() => go(step - 1)}>
                  Back
                </Button>
              ) : null}
              <Button size="lg" className="flex-1" onClick={() => go(step + 1)}>
                {step === 2 ? 'Finish' : 'Next'}
              </Button>
            </>
          )}
        </div>
      </footer>
    </NightFrame>
  );
}

function Prompt({
  children,
  large,
  ref,
}: {
  children: ReactNode;
  large?: boolean;
  ref?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <h1
      ref={ref}
      tabIndex={-1}
      className={cn(
        'font-medium outline-none',
        large ? 'text-[38px] leading-[1.1]' : 'text-[27px] leading-[1.2]',
      )}
    >
      {children}
    </h1>
  );
}
