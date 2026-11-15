import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { clearLocalData } from '@/api/query-client';
import { logout } from '../api';

/** Ends the session, clears this device's cached data and returns to the sign-in page. */
export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await logout().catch(() => undefined);
    await clearLocalData();
    qc.setQueryData(['me'], null);
    navigate('/login', { replace: true });
  };
}
