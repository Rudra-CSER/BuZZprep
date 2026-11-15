import {
  emptyNotes,
  journalNotesSchema,
  PROBLEM_OUTCOME_META,
  PROBLEM_OUTCOMES,
  TOPIC_CONFIDENCE,
  type JournalNotes,
  type LocalDate,
  type ProblemOutcome,
  type TopicConfidence,
} from '@buzzprep/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { invalidateJournal } from '@/api/query-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { saveEntry } from '../api';
import { ListEditor } from './ListEditor';

const clean = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);

function tidy(n: JournalNotes): JournalNotes {
  return {
    summary: n.summary.trim(),
    topics: n.topics
      .map((t) => ({ ...t, name: t.name.trim(), keyPoints: clean(t.keyPoints) }))
      .filter((t) => t.name),
    problems: n.problems
      .map((p) => ({ ...p, name: p.name.trim(), note: p.note?.trim() || null }))
      .filter((p) => p.name),
    mistakes: clean(n.mistakes),
    questions: clean(n.questions),
    reviseNext: clean(n.reviseNext),
  };
}

/** Edit a night's notes. Saved notes are yours: regenerating never overwrites them silently. */
export function NotesEditor({
  date,
  notes,
  open,
  onOpenChange,
}: {
  date: LocalDate;
  notes: JournalNotes | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<JournalNotes>(() => notes ?? emptyNotes());
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof JournalNotes>(key: K, value: JournalNotes[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    const parsed = journalNotesSchema.safeParse(tidy(draft));
    if (!parsed.success) {
      toast.error('Some notes are too long. Shorten them and try again.');
      return;
    }
    setSaving(true);
    try {
      await saveEntry('evening', date, { notes: parsed.data });
      await invalidateJournal();
      toast.success('Notes saved');
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="md:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Edit notes</SheetTitle>
        </SheetHeader>
        <div className="grid gap-6 overflow-y-auto px-5 pb-4 pt-2">
          <label className="grid gap-2">
            <span className="text-[14px] font-medium">Summary</span>
            <Textarea
              value={draft.summary}
              onChange={(e) => set('summary', e.target.value)}
              rows={3}
              maxLength={1200}
            />
          </label>

          <fieldset className="grid gap-3">
            <legend className="mb-2 text-[14px] font-medium">Topics</legend>
            {draft.topics.map((t, i) => (
              <div key={i} className="grid gap-2 rounded-[14px] border p-3">
                <div className="flex gap-2">
                  <Input
                    value={t.name}
                    placeholder="Topic"
                    aria-label={`Topic ${i + 1}`}
                    onChange={(e) =>
                      set(
                        'topics',
                        draft.topics.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                  <NativeSelect
                    className="w-32 shrink-0"
                    aria-label="How well you know it"
                    value={t.confidence ?? ''}
                    onChange={(e) =>
                      set(
                        'topics',
                        draft.topics.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                confidence: (e.target.value || null) as TopicConfidence | null,
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    <option value="">—</option>
                    {TOPIC_CONFIDENCE.map((c) => (
                      <option key={c} value={c}>
                        {c[0]!.toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove topic ${i + 1}`}
                    onClick={() =>
                      set(
                        'topics',
                        draft.topics.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                <ListEditor
                  label="Key point"
                  items={t.keyPoints}
                  addLabel="Add key point"
                  onChange={(keyPoints) =>
                    set(
                      'topics',
                      draft.topics.map((x, j) => (j === i ? { ...x, keyPoints } : x)),
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-fit"
              onClick={() =>
                set('topics', [...draft.topics, { name: '', keyPoints: [''], confidence: null }])
              }
            >
              <Plus /> Add topic
            </Button>
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="mb-2 text-[14px] font-medium">Problems</legend>
            {draft.problems.map((p, i) => (
              <div key={i} className="grid gap-2 rounded-[14px] border p-3">
                <div className="flex gap-2">
                  <Input
                    value={p.name}
                    placeholder="Problem"
                    aria-label={`Problem ${i + 1}`}
                    onChange={(e) =>
                      set(
                        'problems',
                        draft.problems.map((x, j) =>
                          j === i ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove problem ${i + 1}`}
                    onClick={() =>
                      set(
                        'problems',
                        draft.problems.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                <NativeSelect
                  aria-label="How it went"
                  value={p.outcome ?? ''}
                  onChange={(e) =>
                    set(
                      'problems',
                      draft.problems.map((x, j) =>
                        j === i
                          ? { ...x, outcome: (e.target.value || null) as ProblemOutcome | null }
                          : x,
                      ),
                    )
                  }
                >
                  <option value="">How it went…</option>
                  {PROBLEM_OUTCOMES.map((o) => (
                    <option key={o} value={o}>
                      {PROBLEM_OUTCOME_META[o].label}
                    </option>
                  ))}
                </NativeSelect>
                <Input
                  value={p.note ?? ''}
                  placeholder="Key idea or where you got stuck"
                  aria-label={`Note for problem ${i + 1}`}
                  onChange={(e) =>
                    set(
                      'problems',
                      draft.problems.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)),
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="w-fit"
              onClick={() =>
                set('problems', [...draft.problems, { name: '', outcome: null, note: null }])
              }
            >
              <Plus /> Add problem
            </Button>
          </fieldset>

          {(
            [
              ['mistakes', 'Mistakes to avoid', 'Add mistake'],
              ['questions', 'Open questions', 'Add question'],
              ['reviseNext', 'Revise next', 'Add item'],
            ] as const
          ).map(([key, title, add]) => (
            <fieldset key={key} className="grid gap-2">
              <legend className="mb-2 text-[14px] font-medium">{title}</legend>
              <ListEditor
                label={title}
                items={draft[key]}
                addLabel={add}
                onChange={(v) => set(key, v)}
              />
            </fieldset>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save notes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
