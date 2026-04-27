"use client";

import { useQuery } from '@tanstack/react-query';
import {
  fetchTickerDetailOverview,
  fetchTrackedLeaderboard,
  type TickerDetailOverviewRow,
} from '@/shared/lib/backendApi';
import { type LeaderboardRow } from '@/shared/types/database';

function toLeaderboardRows(rows: Awaited<ReturnType<typeof fetchTrackedLeaderboard>>): LeaderboardRow[] {
  return rows.map((row) => {
    const bullish = row.bullish_mentions_24h ?? 0;
    const bearish = row.bearish_mentions_24h ?? 0;
    const neutral = Math.max(0, (row.mentions_24h ?? 0) - bullish - bearish);
    return {
      ticker: row.ticker,
      total_mentions_24h: row.mentions_24h ?? 0,
      bullish_mentions_24h: bullish,
      bearish_mentions_24h: bearish,
      neutral_mentions_24h: neutral,
      bull_bear_ratio_24h: row.sentiment_ratio_24h ?? 0,
      ai_score_avg_24h: row.latest_ai_score,
      latest_price: row.latest_price,
      latest_timestamp: row.updated_at_utc,
    };
  });
}

export function useTickerData() {
  const query = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const rows = await fetchTrackedLeaderboard(200);
      return toLeaderboardRows(rows).sort((a, b) => b.total_mentions_24h - a.total_mentions_24h);
    },
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

interface TickerDetailView {
  ticker: string;
  timestamp: string | null;
  bullish_mentions: number;
  bearish_mentions: number;
  neutral_mentions: number;
  total_mentions: number;
  bull_bear_ratio: number;
  ai_score: number | null;
  price: number | null;
  reddit_summary: string | null;
  reddit_updated_at: string | null;
  news_summary: string | null;
  news_updated_at: string | null;
}

function toTickerDetailView(row: TickerDetailOverviewRow): TickerDetailView {
  const bullish = row.bullish_mentions_24h ?? 0;
  const bearish = row.bearish_mentions_24h ?? 0;
  const neutral = row.neutral_mentions_24h ?? 0;
  const total = row.mentions_24h ?? (bullish + bearish + neutral);
  const ratio = bearish > 0 ? bullish / bearish : bullish > 0 ? bullish : 0;

  return {
    ticker: row.ticker,
    timestamp: row.updated_at_utc,
    bullish_mentions: bullish,
    bearish_mentions: bearish,
    neutral_mentions: neutral,
    total_mentions: total,
    bull_bear_ratio: ratio,
    ai_score: row.latest_ai_score,
    price: row.latest_price,
    reddit_summary: row.latest_reddit_summary,
    reddit_updated_at: row.latest_reddit_summary_timestamp_utc,
    news_summary: row.latest_news_summary,
    news_updated_at: row.latest_news_summary_timestamp_utc,
  };
}

export function useTickerDetail(ticker: string) {
  const query = useQuery({
    queryKey: ['ticker-detail', ticker],
    enabled: Boolean(ticker),
    queryFn: async () => {
      const row = await fetchTickerDetailOverview(ticker);
      return row ? toTickerDetailView(row) : null;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
