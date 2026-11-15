import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { CACHE_BUSTER, PERSIST_MAX_AGE, persister, queryClient } from '@/api/query-client';
import { useTheme } from '@/lib/theme';
import { router } from './router';

// Volatile or security-sensitive responses are never written to IndexedDB.
const NOT_PERSISTED = new Set([
  'meta',
  'suggestions',
  'notifications',
  'push-config',
  'push-devices',
]);

export function App() {
  const pref = useTheme((s) => s.pref);
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE,
        buster: CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) =>
            q.state.status === 'success' && !NOT_PERSISTED.has(String(q.queryKey[0])),
        },
      }}
      onSuccess={() => void queryClient.resumePausedMutations()}
    >
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        theme={pref}
        offset={{ top: 'calc(var(--safe-top) + 10px)' }}
        mobileOffset={{ top: 'calc(var(--safe-top) + 10px)' }}
        toastOptions={{ classNames: { toast: 'font-sans !rounded-[14px] !text-[14px]' } }}
      />
    </PersistQueryClientProvider>
  );
}
