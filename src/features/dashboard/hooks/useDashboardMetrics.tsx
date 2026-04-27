"use client";

import { useQuery } from '@tanstack/react-query';
import {
  fetchTrackedTickers,
  fetchTrendsMetrics,
  type TrendsMetricRpcRow,
} from '@/shared/lib/backendApi';
import { calculateTimeframeMetrics, type TimeframeMetrics } from '@/shared/lib/metrics';
import type { TrendsDataRow } from '@/shared/types/database';

export type { TimeframeMetrics } from '@/shared/lib/metrics';

export interface DashboardMetrics {
  ticker: string;
  latestPrice: number | null;
  latestTimestamp: string;
  metrics_1h: TimeframeMetrics;
  metrics_12h: TimeframeMetrics;
  metrics_24h: TimeframeMetrics;
  metrics_48h: TimeframeMetrics;
  metrics_7d: TimeframeMetrics;
  metrics_30d: TimeframeMetrics;
}

function rpcRowToTrendRow(row: TrendsMetricRpcRow): TrendsDataRow {
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

function getMetricsSince(rows: TrendsDataRow[], hours: number): TrendsDataRow[] {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return rows.filter((row) => new Date(row.timestamp) >= cutoff);
}

export function useDashboardMetrics() {
  const query = useQuery({
    queryKey: ['dashboard-metrics-v2'],
    queryFn: async () => {
      const tracked = await fetchTrackedTickers(200);
      const tickers = tracked.map((row) => row.ticker).filter(Boolean);
      if (tickers.length === 0) return [] as DashboardMetrics[];

      const trendRows = await fetchTrendsMetrics({
        tickers,
        interval: '15m',
        lookbackHours: 720,
        sessionMode: 'full',
      });

      const byTicker = new Map<string, TrendsDataRow[]>();
      for (const row of trendRows) {
        const mapped = rpcRowToTrendRow(row);
        if (!byTicker.has(mapped.ticker)) byTicker.set(mapped.ticker, []);
        byTicker.get(mapped.ticker)!.push(mapped);
      }

      const metrics: DashboardMetrics[] = [];
      for (const ticker of tickers) {
        const rows = (byTicker.get(ticker) ?? []).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const latestWithPrice = rows.find((row) => row.price != null) ?? rows[0];
        if (!latestWithPrice) continue;

        metrics.push({
          ticker,
          latestPrice: latestWithPrice.price,
          latestTimestamp: latestWithPrice.timestamp,
          metrics_1h: calculateTimeframeMetrics(getMetricsSince(rows, 1)),
          metrics_12h: calculateTimeframeMetrics(getMetricsSince(rows, 12)),
          metrics_24h: calculateTimeframeMetrics(getMetricsSince(rows, 24)),
          metrics_48h: calculateTimeframeMetrics(getMetricsSince(rows, 48)),
          metrics_7d: calculateTimeframeMetrics(getMetricsSince(rows, 24 * 7)),
          metrics_30d: calculateTimeframeMetrics(getMetricsSince(rows, 24 * 30)),
        });
      }

      metrics.sort((a, b) => b.metrics_24h.total - a.metrics_24h.total);
      return metrics;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return {
    metrics: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
  };
}
