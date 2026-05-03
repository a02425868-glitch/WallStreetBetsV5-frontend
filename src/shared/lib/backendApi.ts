import { supabase } from '@/shared/integrations/supabase/client';

async function rpcRows<T>(fn: string, args?: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) {
    throw new Error(error.message);
  }
  return (Array.isArray(data) ? data : []) as T[];
}

export interface TrackedTickerRow {
  ticker: string;
  recent_mentions_24h: number | null;
  last_met_at: string | null;
  last_met_reason: string | null;
  updated_at_utc: string | null;
}

export interface TrackedLeaderboardRow {
  ticker: string;
  mentions_1h: number | null;
  mentions_12h: number | null;
  mentions_24h: number | null;
  mentions_48h: number | null;
  mentions_7d: number | null;
  mentions_30d: number | null;
  bullish_mentions_24h: number | null;
  bearish_mentions_24h: number | null;
  sentiment_ratio_24h: number | null;
  latest_ai_score: number | null;
  latest_price: number | null;
  price_change_pct_1h: number | null;
  price_change_pct_12h: number | null;
  price_change_pct_24h: number | null;
  price_change_pct_7d: number | null;
  price_change_pct_30d: number | null;
  updated_at_utc: string | null;
}

export interface TrendsMetricRpcRow {
  ticker: string;
  bucket_start_utc: string;
  total_mentions: number | null;
  bullish_mentions: number | null;
  bearish_mentions: number | null;
  neutral_mentions: number | null;
  unclassified_mentions: number | null;
  ai_score: number | null;
  price: number | null;
}

export interface LiveFeedRpcRow {
  mention_id: string;
  ticker: string;
  object_uid: string;
  object_type: string;
  subreddit: string;
  reddit_id: string;
  parent_id: string | null;
  author: string | null;
  title: string | null;
  body: string | null;
  created_utc: string;
  permalink: string | null;
  url: string | null;
  score: number | null;
  sentiment_label: string;
  sentiment_confidence: number | null;
  model_name: string;
  model_version: string;
  rationale: string | null;
  classified_at_utc: string;
}

export interface TickerDetailOverviewRow {
  ticker: string;
  latest_price: number | null;
  latest_price_timestamp_utc: string | null;
  latest_ai_score: number | null;
  latest_ai_timestamp_utc: string | null;
  mentions_24h: number | null;
  bullish_mentions_24h: number | null;
  bearish_mentions_24h: number | null;
  neutral_mentions_24h: number | null;
  unclassified_mentions_24h: number | null;
  latest_reddit_summary: string | null;
  latest_reddit_summary_timestamp_utc: string | null;
  latest_news_summary: string | null;
  latest_news_summary_timestamp_utc: string | null;
  updated_at_utc: string | null;
}

function sortByDateDesc<T>(rows: T[], key: keyof T): T[] {
  return [...rows].sort((a, b) => {
    const aValue = String(a[key] ?? '');
    const bValue = String(b[key] ?? '');
    return bValue.localeCompare(aValue);
  });
}

export async function fetchTrackedTickers(limit = 200): Promise<TrackedTickerRow[]> {
  return rpcRows<TrackedTickerRow>('tracked_tickers', { p_limit: limit });
}

export async function fetchTrackedLeaderboard(limit = 200): Promise<TrackedLeaderboardRow[]> {
  return rpcRows<TrackedLeaderboardRow>('tracked_leaderboard', { p_limit: limit });
}

export async function fetchTrendsMetrics(params: {
  tickers: string[];
  interval: '15m' | '30m' | '1h' | '3h' | '6h' | '12h';
  lookbackHours: number;
  sessionMode?: 'full' | 'market';
}): Promise<TrendsMetricRpcRow[]> {
  if (params.tickers.length === 0) return [];
  const data = await rpcRows<TrendsMetricRpcRow>('get_trends_metrics', {
    p_tickers: params.tickers,
    p_interval: params.interval,
    p_lookback_hours: params.lookbackHours,
    p_session_mode: params.sessionMode ?? 'full',
  });
  return sortByDateDesc(data, 'bucket_start_utc');
}

export async function fetchTickerDetailOverview(ticker: string): Promise<TickerDetailOverviewRow | null> {
  const cleanTicker = ticker.trim().toUpperCase();
  if (!cleanTicker) return null;
  const rows = await rpcRows<TickerDetailOverviewRow>('get_ticker_detail_overview', { p_ticker: cleanTicker });
  return rows[0] ?? null;
}

export async function fetchLiveFeed(params: {
  ticker?: string;
  limit?: number;
}): Promise<LiveFeedRpcRow[]> {
  const data = await rpcRows<LiveFeedRpcRow>('get_live_reddit_feed', {
    p_limit: params.limit ?? 200,
    p_ticker: params.ticker ?? null,
  });
  return sortByDateDesc(data, 'created_utc');
}
