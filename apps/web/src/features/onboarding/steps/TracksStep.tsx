import { TEMPLATES, type TrackKind } from '@buzzprep/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { SwitchRow } from '@/components/ui/switch-row';
import type { Answers, Update } from '../types';

export function TracksStep({ a, u }: { a: Answers; u: Update }) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<TrackKind>('custom');
  const add = () => {
    if (!title.trim()) return;
    u({
      tracks: [
        ...a.tracks,
        { ref: `custom_${Date.now().toString(36)}`, title: title.trim(), kind, enabled: true },
      ],
    });
    setTitle('');
  };
  return (
    <>
      <div className="divide-y overflow-hidden rounded-[14px] border bg-card">
        {a.tracks.length === 0 && (
          <p className="px-4 py-4 text-[14px] text-muted-foreground">
            No tracks yet. Add one below.
          </p>
        )}
        {a.tracks.map((t, i) => (
          <SwitchRow
            key={t.ref}
            title={t.title}
            description={
              TEMPLATES.find((x) => x.key === a.templateKey)?.tracks.find((x) => x.ref === t.ref)
                ?.topics.length
                ? `${TEMPLATES.find((x) => x.key === a.templateKey)!.tracks.find((x) => x.ref === t.ref)!.topics.length} topics included`
                : 'Your own topics'
            }
            checked={t.enabled}
            onCheckedChange={(v) =>
              u({ tracks: a.tracks.map((x, j) => (j === i ? { ...x, enabled: v } : x)) })
            }
          />
        ))}
      </div>
      <div className="grid gap-2">
        <span className="text-[14px] font-medium">Add your own track</span>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Low-level design"
            maxLength={80}
            aria-label="Track name"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          />
          <Button variant="tinted" onClick={add} disabled={!title.trim()}>
            <Plus /> Add
          </Button>
        </div>
        <NativeSelect
          value={kind}
          onChange={(e) => setKind(e.target.value as TrackKind)}
          aria-label="Track type"
        >
          <option value="custom">General topic list</option>
          <option value="dsa">Problem solving (log problems)</option>
          <option value="system_design">System design</option>
          <option value="cs_fundamentals">CS fundamentals</option>
        </NativeSelect>
      </div>
    </>
  );
}
