import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Page } from '@/components/Page';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { snoozeNotification } from '@/features/notifications/api';
import { useProfile } from '@/features/profile/api';
import { useNow } from '@/lib/clock';
import { useOccurrence, useUpdateOccurrence } from './api';
import { OccurrenceDetails } from './components/OccurrenceDetails';

/**
 * Deep-link target for notifications: /schedule/occurrence/:activityId/:date?n=<id>&action=…
 * iOS doesn't show notification action buttons, so "Mark done" / "Snooze" arrive here as
 * `action` parameters (Android/desktop handle them in the service worker without opening the app).
 */
export function OccurrencePage() {
  const { activityId, date } = useParams();
  const [params, setParams] = useSearchParams();
  const now = useNow();
  const { data, isPending, error } = useOccurrence(activityId, date);
  const { data: profile } = useProfile();
  const update = useUpdateOccurrence();
  // Read before AppShell strips `n` from the URL (child effects run first).
  const notificationId = useRef(params.get('n'));
  const handled = useRef(false);

  useEffect(() => {
    const action = params.get('action');
    if (!action || handled.current || !data) return;
    handled.current = true;
    const o = data.occurrence;
    const clear = () => {
      const next = new URLSearchParams(params);
      next.delete('action');
      setParams(next, { replace: true });
    };
    if (action === 'complete' && o.status === 'pending') {
      update.mutate(
        {
          activityId: o.activityId,
          date: o.date,
          body: { status: 'completed', actualMinutes: o.durationMinutes },
        },
        {
          onSuccess: () => toast.success(`${o.title} marked done`),
          onError: (e) => toast.error(errorMessage(e)),
        },
      );
    } else if (action === 'snooze' && notificationId.current) {
      const minutes = profile?.profile.notifications?.defaultSnoozeMinutes ?? 10;
      void snoozeNotification(notificationId.current, minutes)
        .then(() => toast(`Snoozed — reminding you again in ${minutes} min`))
        .catch((e) => toast.error(errorMessage(e)));
    }
    clear();
  }, [data, params, setParams, update, profile]);

  return (
    <Page title="Session" back={{ to: '/schedule', label: 'Schedule' }}>
      {isPending ? (
        <Skeleton className="h-64 w-full rounded-[14px]" />
      ) : !data ? (
        <EmptyState title="This session isn’t available">{errorMessage(error)}</EmptyState>
      ) : (
        <div className="rounded-[18px] border bg-card p-5">
          <OccurrenceDetails
            key={data.occurrence.key}
            occurrence={data.occurrence}
            now={now}
            asPage
          />
        </div>
      )}
    </Page>
  );
}
