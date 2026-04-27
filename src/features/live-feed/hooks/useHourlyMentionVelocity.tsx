"use client";

import { useQuery } from '@tanstack/react-query';
import { fetchTrackedLeaderboard } from '@/shared/lib/backendApi';

export interface TickerVelocity {
  ticker: string;
  mentionCount: number;
}

export function useHourlyMentionVelocity() {
  const query = useQuery({
    queryKey: ['hourly-mention-velocity-v2'],
    queryFn: async () => {
      const rows = await fetchTrackedLeaderboard(200);
      return rows
        .map((row) => ({ ticker: row.ticker, mentionCount: row.mentions_1h ?? 0 }))
        .sort((a, b) => b.mentionCount - a.mentionCount);
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return {
    data: query.data || [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
