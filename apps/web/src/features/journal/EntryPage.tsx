import { isLocalDate, MOOD_LABEL } from '@buzzprep/shared';
import { MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSection } from '@/components/ui/list-section';
import { Skeleton } from '@/components/ui/skeleton';
import { longDate } from '@/lib/format';
import { deleteEntry, requestNotes, useJournalEntry, useJournalSettings } from './api';
import { usePendingClips } from './clip-queue';
import { ClipList } from './components/ClipList';
import { NotesEditor } from './components/NotesEditor';
import { NotesStatus } from './components/NotesStatus';
import { NotesView } from './components/NotesView';

/** One night: the notes to revise from, and the log they came from. */
export function EntryPage() {
  const params = useParams();
  const date = params.date && isLocalDate(params.date) ? params.date : undefined;
  const navigate = useNavigate();
  const { data, isPending } = useJournalEntry('evening', date);
  const settings = useJournalSettings();
  const pending = usePendingClips(date);
  const [editing, setEditing] = useState(false);

  if (!date) {
    return (
      <Page title="Journal" back={{ to: '/journal', label: 'Journal' }}>
        <EmptyState title="That date doesn’t look right" />
      </Page>
    );
  }

  const entry = data?.entry ?? null;
  const aiNotes = Boolean(settings.data?.ai.notes && settings.data.prefs.useAi);
  const answered = entry?.answers.filter((a) => a.answer.trim()) ?? [];
  const hasLog = Boolean(entry?.body?.trim()) || (entry?.clips.length ?? 0) > 0;

  const regenerate = async () => {
    if (
      entry?.notesSource === 'manual' &&
      !window.confirm('Replace the notes you edited with new notes written from your log?')
    ) {
      return;
    }
    try {
      await requestNotes(date);
      toast('Writing new notes…');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (
      !window.confirm('Delete this night’s journal, recordings and notes? This can’t be undone.')
    ) {
      return;
    }
    try {
      await deleteEntry('evening', date);
      toast.success('Deleted');
      navigate('/journal', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const meta = entry
    ? [
        entry.mood ? `Felt ${MOOD_LABEL[entry.mood].toLowerCase()}` : null,
        entry.energy ? `energy ${entry.energy}/5` : null,
        entry.completedAt ? null : 'not finished',
      ].filter(Boolean)
    : [];

  return (
    <Page
      title={longDate(date)}
      subtitle="Night journal"
      back={{ to: '/journal', label: 'Journal' }}
      actions={
        entry ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/journal/tonight?date=${date}`}>
                  <Pencil /> Open this night’s session
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void remove()} className="text-destructive">
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
    >
      {isPending ? (
        <Skeleton className="h-64 w-full rounded-[14px]" />
      ) : !entry ? (
        <EmptyState
          title="Nothing written for this night"
          action={
            <Button asChild>
              <Link to={`/journal/tonight?date=${date}`}>Write it now</Link>
            </Button>
          }
        >
          You can still add a log for a night you missed.
        </EmptyState>
      ) : (
        <div className="grid gap-7 pb-8">
          {meta.length ? (
            <p className="-mt-2 text-[15px] text-muted-foreground">
              {meta.join(', ').replace(/^./, (c) => c.toUpperCase())}
            </p>
          ) : null}

          <NotesStatus entry={entry} aiNotes={aiNotes} />

          {entry.notes ? (
            <section className="grid gap-4 rounded-[18px] border bg-card px-5 py-5">
              <NotesView notes={entry.notes} />
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <span className="mr-auto text-[13px] text-muted-foreground">
                  {entry.notesSource === 'manual' ? 'Edited by you' : 'From your log'}
                </span>
                {aiNotes && hasLog ? (
                  <Button size="sm" variant="ghost" onClick={() => void regenerate()}>
                    <RotateCcw /> Rewrite
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
              </div>
            </section>
          ) : (
            <Button variant="secondary" className="w-fit" onClick={() => setEditing(true)}>
              <Pencil /> Write notes yourself
            </Button>
          )}

          {answered.length > 0 ? (
            <ListSection title="Closing the day">
              {answered.map((a) => (
                <div key={a.key} className="grid gap-0.5 px-4 py-3">
                  <p className="text-[13px] text-muted-foreground">{a.question}</p>
                  <p className="whitespace-pre-wrap text-[15px]">{a.answer}</p>
                </div>
              ))}
            </ListSection>
          ) : null}

          {entry.clips.length > 0 || pending.length > 0 ? (
            <section className="grid gap-2">
              <h2 className="px-1 text-[17px] font-semibold tracking-[-0.01em]">What you said</h2>
              <ClipList date={date} clips={entry.clips} pending={pending} allowAudio />
            </section>
          ) : null}

          {entry.body?.trim() ? (
            <section className="grid gap-2">
              <h2 className="px-1 text-[17px] font-semibold tracking-[-0.01em]">What you typed</h2>
              <p className="whitespace-pre-wrap rounded-[14px] border bg-card px-4 py-3 text-[15px] leading-relaxed">
                {entry.body}
              </p>
            </section>
          ) : null}
        </div>
      )}
      {editing ? (
        <NotesEditor
          date={date}
          notes={entry?.notes ?? null}
          open={editing}
          onOpenChange={setEditing}
        />
      ) : null}
    </Page>
  );
}
