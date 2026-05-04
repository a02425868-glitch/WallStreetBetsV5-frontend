import { useQuery } from '@tanstack/react-query';
import { fetchAdminSystemStatus } from '@/shared/lib/backendApi';

export function useAdminStatus(enabled: boolean) {
  const query = useQuery({
    queryKey: ['admin-system-status-v1'],
    queryFn: fetchAdminSystemStatus,
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return {
    sections: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
