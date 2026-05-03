"use client";

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchTrackedTickers,
  fetchTrendsMetrics,
  type TrendsMetricRpcRow,
} from '@/shared/lib/backendApi';
import { type TrendsDataRow, type TrendsMetricsRow } from '@/shared/types/database';
import { normalizeTrendRow } from '@/shared/lib/metrics';

export type IntervalWindow = '15m' | '30m' | '1h' | '3h' | '6h' | '12h';
export type TimeframeRange = '1h' | '6h' | '1d' | '3d' | '7d' | '14d' | '30d';

export const TIMEFRAME_HOURS_BY_RANGE: Record<TimeframeRange, number> = {
  '1h': 1,
  '6h': 6,
  '1d': 24,
  '3d': 72,
  '7d': 168,
  '14d': 336,
  '30d': 720,
};

const DEFAULT_RANGE_HOURS = 720;

function mapTrendRow(row: TrendsMetricRpcRow): TrendsDataRow {
  return {
    ticker: row.ticker,
    timestamp: row.bucket_start_utc,
    total_mentions: row.total_mentions,
    bullish_mentions: row.bullish_mentions,
    bearish_mentions: row.bearish_mentions,
    neutral_mentions: row.neutral_mentions,
    unclassified_mentions: row.unclassified_mentions,
    ai_score: row.ai_score,
    price: row.price,
  };
}

export function useTickerMetrics(tickers: string[], intervalWindow: IntervalWindow) {
  const tickersKey = tickers.join(',');

  const fetchData = useCallback(async () => {
    if (tickers.length === 0) {
      return {} as Record<string, TrendsMetricsRow[]>;
    }

    const rows = await fetchTrendsMetrics({
      tickers,
      // Charts aggregate client-side from canonical 15-minute buckets. Asking
      // the API for larger buckets here causes the chart to aggregate twice.
      interval: '15m',
      lookbackHours: DEFAULT_RANGE_HOURS,
      sessionMode: 'full',
    });

    const result: Record<string, TrendsMetricsRow[]> = {};
    for (const ticker of tickers) {
      const mapped = rows
        .filter((row) => row.ticker === ticker)
        .map((row) => normalizeTrendRow(mapTrendRow(row)))
        .filter((row): row is TrendsMetricsRow => row !== null)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      result[ticker] = mapped;
    }

    return result;
  }, [tickers]);

  const query = useQuery({
    queryKey: ['ticker-metrics-v2', tickersKey, intervalWindow],
    queryFn: fetchData,
    enabled: tickers.length > 0,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return {
    data: query.data ?? {},
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useAvailableTickers() {
  const query = useQuery({
    queryKey: ['available-tickers-v2'],
    queryFn: async () => {
      const rows = await fetchTrackedTickers(200);
      return rows.map((row) => row.ticker).filter(Boolean);
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return {
    tickers: query.data ?? [],
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
