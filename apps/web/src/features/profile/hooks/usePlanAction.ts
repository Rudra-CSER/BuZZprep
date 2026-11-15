import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';

/** Runs a change to the plan, then refreshes the plan and the dashboard and reports the outcome. */
export function usePlanAction() {
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['plan'] }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  return async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      await refresh();
      if (ok) toast.success(ok);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
}
