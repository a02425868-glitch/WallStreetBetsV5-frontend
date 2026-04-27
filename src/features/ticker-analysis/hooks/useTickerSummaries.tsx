"use client";

import { useQuery } from '@tanstack/react-query';
import { fetchTickerDetailOverview } from '@/shared/lib/backendApi';

interface TickerSummary {
  ticker: string;
  summary: string | null;
  updated_at: string | null;
}

export function useTickerSummaries(ticker: string) {
  const query = useQuery({
    queryKey: ['ticker-summaries-v2', ticker],
    enabled: Boolean(ticker),
    queryFn: async () => {
      const row = await fetchTickerDetailOverview(ticker);
      if (!row) return { redditSummary: null, newsSummary: null, aiAnalysis: null };

      const redditSummary: TickerSummary = {
        ticker: row.ticker,
        summary: row.latest_reddit_summary,
        updated_at: row.latest_reddit_summary_timestamp_utc,
      };
      const newsSummary: TickerSummary = {
        ticker: row.ticker,
        summary: row.latest_news_summary,
        updated_at: row.latest_news_summary_timestamp_utc,
      };
      return { redditSummary, newsSummary, aiAnalysis: null };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return {
    redditSummary: query.data?.redditSummary ?? null,
    newsSummary: query.data?.newsSummary ?? null,
    aiAnalysis: query.data?.aiAnalysis ?? null,
    loading: query.isLoading,
  };
}
