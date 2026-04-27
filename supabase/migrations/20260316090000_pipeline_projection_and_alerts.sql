-- Pipeline projection + alert automation bridge.
-- This migration connects raw collector tables to frontend-facing tables.

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN OTHERS THEN
    -- Some Supabase plans manage extension provisioning externally.
    NULL;
END;
$$;

-- Allow ratio alerts in the notifications type constraint.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type IN (
      'total_mentions',
      'bullish_mentions',
      'bearish_mentions',
      'neutral_mentions',
      'bull_bear_ratio',
      'price',
      'ai_score'
    )
  );

-- Keep an idempotent linkage to collector rows.
ALTER TABLE public.live_data
  ADD COLUMN IF NOT EXISTS source_mention_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_data_source_mention_id
  ON public.live_data (source_mention_id);

CREATE OR REPLACE FUNCTION public.project_frontend_data(p_lookback_hours integer DEFAULT 168)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_epoch bigint;
  v_trend_rows integer := 0;
  v_live_rows integer := 0;
  v_summary_rows integer := 0;
BEGIN
  IF p_lookback_hours IS NULL OR p_lookback_hours < 1 THEN
    p_lookback_hours := 1;
  END IF;

  v_cutoff_epoch := EXTRACT(EPOCH FROM (NOW() - make_interval(hours => p_lookback_hours)))::bigint;

  -- Auto-whitelist valid symbols observed by collectors so FK writes succeed.
  INSERT INTO public.tickers_whitelist (ticker)
  SELECT DISTINCT observed.ticker
  FROM (
    SELECT UPPER(ticker) AS ticker FROM public.reddit_mentions_30d
    UNION
    SELECT UPPER(ticker) AS ticker FROM public.ticker_news_digest
    UNION
    SELECT UPPER(ticker) AS ticker FROM public.ticker_reddit_digest
    UNION
    SELECT UPPER(ticker) AS ticker FROM public.ticker_ai_score_15m
    UNION
    SELECT UPPER(symbol) AS ticker FROM public.bars_15m
  ) observed
  WHERE observed.ticker ~ '^[A-Z]{1,10}$'
  ON CONFLICT (ticker) DO NOTHING;

  WITH mention_hourly AS (
    SELECT
      UPPER(m.ticker) AS ticker,
      to_timestamp((m.created_utc / 3600) * 3600) AS hour_bucket,
      COUNT(*)::integer AS total_mentions,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(m.sentiment_label, 'neutral')) = 'bullish')::integer AS bullish_mentions,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(m.sentiment_label, 'neutral')) = 'bearish')::integer AS bearish_mentions,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(m.sentiment_label, 'neutral')) NOT IN ('bullish', 'bearish'))::integer AS neutral_mentions
    FROM public.reddit_mentions_30d m
    WHERE m.created_utc >= v_cutoff_epoch
    GROUP BY UPPER(m.ticker), to_timestamp((m.created_utc / 3600) * 3600)
  )
  INSERT INTO public.trend_data (
    ticker,
    timestamp,
    total_mentions,
    bullish_mentions,
    bearish_mentions,
    neutral_mentions,
    ai_score,
    price,
    volume
  )
  SELECT
    mh.ticker,
    mh.hour_bucket,
    mh.total_mentions,
    mh.bullish_mentions,
    mh.bearish_mentions,
    mh.neutral_mentions,
    ai.score_1_100::numeric,
    px.close::numeric,
    px.volume
  FROM mention_hourly mh
  INNER JOIN public.tickers_whitelist tw
    ON tw.ticker = mh.ticker
  LEFT JOIN LATERAL (
    SELECT a.score_1_100
    FROM public.ticker_ai_score_15m a
    WHERE UPPER(a.ticker) = mh.ticker
      AND a.bucket_end_utc <= mh.hour_bucket + INTERVAL '1 hour'
    ORDER BY a.bucket_end_utc DESC
    LIMIT 1
  ) ai ON true
  LEFT JOIN LATERAL (
    SELECT b.close, b.volume
    FROM public.bars_15m b
    WHERE UPPER(b.symbol) = mh.ticker
      AND b.bucket_end_utc <= mh.hour_bucket + INTERVAL '1 hour'
    ORDER BY b.bucket_end_utc DESC
    LIMIT 1
  ) px ON true
  ON CONFLICT (ticker, timestamp)
  DO UPDATE SET
    total_mentions = EXCLUDED.total_mentions,
    bullish_mentions = EXCLUDED.bullish_mentions,
    bearish_mentions = EXCLUDED.bearish_mentions,
    neutral_mentions = EXCLUDED.neutral_mentions,
    ai_score = COALESCE(EXCLUDED.ai_score, public.trend_data.ai_score),
    price = COALESCE(EXCLUDED.price, public.trend_data.price),
    volume = COALESCE(EXCLUDED.volume, public.trend_data.volume);

  GET DIAGNOSTICS v_trend_rows = ROW_COUNT;

  INSERT INTO public.live_data (
    source_mention_id,
    ticker,
    subreddit,
    post_type,
    text,
    link,
    mentions,
    score,
    timestamp
  )
  SELECT
    rm.mention_id,
    UPPER(rm.ticker) AS ticker,
    COALESCE(NULLIF(rm.subreddit, ''), 'unknown') AS subreddit,
    CASE WHEN LOWER(rm.source_type) = 'comment' THEN 'comment' ELSE 'post' END AS post_type,
    LEFT(TRIM(CONCAT_WS(E'\n\n', NULLIF(rm.title, ''), NULLIF(rm.body, ''))), 4000) AS text,
    rm.permalink AS link,
    1 AS mentions,
    COALESCE(rm.score, 0) AS score,
    to_timestamp(rm.created_utc) AS timestamp
  FROM public.reddit_mentions rm
  INNER JOIN public.tickers_whitelist tw
    ON tw.ticker = UPPER(rm.ticker)
  WHERE rm.created_utc >= EXTRACT(EPOCH FROM (NOW() - INTERVAL '7 days'))::bigint
  ON CONFLICT (source_mention_id)
  DO UPDATE SET
    subreddit = EXCLUDED.subreddit,
    post_type = EXCLUDED.post_type,
    text = EXCLUDED.text,
    link = EXCLUDED.link,
    mentions = EXCLUDED.mentions,
    score = EXCLUDED.score,
    timestamp = EXCLUDED.timestamp;

  GET DIAGNOSTICS v_live_rows = ROW_COUNT;

  WITH latest_reddit AS (
    SELECT DISTINCT ON (UPPER(d.ticker))
      UPPER(d.ticker) AS ticker,
      d.summary_text,
      to_timestamp(d.generated_at_utc) AS generated_at
    FROM public.ticker_reddit_digest d
    ORDER BY UPPER(d.ticker), d.generated_at_utc DESC
  ),
  latest_news AS (
    SELECT DISTINCT ON (UPPER(d.ticker))
      UPPER(d.ticker) AS ticker,
      d.summary_text,
      to_timestamp(d.generated_at_utc) AS generated_at
    FROM public.ticker_news_digest d
    ORDER BY UPPER(d.ticker), d.generated_at_utc DESC
  ),
  merged AS (
    SELECT
      COALESCE(r.ticker, n.ticker) AS ticker,
      r.summary_text AS reddit_summary,
      r.generated_at AS last_reddit_update,
      n.summary_text AS news_summary,
      n.generated_at AS last_news_update
    FROM latest_reddit r
    FULL OUTER JOIN latest_news n
      ON n.ticker = r.ticker
  )
  INSERT INTO public.summaries (
    ticker,
    reddit_summary,
    news_summary,
    last_reddit_update,
    last_news_update
  )
  SELECT
    m.ticker,
    m.reddit_summary,
    m.news_summary,
    m.last_reddit_update,
    m.last_news_update
  FROM merged m
  INNER JOIN public.tickers_whitelist tw
    ON tw.ticker = m.ticker
  ON CONFLICT (ticker)
  DO UPDATE SET
    reddit_summary = COALESCE(EXCLUDED.reddit_summary, public.summaries.reddit_summary),
    news_summary = COALESCE(EXCLUDED.news_summary, public.summaries.news_summary),
    last_reddit_update = COALESCE(
      GREATEST(EXCLUDED.last_reddit_update, public.summaries.last_reddit_update),
      EXCLUDED.last_reddit_update,
      public.summaries.last_reddit_update
    ),
    last_news_update = COALESCE(
      GREATEST(EXCLUDED.last_news_update, public.summaries.last_news_update),
      EXCLUDED.last_news_update,
      public.summaries.last_news_update
    );

  GET DIAGNOSTICS v_summary_rows = ROW_COUNT;

  RETURN jsonb_build_object(
    'trend_rows_upserted', v_trend_rows,
    'live_rows_upserted', v_live_rows,
    'summary_rows_upserted', v_summary_rows,
    'lookback_hours', p_lookback_hours,
    'executed_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.project_frontend_data(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.evaluate_notifications_for_trend_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications_history (
    user_id,
    notification_id,
    ticker,
    type,
    triggered_value,
    threshold,
    direction,
    triggered_at
  )
  SELECT
    n.user_id,
    n.id,
    NEW.ticker,
    n.type,
    metric.metric_value,
    n.threshold,
    n.direction,
    NOW()
  FROM public.notifications n
  CROSS JOIN LATERAL (
    SELECT CASE n.type
      WHEN 'total_mentions' THEN NEW.total_mentions::numeric
      WHEN 'bullish_mentions' THEN NEW.bullish_mentions::numeric
      WHEN 'bearish_mentions' THEN NEW.bearish_mentions::numeric
      WHEN 'neutral_mentions' THEN NEW.neutral_mentions::numeric
      WHEN 'price' THEN NEW.price
      WHEN 'ai_score' THEN NEW.ai_score
      WHEN 'bull_bear_ratio' THEN
        CASE
          WHEN COALESCE(NEW.bearish_mentions, 0) = 0 THEN
            CASE WHEN COALESCE(NEW.bullish_mentions, 0) > 0 THEN 999999::numeric ELSE 0::numeric END
          ELSE NEW.bullish_mentions::numeric / NEW.bearish_mentions::numeric
        END
      ELSE NULL::numeric
    END AS metric_value
  ) metric
  WHERE n.is_active = true
    AND n.ticker = NEW.ticker
    AND metric.metric_value IS NOT NULL
    AND (
      (n.direction = 'above' AND metric.metric_value >= n.threshold)
      OR
      (n.direction = 'below' AND metric.metric_value <= n.threshold)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications_history h
      WHERE h.notification_id = n.id
        AND h.triggered_at >= NOW() - INTERVAL '15 minutes'
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eval_notifications_on_trend_data ON public.trend_data;
CREATE TRIGGER trg_eval_notifications_on_trend_data
AFTER INSERT OR UPDATE OF total_mentions, bullish_mentions, bearish_mentions, neutral_mentions, ai_score, price
ON public.trend_data
FOR EACH ROW
EXECUTE FUNCTION public.evaluate_notifications_for_trend_row();

-- Keep live feed table clean.
CREATE OR REPLACE FUNCTION public.cleanup_live_data_retention()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  DELETE FROM public.live_data
  WHERE timestamp < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_live_data_retention() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'project_frontend_data_5m') THEN
      PERFORM cron.schedule(
        'project_frontend_data_5m',
        '*/5 * * * *',
        'SELECT public.project_frontend_data(168);'
      );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_live_data_daily') THEN
      PERFORM cron.schedule(
        'cleanup_live_data_daily',
        '15 2 * * *',
        'SELECT public.cleanup_live_data_retention();'
      );
    END IF;
  END IF;
END;
$$;

-- Backfill once right after migration.
SELECT public.project_frontend_data(168);
