import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { DashboardResponse } from '@/api/types';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardResponse>('/v1/dashboard'),
    refetchInterval: 5 * 60_000,
  });
}
