import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 pt-[max(var(--app-top),1rem)] md:pt-[calc(var(--app-top)+2.5rem)]">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-48 w-full rounded-[20px]" />
      <Skeleton className="h-64 w-full rounded-[14px]" />
    </div>
  );
}
