import { useQueryClient } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { ListSection } from '@/components/ui/list-section';
import { exportAccountData, exportConfig, importConfig } from '../api';

/** Export or import the configuration, or download everything. */
export function DataSection() {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const importFromFile = async (file: File) => {
    try {
      const bundle = JSON.parse(await file.text());
      const replace = window.confirm(
        'Make the imported schedule your active one?\n\nOK = replace your active schedule and plan (old ones are kept, inactive).\nCancel = add it alongside your current setup.',
      );
      const res = await importConfig(bundle, replace ? 'replace' : 'merge');
      await qc.invalidateQueries();
      toast.success(
        `Imported ${res.summary.activities ?? 0} activities and ${res.summary.reminders ?? 0} reminders`,
      );
    } catch (err) {
      toast.error(err instanceof SyntaxError ? 'That file isn’t valid JSON.' : errorMessage(err));
    }
  };

  return (
    <ListSection
      title="Your data"
      footer="Configuration files contain your routine, reminders, plan and tracks — not your journal. Use them as backups or to share a template."
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] hover:bg-muted/50"
        onClick={() => void exportConfig().catch((e) => toast.error(errorMessage(e)))}
      >
        <Download className="size-[18px] text-muted-foreground" /> Export configuration
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] hover:bg-muted/50"
        onClick={() => fileInput.current?.click()}
      >
        <Upload className="size-[18px] text-muted-foreground" /> Import configuration
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] hover:bg-muted/50"
        onClick={() => void exportAccountData().catch((e) => toast.error(errorMessage(e)))}
      >
        <Download className="size-[18px] text-muted-foreground" /> Download all my data
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFromFile(file);
          e.target.value = '';
        }}
      />
    </ListSection>
  );
}
