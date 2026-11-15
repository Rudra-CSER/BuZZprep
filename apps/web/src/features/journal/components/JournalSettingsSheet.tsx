import { WIND_DOWN_OPTIONS, type JournalPrefsPatch, type Weekday } from '@buzzprep/shared';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListSection } from '@/components/ui/list-section';
import { NativeSelect } from '@/components/ui/native-select';
import { Segmented } from '@/components/ui/segmented';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { SwitchRow } from '@/components/ui/switch-row';
import { exportJournal, useJournalSettings, useUpdateJournalSettings } from '../api';

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export function JournalSettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data } = useJournalSettings();
  const update = useUpdateJournalSettings();
  const patch = (p: JournalPrefsPatch) =>
    update.mutate(p, { onError: (err) => toast.error(errorMessage(err)) });

  const prefs = data?.prefs;
  const ai = data?.ai;
  const serverHasAi = Boolean(ai && (ai.transcription || ai.notes));
  const where = [
    ai?.providers.transcription
      ? `recordings go to ${ai.providers.transcription.provider} (${ai.providers.transcription.model}) to be transcribed`
      : null,
    ai?.providers.notes
      ? `logs go to ${ai.providers.notes.provider} (${ai.providers.notes.model}) to write notes`
      : null,
  ].filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Journal settings</SheetTitle>
        </SheetHeader>
        <div className="grid gap-6 overflow-y-auto px-5 pb-6 pt-2">
          {!prefs ? (
            <Skeleton className="h-64 w-full rounded-[14px]" />
          ) : (
            <>
              <ListSection
                title="Tonight’s journal"
                footer="The reminder replaces the last scroll of the day: it opens the journal a few minutes before your bedtime."
              >
                <SwitchRow
                  title="Remind me before bed"
                  checked={prefs.nightReminder}
                  onCheckedChange={(v) => patch({ nightReminder: v })}
                />
                <div className="grid gap-2 px-4 py-3">
                  <span className="text-[15px]">Minutes before bed</span>
                  <Segmented
                    ariaLabel="Minutes before bed"
                    value={String(prefs.windDownMinutes)}
                    onValueChange={(v) => patch({ windDownMinutes: Number(v) })}
                    options={WIND_DOWN_OPTIONS.map((m) => ({ value: String(m), label: String(m) }))}
                    className="w-full"
                  />
                </div>
              </ListSection>

              <ListSection
                title="AI"
                footer={
                  serverHasAi
                    ? `With AI on, ${where.join(' and ')}. With it off, nothing leaves this server.`
                    : 'This server has no AI provider set up. Add API keys to the server’s .env file to turn on voice logs and notes.'
                }
              >
                <SwitchRow
                  title="Use AI for my journal"
                  description="Transcribe voice logs and write notes from them"
                  checked={prefs.useAi && serverHasAi}
                  disabled={!serverHasAi}
                  onCheckedChange={(v) => patch({ useAi: v })}
                />
                <SwitchRow
                  title="Keep recordings"
                  description="Off: audio is deleted once it’s transcribed"
                  checked={prefs.keepAudio}
                  disabled={!serverHasAi || !prefs.useAi}
                  onCheckedChange={(v) => patch({ keepAudio: v })}
                />
              </ListSection>

              <ListSection
                title="Weekly summary"
                footer="Your week’s notes are always compiled into a revision sheet. The summary adds a written review and a weekend revision plan."
              >
                <SwitchRow
                  title="Write it automatically"
                  checked={prefs.weeklySummary.auto && Boolean(ai?.notes)}
                  disabled={!ai?.notes || !prefs.useAi}
                  onCheckedChange={(v) => patch({ weeklySummary: { auto: v } })}
                />
                {prefs.weeklySummary.auto && ai?.notes ? (
                  <div className="flex gap-2 px-4 py-3">
                    <NativeSelect
                      className="flex-1"
                      aria-label="Day"
                      value={prefs.weeklySummary.weekday}
                      onChange={(e) =>
                        patch({ weeklySummary: { weekday: Number(e.target.value) as Weekday } })
                      }
                    >
                      {WEEKDAYS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </NativeSelect>
                    <Input
                      type="time"
                      className="w-32"
                      aria-label="Time"
                      value={prefs.weeklySummary.time}
                      onChange={(e) =>
                        e.target.value && patch({ weeklySummary: { time: e.target.value } })
                      }
                    />
                  </div>
                ) : null}
              </ListSection>

              <ListSection
                title="Your data"
                footer="Your journal is private to your account. Nobody else on this server can see it, admins included."
              >
                <div className="px-4 py-3">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void exportJournal().catch((err) => toast.error(errorMessage(err)))
                    }
                  >
                    <Download /> Export as Markdown
                  </Button>
                </div>
              </ListSection>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
