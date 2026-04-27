"use client";

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTrendsMetrics, type TrendsMetricRpcRow } from '@/shared/lib/backendApi';
import type { HourlyStatsRow } from '@/shared/types/database';

function toHourlyStatsRow(row: TrendsMetricRpcRow): HourlyStatsRow {
  const bullish = row.bullish_mentions ?? 0;
  const bearish = row.bearish_mentions ?? 0;
  const neutral = row.neutral_mentions ?? 0;
  const totalDirectional = bullish + bearish;

  return {
    hour_bucket: row.bucket_start_utc,
    ticker: row.ticker,
    mention_count: row.total_mentions ?? 0,
    avg_sentiment: totalDirectional > 0 ? (bullish - bearish) / totalDirectional : 0,
    max_sentiment: null,
    min_sentiment: null,
    median_sentiment: null,
    avg_confidence: row.ai_score,
    bullish_mentions: bullish,
    bearish_mentions: bearish,
    neutral_mentions: neutral,
    last_mention_at: row.bucket_start_utc,
  };
}

export function useHourlyStats(ticker: string, hours: number = 24) {
  const fetchData = useCallback(async () => {
    if (!ticker) return [] as HourlyStatsRow[];
    const rows = await fetchTrendsMetrics({
      tickers: [ticker],
      interval: '1h',
      lookbackHours: Math.max(1, hours),
      sessionMode: 'full',
    });

    return rows
      .filter((row) => row.ticker === ticker)
      .sort((a, b) => new Date(a.bucket_start_utc).getTime() - new Date(b.bucket_start_utc).getTime())
      .map(toHourlyStatsRow);
  }, [ticker, hours]);

  const query = useQuery({
    queryKey: ['hourly-stats-v2', ticker, hours],
    queryFn: fetchData,
    enabled: Boolean(ticker),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
