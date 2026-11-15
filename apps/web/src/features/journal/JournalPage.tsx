import { addDays, startOfWeek, type Weekday } from '@buzzprep/shared';
import { NotebookPen, Search, Settings2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { ListSection } from '@/components/ui/list-section';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/features/profile/api';
import { useJournalEntries, useJournalSearch, useTonight } from './api';
import { usePendingClips } from './clip-queue';
import { EntryRow } from './components/EntryRow';
import { JournalSettingsSheet } from './components/JournalSettingsSheet';
import { TonightCard } from './components/TonightCard';
import { WeekStrip } from './components/WeekStrip';

/** The Journal tab: tonight's session, this week, earlier nights and search. */
export function JournalPage() {
  const tonight = useTonight();
  const { data: profileData } = useProfile();
  const today = tonight.data?.today;
  const entries = useJournalEntries(today ? addDays(today, -59) : undefined, today);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const search = useJournalSearch(searching ? query : '');
  usePendingClips(); // resumes uploads of recordings saved offline

  const nights = (entries.data?.entries ?? []).filter((e) => e.type === 'evening');
  const byDate = new Map(nights.map((e) => [e.date, e]));
  const weekStartsOn = (profileData?.profile.weekStartsOn ?? 1) as Weekday;
  const weekStart = today ? startOfWeek(today, weekStartsOn) : null;

  return (
    <Page
      title="Journal"
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            aria-label={searching ? 'Close search' : 'Search the journal'}
            onClick={() => {
              setSearching((s) => !s);
              setQuery('');
            }}
          >
            {searching ? <X /> : <Search />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Journal settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 />
          </Button>
        </>
      }
    >
      <JournalSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />

      {searching ? (
        <div className="grid gap-4">
          <Input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, logs and transcripts"
            aria-label="Search the journal"
          />
          {query.trim().length < 2 ? (
            <p className="px-1 text-[14px] text-muted-foreground">
              Try a topic, a problem name, or something you remember saying.
            </p>
          ) : search.isPending ? (
            <Skeleton className="h-32 w-full rounded-[14px]" />
          ) : search.data?.results.length ? (
            <ListSection title={`${search.data.results.length} found`}>
              {search.data.results.map((r) => (
                <EntryRow key={r.id} entry={r} today={today ?? r.date} match={r.match} />
              ))}
            </ListSection>
          ) : (
            <p className="px-1 text-[14px] text-muted-foreground">
              Nothing matches “{query.trim()}”.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-7 pb-6">
          <TonightCard data={tonight.data} />

          {weekStart && today ? (
            <ListSection
              title="This week"
              action={
                <Link
                  to={`/journal/week/${weekStart}`}
                  className="text-[15px] text-primary hover:underline"
                >
                  Week review
                </Link>
              }
            >
              <div className="px-2 py-1.5">
                <WeekStrip weekStart={weekStart} today={today} entries={byDate} />
              </div>
            </ListSection>
          ) : null}

          {entries.isPending ? (
            <Skeleton className="h-40 w-full rounded-[14px]" />
          ) : nights.length > 0 ? (
            <ListSection title="Nights">
              {nights.map((e) => (
                <EntryRow key={e.id} entry={e} today={today ?? e.date} />
              ))}
            </ListSection>
          ) : (
            <EmptyState
              icon={<NotebookPen className="size-6" />}
              title="Your nights will show up here"
            >
              Each night, spend the last few minutes before sleep talking through what you studied.
              You get short notes to revise from at the weekend.
            </EmptyState>
          )}
        </div>
      )}
    </Page>
  );
}
