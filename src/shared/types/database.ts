// Frontend contract types normalized from canonical backend RPCs.

export interface LiveFeedRow {
  id: string;
  timestamp: string;
  subreddit: string;
  post_type: string;
  text: string | null;
  link: string | null;
  ticker: string;
  sentiment_label: string;
  sentiment_confidence: number | null;
}

export interface LeaderboardRow {
  ticker: string;
  total_mentions_24h: number;
  bullish_mentions_24h: number;
  bearish_mentions_24h: number;
  neutral_mentions_24h: number;
  bull_bear_ratio_24h: number;
  ai_score_avg_24h: number | null;
  latest_price: number | null;
  latest_timestamp: string | null;
}

export interface TrendsDataRow {
  timestamp: string;
  ticker: string;
  total_mentions: number | null;
  bullish_mentions: number | null;
  bearish_mentions: number | null;
  neutral_mentions: number | null;
  unclassified_mentions?: number | null;
  ai_score: number | null;
  price: number | null;
}

export interface TrendsMetricsRow extends TrendsDataRow {
  total_mentions: number | null;
}

export interface HourlyStatsRow {
  hour_bucket: string;
  ticker: string;
  mention_count: number;
  avg_sentiment: number | null;
  max_sentiment: number | null;
  min_sentiment: number | null;
  median_sentiment: number | null;
  avg_confidence: number | null;
  bullish_mentions: number;
  bearish_mentions: number;
  neutral_mentions: number;
  last_mention_at: string | null;
}

export interface Profile {
  user_id: string;
  email: string | null;
  has_paid: boolean;
  created_at: string | null;
  updated_at: string | null;
}
